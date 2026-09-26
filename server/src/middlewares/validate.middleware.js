import { validationResult } from "express-validator";

/**
 * validate — shared validation runner
 *
 * Place this after your express-validator rule arrays in any route.
 * It collects all validation errors and forwards them as a single
 * 400 AppError so the centralized errorHandler formats the response.
 *
 * Usage in a route file:
 *   router.post("/signup", signupValidators, validate, signUp);
 */
const validate = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        // Collect every failing field into one readable message.
        const message = errors
            .array()
            .map((e) => e.msg)
            .join(", ");

        // Use the same shape as AppError so errorHandler handles it uniformly.
        const err       = new Error(message);
        err.statusCode  = 400;
        err.isOperational = true;
        return next(err);
    }

    next();
};

export default validate;
