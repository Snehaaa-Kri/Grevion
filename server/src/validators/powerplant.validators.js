import { body, param } from "express-validator";

/**
 * Rules for POST /api/v1/powerplant/placeOrder/:spocId
 */
export const placeOrderValidators = [
    param("spocId")
        .isMongoId().withMessage("Invalid SPOC ID"),

    body("requestedParali")
        .notEmpty().withMessage("Requested parali is required")
        .isNumeric().withMessage("Requested parali must be a number")
        .isInt({ min: 1 }).withMessage("Requested parali must be at least 1 kg"),

    body("offeredPricePerTon")
        .notEmpty().withMessage("Offered price per ton is required")
        .isNumeric().withMessage("Offered price must be a number")
        .isFloat({ min: 0.01 }).withMessage("Offered price must be greater than 0"),

    body("totalPrice")
        .notEmpty().withMessage("Total price is required")
        .isNumeric().withMessage("Total price must be a number")
        .isFloat({ min: 0.01 }).withMessage("Total price must be greater than 0"),

    body("deliverWithin")
        .notEmpty().withMessage("Delivery time is required")
        .isNumeric().withMessage("Delivery time must be a number")
        .isInt({ min: 1 }).withMessage("Delivery time must be at least 1 day"),

    body("location")
        .trim()
        .notEmpty().withMessage("Location is required"),

    body("message")
        .trim()
        .notEmpty().withMessage("Message is required")
        .isLength({ max: 500 }).withMessage("Message cannot exceed 500 characters"),
];
