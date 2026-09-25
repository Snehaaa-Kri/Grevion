import mongoose from "mongoose";

/**
 * Pickup verification OTP for the SPOC -> Farmer "Add Farmer" flow.
 *
 *  - bound to a specific farmer phone + email and the SPOC adding them
 *  - valid for 1 minute (TTL index auto-removes it after expiry)
 *  - single-use: `used` flag set after addFarmer consumes it
 *  - `verified` flag set by verifyFarmerOtp; addFarmer checks this before
 *    creating the farmer record — farmer cannot be added without verification
 */
const pickupOtpSchema = new mongoose.Schema({
    farmerPhone: {
        type: String,
        required: true,
    },
    farmerEmail: {
        type: String,
        required: true,
    },
    otp: {
        type: String,
        required: true,
    },
    spocId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Spoc",
        required: true,
    },
    verified: {
        type: Boolean,
        default: false,  // set to true by verifyFarmerOtp on correct OTP entry
    },
    used: {
        type: Boolean,
        default: false,  // set to true after addFarmer consumes the record
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 60,     // Mongo TTL — auto-deletes after 1 minute
    },
});

export const PickupOtp = mongoose.model("PickupOtp", pickupOtpSchema);
