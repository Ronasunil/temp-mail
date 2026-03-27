"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorMiddleware = void 0;
const api_error_1 = require("../packages/errors/api_error");
const env_config_1 = require("../configs/env.config");
const errorMiddleware = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.success = err.success || false;
    if (env_config_1.ENV.NODE_ENV === "development") {
        sendErrorDev(err, res);
    }
    else {
        sendErrorProd(err, res);
    }
};
exports.errorMiddleware = errorMiddleware;
const sendErrorDev = (err, res) => {
    res.status(err.statusCode).json({
        success: err.success,
        status: err.status,
        message: err.message,
        stack: err.stack,
        error: err,
    });
};
const sendErrorProd = (err, res) => {
    // If it's an APIError, it's considered operational/expected
    if (err instanceof api_error_1.APIError) {
        res.status(err.statusCode).json({
            success: err.success,
            message: err.message,
            data: err.data,
        });
    }
    else {
        // Programming or other unknown error: don't leak error details
        console.error("ERROR 💥", err);
        res.status(500).json({
            success: false,
            message: "Something went very wrong!",
        });
    }
};
