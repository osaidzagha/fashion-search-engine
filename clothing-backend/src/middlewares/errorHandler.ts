import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // 1. Catch Zod Validation Errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: "Invalid request data",
      // Maps the ugly Zod array into clean, readable field errors
      errors: err.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      })),
    });
  }

  // 2. Catch Standard/Database Errors
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  // Only log 500 crashes to the terminal to keep logs clean
  if (statusCode === 500) {
    console.error(`[🔥 FATAL ERROR]`, err);
  }

  // 3. Secure Response
  res.status(statusCode).json({
    success: false,
    message: message,
    // Automatically hide stack traces in production so hackers can't see your folder structure
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
};
