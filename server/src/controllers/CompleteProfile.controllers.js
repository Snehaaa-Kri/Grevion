import { User, Spoc, PowerPlant } from "../models/index.js";
import AppError from "../middlewares/AppError.js";

const completeProfile = async (req, res, next) => {
    try {
        const { userId }          = req.params;
        const { additionalDetails } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return next(new AppError("User not found", 404));
        }

        let profileModel;
        let extraDetails = {};

        if (user.role === "spoc") {
            profileModel         = Spoc;
            extraDetails.village = user.location;
        } else if (user.role === "power_plant") {
            profileModel = PowerPlant;
        } else {
            return next(new AppError("Invalid role", 400));
        }

        // findOneAndUpdate with upsert:true replaces the old findOne + conditional
        // create/update pattern — saves one DB round-trip.
        const profile = await profileModel.findOneAndUpdate(
            { userId },
            { $set: { ...additionalDetails, ...extraDetails } },
            { new: true, upsert: true }
        );

        user.additionalDetails = profile._id;
        await user.save();

        return res.status(201).json({
            message: "Profile completed successfully",
            profile,
        });
    } catch (error) {
        next(error);
    }
};

const getUserProfile = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const user       = await User.findById(userId).populate("additionalDetails");

        if (!user) {
            return next(new AppError("User not found", 404));
        }

        return res.status(200).json({
            success: true,
            user,
        });
    } catch (error) {
        next(error);
    }
};

export { completeProfile, getUserProfile };
