import mongoose from "mongoose";
import crypto from "crypto";
import { Spoc, Farmer, Request, Order, PowerPlant, PickupOtp } from "../models/index.js";
import mailSender from "../utils/MailSender.utils.js";
import msg91SendOtp from "../utils/Msg91Sender.utils.js";
import AppError from "../middlewares/AppError.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const normalizePhone = (phone) => {
    const raw = String(phone || "").trim().replace(/[\s-]/g, "");
    if (raw.startsWith("+")) return raw;
    if (/^\d{10}$/.test(raw)) return `+91${raw}`;
    return raw;
};

const SMS_OTP_CHARSET   = "0123456789";
const EMAIL_OTP_CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

const generatePickupOtp = (length = 6, charset = EMAIL_OTP_CHARSET) => {
    let otp = "";
    for (let i = 0; i < length; i++) {
        otp += charset[crypto.randomInt(0, charset.length)];
    }
    return otp;
};

const buildOtpEmailBody = (otp, spocName = "your SPOC") => `
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:8px">
        <h2 style="color:#166534">Grevion Pickup Verification</h2>
        <p>Hi,</p>
        <p>${spocName} is adding you as a farmer on the Grevion platform. Please share the OTP below to verify your pickup:</p>
        <div style="font-size:2rem;font-weight:bold;letter-spacing:0.25rem;text-align:center;padding:16px 0;color:#15803d">
            ${otp}
        </div>
        <p style="color:#6b7280;font-size:0.85rem">This OTP is valid for <strong>1 minute</strong> and can be used only once. Do not share it with anyone other than your SPOC.</p>
        <p style="color:#6b7280;font-size:0.85rem">If you did not expect this message, please ignore it.</p>
        <hr style="border-color:#e5e7eb;margin:16px 0"/>
        <p style="color:#9ca3af;font-size:0.75rem">Grevion &mdash; Connecting SPOCs and Power Plants</p>
    </div>`;

// ---------------------------------------------------------------------------
// sendFarmerOtp
// ---------------------------------------------------------------------------
const sendFarmerOtp = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { phone, email, channel = "sms" } = req.body;

        if (!phone || !email) {
            return next(new AppError("Farmer phone number and email are required", 400));
        }
        if (!["sms", "email"].includes(channel)) {
            return next(new AppError("channel must be 'sms' or 'email'", 400));
        }

        const spoc = await Spoc.findOne({ userId });
        if (!spoc) {
            return next(new AppError("SPOC not found for this user", 404));
        }

        const farmerPhone = normalizePhone(phone);
        const farmerEmail = String(email).trim().toLowerCase();

        await PickupOtp.deleteMany({ farmerPhone, spocId: spoc._id });

        const charset = channel === "sms" ? SMS_OTP_CHARSET : EMAIL_OTP_CHARSET;
        let otp, duplicate;
        do {
            otp       = generatePickupOtp(6, charset);
            duplicate = await PickupOtp.findOne({ otp });
        } while (duplicate);

        await PickupOtp.create({ farmerPhone, farmerEmail, otp, spocId: spoc._id });

        let deliveredVia = channel;
        let smsError     = null;

        if (channel === "sms") {
            try {
                await msg91SendOtp(farmerPhone, otp);
            } catch (err) {
                smsError     = err.message;
                deliveredVia = "email";
                console.warn(`[sendFarmerOtp] SMS failed (${err.message}), falling back to email.`);
            }
        }

        if (deliveredVia === "email") {
            try {
                await mailSender(
                    farmerEmail,
                    "Grevion Pickup Verification OTP",
                    buildOtpEmailBody(otp, spoc.name || "Your SPOC")
                );
            } catch (mailErr) {
                await PickupOtp.deleteMany({ farmerPhone, spocId: spoc._id });
                return next(new AppError("OTP delivery failed on both SMS and email. Please try again.", 502));
            }
        }

        const channelLabel = deliveredVia === "sms"
            ? "farmer's phone via SMS"
            : `farmer's email${smsError ? " (SMS failed, used email fallback)" : ""}`;

        return res.status(200).json({
            success: true,
            deliveredVia,
            message: `OTP sent to ${channelLabel}`,
        });
    } catch (error) {
        next(error);
    }
};

// ---------------------------------------------------------------------------
// verifyFarmerOtp
// ---------------------------------------------------------------------------
const verifyFarmerOtp = async (req, res, next) => {
    try {
        const userId      = req.user.id;
        const { phone, otp } = req.body;

        if (!phone || !otp) {
            return next(new AppError("Phone and OTP are required", 400));
        }

        const spoc = await Spoc.findOne({ userId });
        if (!spoc) {
            return next(new AppError("SPOC not found", 404));
        }

        const farmerPhone = normalizePhone(phone);
        const otpRecord   = await PickupOtp.findOne({ farmerPhone, spocId: spoc._id }).sort({ createdAt: -1 });

        if (!otpRecord) {
            return next(new AppError("OTP has expired or was not requested. Please resend.", 400));
        }
        if (otpRecord.used) {
            return next(new AppError("This OTP has already been used", 400));
        }
        if (String(otp).trim() !== otpRecord.otp) {
            return next(new AppError("Incorrect OTP. Farmer not verified.", 400));
        }

        otpRecord.verified = true;
        await otpRecord.save();

        return res.status(200).json({
            success:  true,
            verified: true,
            message:  "Farmer verified successfully",
        });
    } catch (error) {
        next(error);
    }
};

// ---------------------------------------------------------------------------
// addFarmer
// ---------------------------------------------------------------------------
const addFarmer = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { name, phone, email, totalParali, fieldLocation } = req.body;

        if (!email || !name || !phone || !totalParali || !fieldLocation) {
            return next(new AppError("All fields are required", 400));
        }

        const existingFarmer = await Farmer.findOne({ email });
        if (existingFarmer) {
            return next(new AppError("Farmer already exists", 400));
        }

        const spoc = await Spoc.findOne({ userId });
        if (!spoc) {
            return next(new AppError("SPOC not found for this user", 404));
        }

        const farmerPhone = normalizePhone(phone);
        const otpRecord   = await PickupOtp.findOne({ farmerPhone, spocId: spoc._id }).sort({ createdAt: -1 });

        if (!otpRecord) {
            return next(new AppError("Farmer not verified. OTP has expired or was not requested — please resend.", 400));
        }
        if (!otpRecord.verified) {
            return next(new AppError("Farmer not verified. Please verify the OTP before adding the farmer.", 403));
        }
        if (otpRecord.used) {
            return next(new AppError("This verification has already been used", 400));
        }

        const newFarmer = await Farmer.create({
            name, email, phone,
            village: spoc.location,
            fieldLocation, totalParali,
            spocId: spoc._id,
        });

        otpRecord.used = true;
        await otpRecord.save();
        await PickupOtp.deleteMany({ farmerPhone, spocId: spoc._id });

        await Spoc.findByIdAndUpdate(
            spoc._id,
            { $push: { farmers: newFarmer._id }, $inc: { totalParaliCollected: totalParali } },
            { new: true }
        );

        return res.status(200).json({
            success: true,
            message: "Farmer added successfully",
            newFarmer,
        });
    } catch (error) {
        next(error);
    }
};

// ---------------------------------------------------------------------------
// updateFarmer
// ---------------------------------------------------------------------------
const updateFarmer = async (req, res, next) => {
    try {
        const farmerId = req.params.farmerId;
        const { name, phone, email, totalParali } = req.body;

        if (!name || !phone || !email || totalParali === undefined) {
            return next(new AppError("All fields are required", 400));
        }

        const farmerObj = await Farmer.findById(farmerId);
        if (!farmerObj) {
            return next(new AppError("Farmer not found", 404));
        }

        const paraliDifference = totalParali - farmerObj.totalParali;

        const updatedFarmer = await Farmer.findByIdAndUpdate(
            farmerId,
            { totalParali, name, phone, email },
            { new: true }
        );

        await Spoc.findByIdAndUpdate(
            farmerObj.spocId,
            { $inc: { totalParaliCollected: paraliDifference } },
            { new: true }
        );

        return res.status(200).json({
            success: true,
            message: "Farmer details updated successfully",
            updatedFarmer,
        });
    } catch (error) {
        next(error);
    }
};

// ---------------------------------------------------------------------------
// getAllFarmers
// ---------------------------------------------------------------------------
const getAllFarmers = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const spoc   = await Spoc.findOne({ userId }).populate("farmers");

        if (!spoc) {
            return next(new AppError("SPOC not found for this user", 404));
        }

        return res.status(200).json({
            success: true,
            message: "All farmers fetched successfully",
            farmers: spoc.farmers,
        });
    } catch (error) {
        next(error);
    }
};

// ---------------------------------------------------------------------------
// deleteFarmer
// ---------------------------------------------------------------------------
const deleteFarmer = async (req, res, next) => {
    try {
        const farmerId  = req.params.farmerId;
        const farmerObj = await Farmer.findById(farmerId);

        if (!farmerObj) {
            return next(new AppError("Farmer not found", 404));
        }

        await Spoc.findByIdAndUpdate(
            farmerObj.spocId,
            { $pull: { farmers: farmerId }, $inc: { totalParaliCollected: -farmerObj.totalParali } },
            { new: true }
        );
        await Farmer.findByIdAndDelete(farmerId);

        return res.status(200).json({
            success: true,
            message: "Farmer deleted successfully",
        });
    } catch (error) {
        next(error);
    }
};

// ---------------------------------------------------------------------------
// getAllRequests
// ---------------------------------------------------------------------------
const getAllRequests = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const spoc   = await Spoc.findOne({ userId }).populate({ path: "requests", model: "Request" });

        if (!spoc) {
            return next(new AppError("SPOC not found", 404));
        }

        return res.status(200).json({
            success:  true,
            message:  "All requests fetched successfully",
            requests: spoc.requests,
        });
    } catch (error) {
        next(error);
    }
};

// ---------------------------------------------------------------------------
// acceptRequest
// ---------------------------------------------------------------------------
const acceptRequest = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const reqid  = req.params.reqid;

        const request = await Request.findById(reqid);
        if (!request) {
            return next(new AppError("Request not found", 404));
        }

        let spoc = await Spoc.findOne({ userId }).select("totalParaliCollected _id");
        if (!spoc) {
            return next(new AppError("SPOC not found", 404));
        }

        if (spoc.totalParaliCollected < request.requestedParali) {
            return next(new AppError("Insufficient quantity", 400));
        }

        spoc = await Spoc.findByIdAndUpdate(
            spoc._id,
            { $inc: { totalParaliCollected: -request.requestedParali }, $pull: { requests: reqid } },
            { new: true }
        );

        await Request.findByIdAndDelete(reqid);

        const order = await Order.findByIdAndUpdate(
            request.orderId,
            { status: "accepted" },
            { new: true }
        );

        const powerPlant = await PowerPlant.findById(request.powerPlantId);
        if (!powerPlant?.email) {
            return next(new AppError("Power plant email not found", 400));
        }

        await mailSender(
            powerPlant.email,
            "Request Accepted - Parali Delivery Confirmation",
            `<p>Dear Sir,</p>
             <p>Your request for <strong>${request.requestedParali} tons of parali</strong> has been accepted.</p>
             <p>Please prepare for the pickup or further processing.</p>
             <p>Regards,<br>Grevion Team</p>`
        );

        return res.status(200).json({
            success:      true,
            message:      "Request accepted successfully and email sent to power plant",
            updatedSpoc:  spoc,
            updatedOrder: order,
        });
    } catch (error) {
        next(error);
    }
};

// ---------------------------------------------------------------------------
// declineRequest
// ---------------------------------------------------------------------------
const declineRequest = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const reqid  = req.params.reqid;

        const request = await Request.findByIdAndDelete(reqid);
        if (!request) {
            return next(new AppError("Request not found", 404));
        }

        const [order, spoc] = await Promise.all([
            Order.findByIdAndUpdate(request.orderId, { status: "rejected" }, { new: true }),
            Spoc.findOneAndUpdate(
                { userId },
                { $pull: { requests: reqid } },
                { new: true }
            ),
        ]);

        const powerPlant = await PowerPlant.findById(request.powerPlantId);
        if (!powerPlant?.email) {
            return next(new AppError("Power plant email not found", 400));
        }

        await mailSender(
            powerPlant.email,
            "Request Rejected - Parali Delivery Update",
            `<p>Dear Sir,</p>
             <p>We regret to inform you that your request for <strong>${request.requestedParali} tons of parali</strong> has been rejected.</p>
             <p>For further assistance or to place a new request, please contact our team.</p>
             <p>Regards,<br>Grevion Team</p>`
        );

        return res.status(200).json({
            success:        true,
            message:        "Request rejected successfully",
            updatedRequest: request,
            updatedOrder:   order,
        });
    } catch (error) {
        next(error);
    }
};

// ---------------------------------------------------------------------------
// getSpocInfo
// ---------------------------------------------------------------------------
const getSpocInfo = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const spoc   = await Spoc.findOne({ userId });

        if (!spoc) {
            return next(new AppError("SPOC not found", 404));
        }

        return res.status(200).json({
            success: true,
            message: "SPOC info fetched successfully",
            spoc,
        });
    } catch (error) {
        next(error);
    }
};

export {
    sendFarmerOtp, verifyFarmerOtp, addFarmer, updateFarmer,
    deleteFarmer, getAllFarmers, getAllRequests, acceptRequest,
    declineRequest, getSpocInfo,
};
