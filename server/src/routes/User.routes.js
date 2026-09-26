import express from "express";
import { getUserInfo, login, sendOtp, signUp } from "../controllers/index.js";
import { auth } from "../middlewares/Auth.middlewares.js";
import validate from "../middlewares/validate.middleware.js";
import {
    sendOtpValidators,
    signupValidators,
    loginValidators,
} from "../validators/auth.validators.js";

const userRouter = express.Router();

userRouter.post("/sendotp", sendOtpValidators, validate, sendOtp);
userRouter.post("/signup",  signupValidators,  validate, signUp);
userRouter.post("/login",   loginValidators,   validate, login);
userRouter.get("/getUserInfo", auth, getUserInfo);

export default userRouter;
