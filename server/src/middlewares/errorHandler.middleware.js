const errorHandler = (err, req, res, next) => {
    let statusCode = err.statusCode || 500;
    let message    = err.message    || "Internal Server Error";

    // Body-parser: malformed JSON in request body
    if (err.type === "entity.parse.failed") {
        statusCode = 400;
        message    = "Invalid JSON in request body";
    }

    // Mongoose: malformed ObjectId in URL params (e.g. invalid farmerId)
    if (err.name === "CastError") {
        statusCode = 400;
        message    = `Invalid ${err.path}: ${err.value}`;
    }

    // Mongoose: duplicate key (e.g. email already registered)
    if (err.code === 11000) {
        statusCode = 400;
        const field = Object.keys(err.keyValue)[0];
        message    = `${field} already exists`;
    }

    // Mongoose: schema validation failed (required field missing, enum mismatch)
    if (err.name === "ValidationError") {
        statusCode = 400;
        message    = Object.values(err.errors).map(e => e.message).join(", ");
    }

    // JWT: token lifetime expired
    if (err.name === "TokenExpiredError") {
        statusCode = 401;
        message    = "Session expired, please login again";
    }

    // JWT: token signature invalid or malformed
    if (err.name === "JsonWebTokenError") {
        statusCode = 401;
        message    = "Invalid token, please login again";
    }

    // Log 500s loudly — these are bugs, not expected failures
    if (statusCode === 500) {
        console.error(`[ERROR][${req.id}]`, err.stack);
    }

    res.status(statusCode).json({
        success: false,
        message,
        requestId: req.id,
        // only expose stack trace in development — never in production
        ...(process.env.NODE_ENV === "development" && { stack: err.stack })
    });
};

export default errorHandler;
