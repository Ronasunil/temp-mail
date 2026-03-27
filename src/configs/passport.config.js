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
exports.PassportConfig = void 0;
const passport_1 = __importDefault(require("passport"));
const passport_google_oauth20_1 = require("passport-google-oauth20");
const user_model_1 = require("../apis/users/user.model");
class PassportConfig {
    static init() {
        passport_1.default.serializeUser((user, done) => {
            done(null, user.id);
        });
        passport_1.default.deserializeUser((id, done) => __awaiter(this, void 0, void 0, function* () {
            try {
                const user = yield user_model_1.User.findById(id);
                done(null, user);
            }
            catch (error) {
                done(error, null);
            }
        }));
        // Google Strategy
        if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
            passport_1.default.use(new passport_google_oauth20_1.Strategy({
                clientID: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                callbackURL: "/auth/google/callback",
            }, (accessToken, refreshToken, profile, done) => __awaiter(this, void 0, void 0, function* () {
                try {
                    const user = yield PassportConfig.upsertUser(profile, "google");
                    done(null, user);
                }
                catch (error) {
                    done(error, undefined);
                }
            })));
        }
    }
    static upsertUser(profile, provider) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const email = ((_b = (_a = profile.emails) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.value) || `${profile.username}@${provider}.com`;
            const name = profile.displayName || profile.username || "User";
            let user = yield user_model_1.User.findOne({ email });
            if (user) {
                // Link provider if not already linked
                if (user.provider !== provider) {
                    user.provider = provider;
                    user.providerId = profile.id;
                    yield user.save();
                }
            }
            else {
                user = yield user_model_1.User.create({
                    name,
                    email,
                    provider,
                    providerId: profile.id,
                });
            }
            return user;
        });
    }
}
exports.PassportConfig = PassportConfig;
