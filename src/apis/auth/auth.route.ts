import { Router } from "express";
import passport from "passport";
import { AuthController } from "./auth.controller";
import { AuthMiddleware } from "../../middlewares/auth.middleware";
import { AuthService } from "./auth.service";

const router = Router();

// Local Auth
router.post("/register", AuthController.register);
router.post("/login", AuthController.login);
router.post("/refresh", AuthController.refresh);
router.post("/logout", AuthMiddleware.protect, AuthController.logout);

// Google OAuth
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));
router.get(
  "/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: "/login" }),
  async (req, res) => {
    // Generate tokens for OAuth user
    const { accessToken, refreshToken } = await AuthService.generateTokens(req.user as any);

    // Set cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // Redirect to frontend with access token in query
    res.redirect(`${process.env.CLIENT_URL || "http://localhost:5173"}/oauth-callback?token=${accessToken}`);
  }
);


export const authRouter = router;
