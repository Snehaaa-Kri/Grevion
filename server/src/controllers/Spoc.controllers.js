import mongoose from "mongoose";
import crypto from "crypto";
import { Spoc, Farmer, Request, Order, PowerPlant, PickupOtp } from "../models/index.js";
import mailSender from "../utils/MailSender.utils.js";
import msg91SendOtp from "../utils/Msg91Sender.utils.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Normalize phone: bare 10-digit Indian numbers get a +91 prefix so the same
// number is stored/matched consistently between send and verify.
const normalizePhone = (phone) => {
    const raw = String(phone || "").trim().replace(/[\s-]/g, "");
    if (raw.startsWith("+")) return raw;
    if (/^\d{10}$/.test(raw)) return `+91${raw}`;
    return raw;
};

// SMS OTP: 6 digits only — MSG91's OTP API strictly requires numeric values.
const SMS_OTP_CHARSET = "0123456789";
// Email OTP: 6 alphanumeric characters (upper + lower + digits).
const EMAIL_OTP_CHARSET =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

const generatePickupOtp = (length = 6, charset = EMAIL_OTP_CHARSET) => {
    let otp = "";
    for (let i = 0; i < length; i++) {
        const idx = crypto.randomInt(0, charset.length);
        otp += charset[idx];
    }
    return otp;
};

// Build the OTP email body sent to the farmer.
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
// Tries SMS first (channel="sms") or email (channel="email").
// If SMS delivery fails for any reason, automatically falls back to email
// so the farmer always gets the OTP.
// ---------------------------------------------------------------------------
const sendFarmerOtp = async (req, res) => {
    try {
        const userId = req.user.id;
        // channel: "sms" | "email"  (default "sms", auto-falls back to email)
        const { phone, email, channel = "sms" } = req.body;

        if (!phone || !email) {
            return res.status(400).json({
                success: false,
                message: "Farmer phone number and email are required"
            });
        }

        if (!["sms", "email"].includes(channel)) {
            return res.status(400).json({
                success: false,
                message: "channel must be 'sms' or 'email'"
            });
        }

        const spoc = await Spoc.findOne({ userId });
        if (!spoc) {
            return res.status(404).json({
                success: false,
                message: "SPOC not found for this user"
            });
        }

        const farmerPhone = normalizePhone(phone);
        const farmerEmail = String(email).trim().toLowerCase();

        // Invalidate any prior OTPs for this farmer + SPOC.
        await PickupOtp.deleteMany({ farmerPhone, spocId: spoc._id });

        // Generate a unique OTP.
        // SMS channel uses numeric-only (MSG91 requirement).
        // Email channel uses full alphanumeric.
        const charset = channel === "sms" ? SMS_OTP_CHARSET : EMAIL_OTP_CHARSET;
        let otp;
        let duplicate;
        do {
            otp = generatePickupOtp(6, charset);
            duplicate = await PickupOtp.findOne({ otp });
        } while (duplicate);

        await PickupOtp.create({ farmerPhone, farmerEmail, otp, spocId: spoc._id });

        // --- Attempt delivery ---
        let deliveredVia = channel;
        let smsError = null;

        if (channel === "sms") {
            try {
                await msg91SendOtp(farmerPhone, otp);
            } catch (err) {
                // SMS failed — fall back to email automatically.
                smsError = err.message;
                console.warn(`[sendFarmerOtp] SMS failed (${err.message}), falling back to email.`);
                deliveredVia = "email";
            }
        }

        // Send email if channel is "email" OR sms fallback was triggered.
        if (deliveredVia === "email") {
            try {
                await mailSender(
                    farmerEmail,
                    "Grevion Pickup Verification OTP",
                    buildOtpEmailBody(otp, spoc.name || "Your SPOC")
                );
            } catch (mailErr) {
                // Both SMS and email failed — clean up and surface the error.
                await PickupOtp.deleteMany({ farmerPhone, spocId: spoc._id });
                console.error("[sendFarmerOtp] Email fallback also failed:", mailErr.message);
                return res.status(502).json({
                    success: false,
                    message: "OTP delivery failed on both SMS and email. Please try again."
                });
            }
        }

        const channelLabel = deliveredVia === "sms"
            ? "farmer's phone via SMS"
            : `farmer's email${smsError ? " (SMS failed, used email fallback)" : ""}`;

        return res.status(200).json({
            success: true,
            deliveredVia,
            message: `OTP sent to ${channelLabel}`
        });
    } catch (error) {
        console.error("Error in sendFarmerOtp:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to generate OTP, please try again"
        });
    }
};

// ---------------------------------------------------------------------------
// verifyFarmerOtp
// SPOC enters the OTP the farmer received. On match, the PickupOtp record is
// marked `verified: true`. The farmer is NOT created here — addFarmer does
// that and checks the verified flag. This separation means the SPOC can't
// accidentally skip verification.
// ---------------------------------------------------------------------------
const verifyFarmerOtp = async (req, res) => {
    try {
        const userId = req.user.id;
        const { phone, otp } = req.body;

        if (!phone || !otp) {
            return res.status(400).json({
                success: false,
                message: "Phone and OTP are required"
            });
        }

        const spoc = await Spoc.findOne({ userId });
        if (!spoc) {
            return res.status(404).json({
                success: false,
                message: "SPOC not found"
            });
        }

        const farmerPhone = normalizePhone(phone);

        const otpRecord = await PickupOtp.findOne({
            farmerPhone,
            spocId: spoc._id,
        }).sort({ createdAt: -1 });

        if (!otpRecord) {
            return res.status(400).json({
                success: false,
                message: "OTP has expired or was not requested. Please resend."
            });
        }

        if (otpRecord.used) {
            return res.status(400).json({
                success: false,
                message: "This OTP has already been used"
            });
        }

        if (String(otp).trim() !== otpRecord.otp) {
            return res.status(400).json({
                success: false,
                verified: false,
                message: "Incorrect OTP. Farmer not verified."
            });
        }

        // Mark as verified so addFarmer can proceed.
        otpRecord.verified = true;
        await otpRecord.save();

        return res.status(200).json({
            success: true,
            verified: true,
            message: "Farmer verified successfully"
        });
    } catch (error) {
        console.error("Error in verifyFarmerOtp:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to verify OTP, please try again"
        });
    }
};

const addFarmer = async (req, res) => {
    try {
        const userId = req.user.id;

        const { name, phone, email, totalParali, fieldLocation } = req.body;

        if (!email || !name || !phone || !totalParali || !fieldLocation) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        const existingFarmer = await Farmer.findOne({ email });
        if (existingFarmer) {
            return res.status(400).json({
                success: false,
                message: "Farmer already exists"
            });
        }

        const spoc = await Spoc.findOne({ userId });
        if (!spoc) {
            return res.status(404).json({
                success: false,
                message: "SPOC not found for this user"
            });
        }

        const farmerPhone = normalizePhone(phone);

        // Gate: farmer must have verified the OTP before they can be added.
        const otpRecord = await PickupOtp.findOne({
            farmerPhone,
            spocId: spoc._id,
        }).sort({ createdAt: -1 });

        if (!otpRecord) {
            return res.status(400).json({
                success: false,
                message: "Farmer not verified. OTP has expired or was not requested — please resend."
            });
        }

        if (!otpRecord.verified) {
            return res.status(403).json({
                success: false,
                message: "Farmer not verified. Please verify the OTP before adding the farmer."
            });
        }

        if (otpRecord.used) {
            return res.status(400).json({
                success: false,
                message: "This verification has already been used"
            });
        }

        // Create the farmer record.
        const newFarmer = await Farmer.create({
            name,
            email,
            phone,
            village: spoc.location,
            fieldLocation,
            totalParali,
            spocId: spoc._id
        });

        // Consume the OTP record so it can't be reused.
        otpRecord.used = true;
        await otpRecord.save();
        await PickupOtp.deleteMany({ farmerPhone, spocId: spoc._id });

        // Update SPOC aggregates.
        await Spoc.findByIdAndUpdate(
            spoc._id,
            { $push: { farmers: newFarmer._id }, $inc: { totalParaliCollected: totalParali } },
            { new: true }
        );

        return res.status(200).json({
            success: true,
            message: "Farmer added successfully",
            newFarmer
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Unable to add farmer, please try again"
        });
    }
};

const updateFarmer = async (req, res) => {
    try {
        const farmerId = req.params.farmerId;
        const { name, phone, email, totalParali } = req.body;

        if (!name || !phone || !email || totalParali === undefined) {
            return res.status(400).json({
                success: false,
                message: "All fields are required!"
            });
        }

        const farmerObj = await Farmer.findById(farmerId);
        if (!farmerObj) {
            return res.status(400).json({ success: false, message: "Farmer ID doesn't exist!" });
        }

        const spocId = farmerObj.spocId;
        const previousParali = farmerObj.totalParali;
        const paraliDifference = totalParali - previousParali; // Calculate the difference

        // Update Farmer details
        const updatedFarmer = await Farmer.findByIdAndUpdate(
            farmerId, 
            { totalParali, name, phone, email }, 
            { new: true }
        );

        // Update totalParaliCollected in Spoc
        await Spoc.findByIdAndUpdate(
            spocId,
            { $inc: { totalParaliCollected: paraliDifference } }, // Adjust based on difference
            { new: true }
        );

        return res.status(200).json({
            success: true,
            updatedFarmer,
            message: "Farmer details updated successfully!"
        });

    } catch (error) {
        console.log("Error updating farmer details:", error);
        return res.status(500).json({
            success: false,
            message: "Error updating farmer details. Try again!"
        });
    }
};


const getAllFarmers = async (req, res) => {
    try {
        const userId = req.user.id;

        // Find the SPOC using userId
        const spoc = await Spoc.findOne({ userId }).populate("farmers");

        // Check if SPOC exists
        if (!spoc) {
            return res.status(404).json({
                success: false,
                message: "SPOC not found for this user",
            });
        }

        return res.status(200).json({
            success: true,
            message: "All farmers fetched successfully",
            farmers: spoc.farmers,
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Error fetching farmers",
        });
    }
};


const deleteFarmer = async (req, res) => {
    try{
        const farmerId = req.params.farmerId;
        console.log(farmerId);
        
        const farmerObj = await Farmer.findById(farmerId);
        if(!farmerObj) return res.status(204).json({message: "Farmer doesn't exists"});
        const spocid = farmerObj.spocId;
        
        console.log(spocid);
      

        const updatedSpoc = await Spoc.findByIdAndUpdate(spocid, 
            {$pull : {farmers: farmerId}, $inc: {totalParaliCollected: -farmerObj.totalParali}},
            {new: true});
        await Farmer.findByIdAndDelete(farmerId);

        res.status(200).json({updatedSpoc, success: true, message: "deleted farmer successfully!"})
    }
    catch(error){
        console.log("Error deleting farmer: ", error);
        return res.status(400).json({
            success : false,
            message: "Error deleting farmer"
        })
    }
}
const getAllRequests = async (req, res) => {
    try {
      const userId = req.user.id;
      const spoc = await Spoc.findOne({ userId }).populate({
        path: "requests",
        model: "Request", // Explicitly mention the model
      });
      
  
      if (!spoc) {
        return res.status(404).json({
          success: false,
          message: "Spoc not found",
        });
      }
  
      console.log("Requests inside Spoc:", spoc.requests); // Debugging line
  
      return res.status(200).json({
        success: true,
        message: "All requests fetched successfully",
        requests: spoc.requests,
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        success: false,
        message: "Error fetching requests",
      });
    }
  };

  
  const acceptRequest = async (req, res) => {
    try {
        const userId = req.user.id;  // This is the user ID
        const reqid = req.params.reqid; // Request ID from params


        // Fetch the request and populate the powerPlant field
        let request = await Request.findById(reqid);

        if (!request) {
            return res.status(404).json({
                success: false,
                message: "Request not found"
            });
        }

        console.log("Fetched Request:", request);

        // Fetch the SPOC linked to this user
        let spoc = await Spoc.findOne({ userId: userId }).select("totalParaliCollected");
        if (!spoc) {
            return res.status(404).json({
                success: false,
                message: "SPOC not found"
            });
        }

        // Check if enough parali is available
        if (spoc.totalParaliCollected < request.requestedParali) {
            return res.status(400).json({
                success: false,
                message: "Insufficient quantity"
            });
        }

        // Update Spoc's totalParaliCollected
        spoc = await Spoc.findByIdAndUpdate(
            spoc._id,
            {
                $inc: { totalParaliCollected: -request.requestedParali },
                $pull: { requests: reqid }  // Remove request ID from Spoc requests array
            },
            { new: true }
        );

        // Delete request
        await Request.findByIdAndDelete(reqid);

        // Update order status
        const orderId = request.orderId;
        const order = await Order.findByIdAndUpdate(
            orderId,
            { status: "accepted" },
            { new: true }
        );

        // Fetch Power Plant email
        const powerPlantId = request.powerPlantId;
        console.log("power plant id",powerPlantId)
        const powerPlant= await PowerPlant.findById(powerPlantId);
        const powerPlantEmail=powerPlant.email;
        console.log("Power Plant Email:", powerPlantEmail);

        if (!powerPlantEmail) {
            return res.status(400).json({
                success: false,
                message: "Power plant email not found"
            });
        }

        // Send Email
        const emailTitle = "Request Accepted - Parali Delivery Confirmation";
        const emailBody = `
            <p>Dear Sir,</p>
            <p>Your request for <strong>${request.requestedParali} tons of parali</strong> has been accepted.</p>
            <p>Please prepare for the pickup or further processing.</p>
            <p>Regards,<br> Grevion Team</p>
        `;

        await mailSender(powerPlantEmail, emailTitle, emailBody);

        return res.status(200).json({
            success: true,
            message: "Request accepted successfully and email sent to power plant",
            updatedSpoc: spoc,
            updatedOrder: order
        });

    } catch (error) {
        console.error("Error accepting request:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to accept request, please try again"
        });
    }
};

const declineRequest= async(req,res)=>{
    try {
        const userId = req.user.id;  // This is the user ID
        const reqid = req.params.reqid; // Request ID from params

        console.log("Received User ID:", userId);
        console.log("Received Request ID:", reqid);

        // Fetch the request
        let request = await Request.findById(reqid);
        if (!request) {
            return res.status(404).json({
                success: false,
                message: "Request not found"
            });
        }

        request = await Request.findByIdAndDelete(
            reqid,
        );

        // Update order status
        const orderId = request.orderId;
        const order = await Order.findByIdAndUpdate(
            orderId,
            { status: "rejected" },
            { new: true }
        );
        let spoc = await Spoc.findOne({ userId: userId })
        spoc = await Spoc.findByIdAndUpdate(
            spoc._id,
            {
                $pull: { requests: reqid }  // Remove request ID from Spoc requests array
            },
            { new: true }
        );

        const powerPlantId = request.powerPlantId;
        console.log("power plant id",powerPlantId)
        const powerPlant= await PowerPlant.findById(powerPlantId);
        const powerPlantEmail=powerPlant.email;
        console.log("Power Plant Email:", powerPlantEmail);

        if (!powerPlantEmail) {
            return res.status(400).json({
                success: false,
                message: "Power plant email not found"
            });
        }

        // Send Email
        const emailTitle = "Request Rejected - Parali Delivery Update";
        const emailBody = `
            <p>Dear Sir,</p>
            <p>We regret to inform you that your request for <strong>${request.requestedParali} tons of parali</strong> has been rejected.</p>
            <p>For further assistance or to place a new request, please contact our team.</p>
            <p>Regards,<br> Grevion Team</p>
        `;
        

        await mailSender(powerPlantEmail, emailTitle, emailBody);
        return res.status(200).json({
            success: true,
            message: "Request rejected successfully",
            updatedRequest: request,
            updatedOrder: order
        });
    } catch (error) {
        console.error("Error rejecting request:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to reject request, please try again"
        });
    }
}

const getSpocInfo= async(req,res)=>{
    try {
        const userId= req.user.id;
        console.log(userId)
        const spoc= await Spoc.findOne({userId});
        console.log(spoc)
        if(!spoc)
        {
            return res.status(400).json({
                success:false,
                message:"Spoc not found"
            })
        }
        return res.status(200).json({
            success:true,
            message:"Spoc info fetched successfully",
            spoc
        })
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success:false,
            message:"Unable to fetch spoc info, please try again!"
        })
    }
}



export { sendFarmerOtp, verifyFarmerOtp, addFarmer, updateFarmer, deleteFarmer, getAllFarmers, getAllRequests, acceptRequest, declineRequest, getSpocInfo };
