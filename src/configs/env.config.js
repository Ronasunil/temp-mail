"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ENV = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.join(process.cwd(), ".env") });
class ENV {
}
exports.ENV = ENV;
ENV.PORT = process.env.PORT || 3000;
ENV.MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/mailloop";
ENV.NODE_ENV = process.env.NODE_ENV || "development";
ENV.JWT_SECRET = process.env.JWT_SECRET || "default_jwt_secret";
ENV.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "default_refresh_secret";
ENV.SMTP_DOMAIN = process.env.SMTP_DOMAIN || "localhost";
ENV.ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",") : ["*"];
