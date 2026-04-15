import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { UserModel, IUser } from "../models/User";

// TypeScript trick: We need to tell Express that 'req' might contain a 'user'
export interface AuthRequest extends Request {
  user?: IUser;
}

interface JwtPayload {
  id: string;
  role: string;
}

// Bouncer 1: Are you logged in?
export const protect = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  let token;

  // 1. Check if the request has an authorization header that starts with "Bearer"
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      // 2. Extract the token (Looks like: "Bearer eYJhbGci...")
      token = req.headers.authorization.split(" ")[1];

      // 3. Decode the token using our secret key
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET as string,
      ) as JwtPayload;

      // 4. Find the user in the database (but DO NOT grab their password)
      const user = await UserModel.findById(decoded.id).select("-password");

      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      // 5. Attach the user to the request so the next function can use it
      req.user = user;

      // 6. Let them pass!
      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: "Not authorized, token failed" });
    }
  }

  if (!token) {
    res.status(401).json({ message: "Not authorized, no token" });
  }
};

// Bouncer 2: Are you an Admin? (Must be used AFTER protect)
export const admin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user && req.user.role === "admin") {
    // You are an admin! Go right ahead.
    next();
  } else {
    // You are logged in, but you are a normal user. Access Denied.
    res.status(403).json({ message: "Not authorized as an admin" });
  }
};
