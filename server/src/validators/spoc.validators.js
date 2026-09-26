import { body, param } from "express-validator";

/**
 * Rules for POST /api/v1/spoc/sendFarmerOtp
 */
export const sendFarmerOtpValidators = [
    body("phone")
        .trim()
        .notEmpty().withMessage("Farmer phone number is required")
        .matches(/^(\+91)?\d{10}$/).withMessage("Enter a valid 10-digit phone number"),

    body("email")
        .trim()
        .notEmpty().withMessage("Farmer email is required")
        .isEmail().withMessage("Enter a valid email address")
        .normalizeEmail(),

    body("channel")
        .optional()
        .isIn(["sms", "email"]).withMessage("channel must be 'sms' or 'email'"),
];

/**
 * Rules for POST /api/v1/spoc/verifyFarmerOtp
 */
export const verifyFarmerOtpValidators = [
    body("phone")
        .trim()
        .notEmpty().withMessage("Phone number is required")
        .matches(/^(\+91)?\d{10}$/).withMessage("Enter a valid 10-digit phone number"),

    body("otp")
        .trim()
        .notEmpty().withMessage("OTP is required")
        .isLength({ min: 6, max: 6 }).withMessage("OTP must be exactly 6 characters"),
];

/**
 * Rules for POST /api/v1/spoc/addFarmer
 */
export const addFarmerValidators = [
    body("name")
        .trim()
        .notEmpty().withMessage("Farmer name is required")
        .isLength({ min: 2, max: 50 }).withMessage("Name must be between 2 and 50 characters"),

    body("phone")
        .trim()
        .notEmpty().withMessage("Phone number is required")
        .matches(/^(\+91)?\d{10}$/).withMessage("Enter a valid 10-digit phone number"),

    body("email")
        .trim()
        .notEmpty().withMessage("Email is required")
        .isEmail().withMessage("Enter a valid email address")
        .normalizeEmail(),

    body("fieldLocation")
        .trim()
        .notEmpty().withMessage("Field location is required"),

    body("totalParali")
        .notEmpty().withMessage("Total parali is required")
        .isNumeric().withMessage("Total parali must be a number")
        .isInt({ min: 1 }).withMessage("Total parali must be at least 1 kg"),
];

/**
 * Rules for PUT /api/v1/spoc/updateFarmer/:farmerId
 */
export const updateFarmerValidators = [
    param("farmerId")
        .isMongoId().withMessage("Invalid farmer ID"),

    body("name")
        .trim()
        .notEmpty().withMessage("Name is required")
        .isLength({ min: 2, max: 50 }).withMessage("Name must be between 2 and 50 characters"),

    body("phone")
        .trim()
        .notEmpty().withMessage("Phone number is required")
        .matches(/^(\+91)?\d{10}$/).withMessage("Enter a valid 10-digit phone number"),

    body("email")
        .trim()
        .notEmpty().withMessage("Email is required")
        .isEmail().withMessage("Enter a valid email address")
        .normalizeEmail(),

    body("totalParali")
        .notEmpty().withMessage("Total parali is required")
        .isNumeric().withMessage("Total parali must be a number")
        .isInt({ min: 0 }).withMessage("Total parali cannot be negative"),
];

/**
 * Rules for DELETE /api/v1/spoc/deleteFarmer/:farmerId
 */
export const deleteFarmerValidators = [
    param("farmerId")
        .isMongoId().withMessage("Invalid farmer ID"),
];
