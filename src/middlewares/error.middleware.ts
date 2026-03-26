import { Request, Response, NextFunction } from "express";
import { APIError } from "../packages/errors/api_error";
import { ENV } from "../configs/env.config";

export const errorMiddleware = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  err.statusCode = err.statusCode || 500;
  err.success = err.success || false;

  if (ENV.NODE_ENV === "development") {
    sendErrorDev(err, res);
  } else {
    sendErrorProd(err, res);
  }
};

const sendErrorDev = (err: any, res: Response) => {
  res.status(err.statusCode).json({
    success: err.success,
    status: err.status,
    message: err.message,
    stack: err.stack,
    error: err,
  });
};

const sendErrorProd = (err: any, res: Response) => {
  // If it's an APIError, it's considered operational/expected
  if (err instanceof APIError) {
    res.status(err.statusCode).json({
      success: err.success,
      message: err.message,
      data: err.data,
    });
  } else {
    // Programming or other unknown error: don't leak error details
    console.error("ERROR 💥", err);
    res.status(500).json({
      success: false,
      message: "Something went very wrong!",
    });
  }
};

