"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const passport_1 = __importDefault(require("passport"));
const auth_controller_1 = require("./auth.controller");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const auth_service_1 = require("./auth.service");
const router = (0, express_1.Router)();
// Local Auth
router.post("/register", auth_controller_1.AuthController.register);
router.post("/login", auth_controller_1.AuthController.login);
router.post("/refresh", auth_controller_1.AuthController.refresh);
router.post("/logout", auth_middleware_1.AuthMiddleware.protect, auth_controller_1.AuthController.logout);
// Google OAuth
router.get("/google", passport_1.default.authenticate("google", { scope: ["profile", "email"] }));
router.get("/google/callback", passport_1.default.authenticate("google", { session: false, failureRedirect: "/login" }), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // Generate tokens for OAuth user
    const { accessToken, refreshToken } = yield auth_service_1.AuthService.generateTokens(req.user);
    // Set cookie
    res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    // Redirect to frontend with access token in query
    res.redirect(`${process.env.CLIENT_URL || "http://localhost:5173"}/oauth-callback?token=${accessToken}`);
}));
exports.authRouter = router;
