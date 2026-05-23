import { Request, Response, NextFunction } from "express";
import { AnyZodObject } from "zod";

export const validate =
  (schema: AnyZodObject) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Parses body, query, and params against your schema
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      return next(); // Data is safe, proceed to controller
    } catch (error) {
      // Validation failed, throw it to the Global Error Handler
      return next(error);
    }
  };
