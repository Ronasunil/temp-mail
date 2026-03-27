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
exports.AuthService = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const user_model_1 = require("../users/user.model");
const env_config_1 = require("../../configs/env.config");
class AuthService {
    static generateTokens(user) {
        return __awaiter(this, void 0, void 0, function* () {
            const accessToken = jsonwebtoken_1.default.sign({ id: user._id, email: user.email }, env_config_1.ENV.JWT_SECRET, { expiresIn: "15m" });
            const refreshToken = jsonwebtoken_1.default.sign({ id: user._id }, env_config_1.ENV.JWT_REFRESH_SECRET, { expiresIn: "7d" });
            // Update user with new refresh token
            user.refreshToken = refreshToken;
            yield user.save();
            return { accessToken, refreshToken };
        });
    }
    static verifyRefreshToken(token) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const decoded = jsonwebtoken_1.default.verify(token, env_config_1.ENV.JWT_REFRESH_SECRET);
                const user = yield user_model_1.User.findById(decoded.id);
                if (!user || user.refreshToken !== token) {
                    // Token reuse or invalid token detected
                    if (user) {
                        user.refreshToken = undefined;
                        yield user.save();
                    }
                    return null;
                }
                return user;
            }
            catch (error) {
                return null;
            }
        });
    }
    static logout(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            yield user_model_1.User.findByIdAndUpdate(userId, { refreshToken: undefined });
        });
    }
}
exports.AuthService = AuthService;
