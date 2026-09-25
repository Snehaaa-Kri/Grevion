import {User , Spoc , Farmer , PowerPlant} from "../models/index.js"


const completeProfile = async (req, res) => {
    try {
        const { userId } = req.params;
        const { additionalDetails } = req.body;

        // Fetch user and check for existing profile in parallel.
        const user = await User.findById(userId);  //1 db call
        if (!user) return res.status(404).json({ message: "User not found" });

        let profileModel;
        let extraDetails = {};

        if (user.role === "spoc") {
            profileModel = Spoc;
            extraDetails.village = user.location;
        } else if (user.role === "power_plant") {
            profileModel = PowerPlant;
        } else {
            return res.status(400).json({ message: "Invalid role" });
        }

        // Check for existing profile and upsert in one call using findOneAndUpdate
        // with upsert:true — eliminates the separate findOne + conditional create/update.
        //2nd db call
        const profile = await profileModel.findOneAndUpdate(
            { userId },
            { $set: { ...additionalDetails, ...extraDetails } },
            { new: true, upsert: true }
        );

        user.additionalDetails = profile._id;
        await user.save(); //3rd db call

        res.status(201).json({ message: "Profile completed successfully", profile });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error });
    }
};

// Fetch User Profile with Linked Additional Details
const getUserProfile = async (req, res) => {
    try {
        const { userId } = req.params;
        
        console.log("Userid recieved", userId)

        const user = await User.findById(userId).populate("additionalDeatils");

        if (!user) return res.status(404).json({ message: "User not found" });

        console.log("User fetched successfully")

        res.status(200).json({ success: true , user });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error });
    }
};

export {completeProfile , getUserProfile}