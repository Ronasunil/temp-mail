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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const user_model_1 = require("../users/user.model");
const auth_service_1 = require("./auth.service");
class AuthController {
    static register(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { name, email, password } = req.body;
                // Check if user exists
                const existingUser = yield user_model_1.User.findOne({ email });
                if (existingUser) {
                    res.status(400).json({ status: "error", message: "User already exists" });
                    return;
                }
                // Create user
                const user = new user_model_1.User({ name, email, password, provider: "local" });
                yield user.save();
                const { accessToken, refreshToken } = yield auth_service_1.AuthService.generateTokens(user);
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
            }
            catch (error) {
                next(error);
            }
        });
    }
    static login(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { email, password } = req.body;
                const user = yield user_model_1.User.findOne({ email, provider: "local" });
                if (!user || !(yield user.comparePassword(password))) {
                    res.status(401).json({ status: "error", message: "Invalid email or password" });
                    return;
                }
                const { accessToken, refreshToken } = yield auth_service_1.AuthService.generateTokens(user);
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
            }
            catch (error) {
                next(error);
            }
        });
    }
    static refresh(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const token = req.cookies.refreshToken;
                if (!token) {
                    res.status(401).json({ status: "error", message: "No refresh token provided" });
                    return;
                }
                const user = yield auth_service_1.AuthService.verifyRefreshToken(token);
                if (!user) {
                    res.clearCookie("refreshToken");
                    res.status(401).json({ status: "error", message: "Invalid or expired refresh token" });
                    return;
                }
                const { accessToken, refreshToken } = yield auth_service_1.AuthService.generateTokens(user);
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
            }
            catch (error) {
                next(error);
            }
        });
    }
    static logout(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (userId) {
                    yield auth_service_1.AuthService.logout(userId);
                }
                res.clearCookie("refreshToken");
                res.status(200).json({ status: "success", message: "Logged out successfully" });
            }
            catch (error) {
                next(error);
            }
        });
    }
}
exports.AuthController = AuthController;
