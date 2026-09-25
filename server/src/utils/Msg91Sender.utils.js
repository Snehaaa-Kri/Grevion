/**
 * MSG91 OTP Sender
 *
 * Sends a 4-character OTP via MSG91's Send OTP API (v5).
 * API reference: https://api.msg91.com/api/v5/otp
 *
 * Required env vars:
 *   MSG91_AUTH_KEY      — your MSG91 authkey (Dashboard → username → Authkey)
 *   MSG91_TEMPLATE_ID   — ID of the OTP template that contains ##OTP## in body
 *
 * Request format (confirmed from MSG91 docs):
 *   POST https://api.msg91.com/api/v5/otp
 *   Query params: template_id, mobile, authkey, otp
 *   Content-Type: application/JSON
 *
 * Mobile format: country-code + number, NO "+" prefix  e.g. 919876543210
 *
 * Dev fallback: if env vars are missing the OTP is printed to the server
 * console so the flow stays testable without a paid plan.
 */

const MSG91_SEND_OTP_URL = "https://api.msg91.com/api/v5/otp";

const msg91SendOtp = async (phone, otp) => {
    const authKey    = process.env.MSG91_AUTH_KEY;
    const templateId = process.env.MSG91_TEMPLATE_ID;

    if (!authKey || !templateId) {
        if (process.env.NODE_ENV === "production") {
            throw new Error(
                "MSG91 is not configured (MSG91_AUTH_KEY / MSG91_TEMPLATE_ID missing)"
            );
        }
        console.warn(
            `[Msg91Sender] Not configured — dev fallback. OTP for ${phone}: ${otp}`
        );
        return { type: "dev-fallback", phone, otp };
    }

    // MSG91 expects mobile with country code, no "+" prefix.
    // normalizePhone() in the controller adds +91 for bare 10-digit numbers,
    // so we strip the leading "+" here. Result: 919876543210
    const mobile = String(phone).replace(/^\+/, "");

    const url = new URL(MSG91_SEND_OTP_URL);
    url.searchParams.set("template_id", templateId);
    url.searchParams.set("mobile", mobile);
    url.searchParams.set("authkey", authKey);
    url.searchParams.set("otp", otp);          // MSG91 injects this into ##OTP## in the template
    url.searchParams.set("otp_length", "6");   // must match the OTP value length

    const response = await fetch(url.toString(), {
        method: "POST",
        headers: {
            // authkey in header is accepted too but query param is the documented way
            authkey: authKey,
            "Content-Type": "application/JSON",
        },
    });

    // MSG91 returns plain text ("3512c31671..." request-id) on success,
    // or JSON {"message":"...","type":"error"} on failure.
    const raw = await response.text();

    let data;
    try {
        data = JSON.parse(raw);
    } catch {
        // Non-JSON response = success (MSG91 returns a raw request ID string)
        data = { type: "success", requestId: raw };
    }

    if (!response.ok || data.type === "error") {
        throw new Error(`MSG91 error: ${data.message || raw}`);
    }

    console.log("[Msg91Sender] OTP sent via SMS. Request ID:", data.requestId || raw);
    return data;
};

export default msg91SendOtp;
