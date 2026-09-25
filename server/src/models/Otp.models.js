import mongoose from "mongoose";
import mailSender from "../utils/MailSender.utils.js"

const otpSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 5 * 60,
    },
    otp: {
        type: String,
        required: true,
    }
});

async function sendVerificationEmail(email, otp) {
    const mailResponse = await mailSender(
        email,
        "Verification email from Grevion",
        `<div style="font-family: Arial, sans-serif;">
            <h2>Grevion Email Verification</h2>
            <p>Your One Time Password (OTP) is:</p>
            <h1 style="letter-spacing: 4px;">${otp}</h1>
            <p>This code is valid for 5 minutes. Please do not share it with anyone.</p>
        </div>`
    );
    console.log("Email sent successfully", mailResponse);
    return mailResponse;
}

otpSchema.pre("save", async function (next) {
    try {
        await sendVerificationEmail(this.email, this.otp);
        next();
    } catch (error) {
        // Surface email failures so sendOtp does not report a false success
        next(error);
    }
});

export const Otp = mongoose.model("Otp",otpSchema)
