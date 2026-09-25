/**
 * WhatsApp Cloud API OTP Sender
 *
 * Sends a 4-character OTP via Meta's WhatsApp Business Cloud API.
 * Official docs: https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-messages
 *
 * Required env vars:
 *   WA_PHONE_NUMBER_ID   — the Phone Number ID from Meta App Dashboard
 *                          (WhatsApp > API Setup, NOT the display phone number)
 *   WA_ACCESS_TOKEN      — permanent System User access token with
 *                          whatsapp_business_messaging permission
 *   WA_TEMPLATE_NAME     — name of the approved authentication template
 *                          (default: "pickup_otp")
 *   WA_TEMPLATE_LANG     — language code for the template (default: "en_US")
 *
 * Template note:
 *   Create an "Authentication" category template in Meta Business Manager.
 *   Authentication templates have a single body variable (the OTP code) and
 *   Meta auto-formats the message. The template needs to be approved before
 *   it works in production. On the free test tier it works with the 5
 *   test recipient numbers you register in the dashboard.
 *
 * Dev fallback: if env vars are missing, logs the OTP to the console so the
 * flow stays testable without a Meta Business account.
 */

const WA_API_VERSION = "v20.0";

const whatsappSendOtp = async (phone, otp) => {
    const phoneNumberId  = process.env.WA_PHONE_NUMBER_ID;
    const accessToken    = process.env.WA_ACCESS_TOKEN;
    const templateName   = process.env.WA_TEMPLATE_NAME || "pickup_otp";
    const templateLang   = process.env.WA_TEMPLATE_LANG || "en_US";

    if (!phoneNumberId || !accessToken) {
        if (process.env.NODE_ENV === "production") {
            throw new Error(
                "WhatsApp Cloud API is not configured (WA_PHONE_NUMBER_ID / WA_ACCESS_TOKEN missing)"
            );
        }
        console.warn(
            `[WhatsappSender] Not configured — dev fallback. OTP for ${phone}: ${otp}`
        );
        return { type: "dev-fallback", phone, otp };
    }

    // Recipient must be in E.164 format WITHOUT the leading "+" for the Cloud API.
    const to = String(phone).replace(/^\+/, "");

    const url = `https://graph.facebook.com/${WA_API_VERSION}/${phoneNumberId}/messages`;

    // Use an "authentication" template which accepts one body variable: the OTP.
    // If you prefer a custom text template replace the payload with a text type.
    const payload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "template",
        template: {
            name: templateName,
            language: { code: templateLang },
            components: [
                {
                    type: "body",
                    parameters: [
                        { type: "text", text: otp },
                    ],
                },
                // Authentication templates also accept a button component for
                // "Copy Code" — include it so the farmer can tap to copy.
                {
                    type: "button",
                    sub_type: "url",
                    index: "0",
                    parameters: [
                        { type: "text", text: otp },
                    ],
                },
            ],
        },
    };

    const response = await fetch(url, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok || data.error) {
        const errMsg = data.error?.message || JSON.stringify(data);
        throw new Error(`WhatsApp Cloud API error: ${errMsg}`);
    }

    console.log("[WhatsappSender] OTP sent via WhatsApp:", data?.messages?.[0]?.id);
    return data;
};

export default whatsappSendOtp;
