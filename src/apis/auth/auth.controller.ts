import { Request, Response, NextFunction } from "express";
import { User } from "../users/user.model";
import { AuthService } from "./auth.service";

export class AuthController {
  public static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, email, password } = req.body;

      // Check if user exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        res.status(400).json({ status: "error", message: "User already exists" });
        return;
      }

      // Create user
      const user = new User({ name, email, password, provider: "local" });
      await user.save();

      const { accessToken, refreshToken } = await AuthService.generateTokens(user);

      // Set cookie
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.status(201).json({
        status: "success",
        data: {
          user: { id: user._id, name: user.name, email: user.email },
          accessToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  public static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;

      const user = await User.findOne({ email, provider: "local" });
      if (!user || !(await user.comparePassword(password))) {
        res.status(401).json({ status: "error", message: "Invalid email or password" });
        return;
      }

      const { accessToken, refreshToken } = await AuthService.generateTokens(user);

      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.status(200).json({
        status: "success",
        data: {
          user: { id: user._id, name: user.name, email: user.email },
          accessToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  public static async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = req.cookies.refreshToken;
      if (!token) {
        res.status(401).json({ status: "error", message: "No refresh token provided" });
        return;
      }

      const user = await AuthService.verifyRefreshToken(token);
      if (!user) {
        res.clearCookie("refreshToken");
        res.status(401).json({ status: "error", message: "Invalid or expired refresh token" });
        return;
      }

      const { accessToken, refreshToken } = await AuthService.generateTokens(user);

      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.status(200).json({
        status: "success",
        data: { accessToken },
      });
    } catch (error) {
      next(error);
    }
  }

  public static async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (userId) {
        await AuthService.logout(userId);
      }
      res.clearCookie("refreshToken");
      res.status(200).json({ status: "success", message: "Logged out successfully" });
    } catch (error) {
      next(error);
    }
  }
}
