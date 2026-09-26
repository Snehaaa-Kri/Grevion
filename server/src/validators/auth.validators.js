import { body } from "express-validator";

/**
 * Rules for POST /api/v1/auth/sendotp
 */
export const sendOtpValidators = [
    body("email")
        .trim()
        .notEmpty().withMessage("Email is required")
        .isEmail().withMessage("Enter a valid email address")
        .normalizeEmail(),
];

/**
 * Rules for POST /api/v1/auth/signup
 */
export const signupValidators = [
    body("name")
        .trim()
        .notEmpty().withMessage("Name is required")
        .isLength({ min: 2, max: 50 }).withMessage("Name must be between 2 and 50 characters"),

    body("email")
        .trim()
        .notEmpty().withMessage("Email is required")
        .isEmail().withMessage("Enter a valid email address")
        .normalizeEmail(),

    body("password")
        .notEmpty().withMessage("Password is required")
        .isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),

    body("phone")
        .trim()
        .notEmpty().withMessage("Phone number is required")
        .matches(/^\d{10}$/).withMessage("Phone number must be exactly 10 digits"),

    body("location")
        .trim()
        .notEmpty().withMessage("Location is required"),

    body("role")
        .notEmpty().withMessage("Role is required")
        .isIn(["spoc", "power_plant"]).withMessage("Role must be 'spoc' or 'power_plant'"),

    body("otp")
        .trim()
        .notEmpty().withMessage("OTP is required")
        .isLength({ min: 6, max: 6 }).withMessage("OTP must be 6 digits")
        .isNumeric().withMessage("OTP must be numeric"),
];

/**
 * Rules for POST /api/v1/auth/login
 */
export const loginValidators = [
    body("email")
        .trim()
        .notEmpty().withMessage("Email is required")
        .isEmail().withMessage("Enter a valid email address")
        .normalizeEmail(),

    body("password")
        .notEmpty().withMessage("Password is required"),
];
