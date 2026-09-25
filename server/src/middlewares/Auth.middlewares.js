import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import AppError from "./AppError.js";
dotenv.config();

const auth = async (req, res, next) => {
    try {
        const token =
            req.cookies.token ||
            req.body.token ||
            req.header("Authorization")?.replace("Bearer ", "");

        if (!token) {
            return next(new AppError("Token missing", 401));
        }

        const decode = jwt.verify(token, process.env.SECRET_KEY);
        // jwt.verify throws JsonWebTokenError / TokenExpiredError on failure —
        // those are caught by the catch block and forwarded to errorHandler
        // which already handles both by name.
        req.user = decode;
        next();
    } catch (error) {
        next(error); // JsonWebTokenError / TokenExpiredError handled in errorHandler
    }
};

const isFarmer = async (req, res, next) => {
    try {
        if (req.user.role !== "farmer") {
            return next(new AppError("This is a protected route for farmers", 403));
        }
        next();
    } catch (error) {
        next(error);
    }
};

const isSpoc = async (req, res, next) => {
    try {
        if (req.user.role !== "spoc") {
            return next(new AppError("This is a protected route for SPOCs", 403));
        }
        next();
    } catch (error) {
        next(error);
    }
};

const isPowerPlant = async (req, res, next) => {
    try {
        if (req.user.role !== "power_plant") {
            return next(new AppError("This is a protected route for power plants", 403));
        }
        next();
    } catch (error) {
        next(error);
    }
};

export { auth, isFarmer, isSpoc, isPowerPlant };
