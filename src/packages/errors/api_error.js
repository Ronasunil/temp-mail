"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.APIError = exports.generateAPIError = void 0;
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/**
 * Represents an API error that can be handled.
 * @param {string} message - corresponding error message.
 * @param {number} statusCode - corresponding http status code.
 * @param {boolean} refreshTokenExpired - indicates if the refresh token is expired.
 */
class APIError extends Error {
    constructor(message, statusCode, data) {
        super(message);
        this.statusCode = statusCode;
        // this.errorCode = errorCode
        this.success = false;
        this.data = data;
    }
}
exports.APIError = APIError;
// type GenerateAPIErrorFn = (msg: string, errcode: {code: string, httpStatus: number}) => APIError;
/** Generates a custom api error with given message and status code. */
const generateAPIError = (msg, httpStatus, data) => {
    return new APIError(msg, httpStatus, data);
};
exports.generateAPIError = generateAPIError;
