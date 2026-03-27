import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { ENV } from "../configs/env.config";
import { User } from "../apis/users/user.model";

export class AuthMiddleware {
  public static async protect(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      let token: string | undefined;

      if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
        token = req.headers.authorization.split(" ")[1];
      }

      if (!token) {
        res.status(401).json({ status: "error", message: "You are not logged in. Please log in to get access." });
        return;
      }

      // Verify token
      const decoded = jwt.verify(token, ENV.JWT_SECRET) as { id: string };

      // Check if user still exists
      const user = await User.findById(decoded.id);
      if (!user) {
        res.status(401).json({ status: "error", message: "The user belonging to this token no longer exists." });
        return;
      }

      // Grant access to protected route
      (req as any).user = user;
      next();
    } catch (error: any) {
      if (error.name === "TokenExpiredError") {
        res.status(401).json({ status: "error", code: "TOKEN_EXPIRED", message: "Your token has expired. Please refresh." });
        return;
      }
      res.status(401).json({ status: "error", message: "Invalid token. Please log in again." });
    }
  }
}
