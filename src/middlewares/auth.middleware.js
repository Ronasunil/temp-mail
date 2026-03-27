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
exports.AuthMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_config_1 = require("../configs/env.config");
const user_model_1 = require("../apis/users/user.model");
class AuthMiddleware {
    static protect(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let token;
                if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
                    token = req.headers.authorization.split(" ")[1];
                }
                if (!token) {
                    res.status(401).json({ status: "error", message: "You are not logged in. Please log in to get access." });
                    return;
                }
                // Verify token
                const decoded = jsonwebtoken_1.default.verify(token, env_config_1.ENV.JWT_SECRET);
                // Check if user still exists
                const user = yield user_model_1.User.findById(decoded.id);
                if (!user) {
                    res.status(401).json({ status: "error", message: "The user belonging to this token no longer exists." });
                    return;
                }
                // Grant access to protected route
                req.user = user;
                next();
            }
            catch (error) {
                if (error.name === "TokenExpiredError") {
                    res.status(401).json({ status: "error", code: "TOKEN_EXPIRED", message: "Your token has expired. Please refresh." });
                    return;
                }
                res.status(401).json({ status: "error", message: "Invalid token. Please log in again." });
            }
        });
    }
}
exports.AuthMiddleware = AuthMiddleware;
