/* eslint-disable @typescript-eslint/no-unsafe-argument */
/**
 * Represents an API error that can be handled.
 * @param {string} message - corresponding error message.
 * @param {number} statusCode - corresponding http status code.
 * @param {boolean} refreshTokenExpired - indicates if the refresh token is expired.
 */
class APIError extends Error {
  statusCode: number;
  // errorCode: string
  success: boolean;
  data: any;
  constructor(message: string, statusCode: number, data?: any) {
    super(message);
    this.statusCode = statusCode;
    // this.errorCode = errorCode
    this.success = false;
    this.data = data;
  }
}
// type GenerateAPIErrorFn = (msg: string, errcode: {code: string, httpStatus: number}) => APIError;

/** Generates a custom api error with given message and status code. */
const generateAPIError = (
  msg: string,
  httpStatus: number,
  data?: any,
): APIError => {
  return new APIError(msg, httpStatus, data);
};

export { generateAPIError, APIError };
