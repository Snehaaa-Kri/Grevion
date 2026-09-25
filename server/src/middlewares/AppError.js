class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode    = statusCode;
        this.isOperational = true; // known/expected error vs a programming bug
        Error.captureStackTrace(this, this.constructor);
    }
}

export default AppError;
