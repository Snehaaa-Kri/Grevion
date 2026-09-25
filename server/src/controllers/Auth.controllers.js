import { User, Otp, Spoc, PowerPlant } from "../models/index.js";
import otpGenerator from "otp-generator";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import AppError from "../middlewares/AppError.js";  // default import — no curly braces
dotenv.config();

const sendOtp = async (req, res, next) => {
    try {
        const { email } = req.body;

        if (!email) {
            return next(new AppError("Email is required", 400));
        }

        const checkUserPresent = await User.findOne({ email });
        if (checkUserPresent) {
            return next(new AppError("User already exists", 401));
        }

        let otp;
        let result;
        do {
            otp = otpGenerator.generate(6, {
                upperCaseAlphabets: false,
                lowerCaseAlphabets: false,
                specialChars: false,
            });
            result = await Otp.findOne({ otp });
        } while (result);

        await Otp.create({ email, otp });

        return res.status(200).json({
            success: true,
            message: "OTP sent successfully",
        });
    } catch (error) {
        next(error);
    }
};

const signUp = async (req, res, next) => {
    try {
        const { name, email, password, phone, location, role, otp } = req.body;

        if (!name || !email || !password || !phone || !otp || !role || !location) {
            return next(new AppError("All fields are required", 400));
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return next(new AppError("User is already registered", 400));
        }

        const recentOtp = await Otp.find({ email }).sort({ createdAt: -1 }).limit(1);
        if (recentOtp.length === 0) {
            return next(new AppError("OTP not found", 400));
        }

        if (otp !== recentOtp[0].otp) {
            return next(new AppError("Invalid OTP", 400));
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = new User({
            name,
            email,
            password: hashedPassword,
            role,
            location,
            phone,
            image: `https://api.dicebear.com/5.x/initials/svg?seed=${name} ${name}`,
        });

        const savedUser = await user.save();

        if (role === "spoc") {
            const newSpoc = new Spoc({
                userId: savedUser._id,
                name,
                email,
                phone,
                location,
                totalParaliCollected: 0,
            });
            await newSpoc.save();
        }

        if (role === "power_plant") {
            const newPowerPlant = new PowerPlant({
                userId: savedUser._id,
                name,
                email,
                phone,
                location,
            });
            await newPowerPlant.save();
        }

        const token = jwt.sign(
            { email: savedUser.email, id: savedUser._id, role: savedUser.role },
            process.env.SECRET_KEY,
            { expiresIn: "2h" }
        );

        return res.status(200).json({
            success: true,
            message: "User registered successfully",
            token,
            role: savedUser.role,
            savedUser,
        });
    } catch (error) {
        next(error);
    }
};

const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return next(new AppError("All fields are required", 400));
        }

        const user = await User.findOne({ email });
        if (!user) {
            return next(new AppError("User is not registered", 400));
        }

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return next(new AppError("Incorrect password", 400));
        }

        const token = jwt.sign(
            { email: user.email, id: user._id, role: user.role },
            process.env.SECRET_KEY,
            { expiresIn: "2h" }
        );

        user.token    = token;
        user.password = undefined;

        const options = {
            expires: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
            httpOnly: true,
        };

        return res.cookie("token", token, options).status(200).json({
            success: true,
            message: "User logged in successfully",
            token,
            role: user.role,
            user,
        });
    } catch (error) {
        next(error);
    }
};

const getUserInfo = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const user   = await User.findById(userId);

        if (!user) {
            return next(new AppError("User not found", 404));
        }

        return res.status(200).json({
            success: true,
            message: "User details fetched successfully",
            user,
        });
    } catch (error) {
        next(error);
    }
};

export { sendOtp, login, signUp, getUserInfo };
