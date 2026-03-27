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
exports.User = void 0;
const mongoose_1 = require("mongoose");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const userSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        index: true,
    },
    password: {
        type: String,
        required: function () {
            return this.provider === "local";
        },
    },
    provider: {
        type: String,
        enum: ["local", "google"],
        default: "local",
    },
    providerId: { type: String },
    refreshToken: { type: String },
    loginFailures: { type: Number, default: 0 },
    lockedUntil: { type: Date },
}, { timestamps: true });
// Hash password before saving
userSchema.pre("save", function () {
    return __awaiter(this, void 0, void 0, function* () {
        if (!this.isModified("password") || !this.password) {
            return;
        }
        try {
            const salt = yield bcryptjs_1.default.genSalt(12);
            this.password = yield bcryptjs_1.default.hash(this.password, salt);
        }
        catch (error) {
            throw error;
        }
    });
});
// Compare password method
userSchema.methods.comparePassword = function (password) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!this.password)
            return false;
        return bcryptjs_1.default.compare(password, this.password);
    });
};
exports.User = (0, mongoose_1.model)("User", userSchema);
