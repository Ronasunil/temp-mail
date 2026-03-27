"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.App = void 0;
const express_1 = __importStar(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const passport_1 = __importDefault(require("passport"));
const env_config_1 = require("./configs/env.config");
const error_middleware_1 = require("./middlewares/error.middleware");
const apis_1 = __importDefault(require("./apis"));
class App {
    constructor() {
        this.app = (0, express_1.default)();
        this.setMiddlewares();
        this.setRoutes();
        this.setErrorHandler();
    }
    setMiddlewares() {
        this.app.use((0, helmet_1.default)());
        this.app.use((0, cors_1.default)({
            origin: env_config_1.ENV.ALLOWED_ORIGINS,
            credentials: true,
        }));
        this.app.use((0, express_1.json)());
        this.app.use((0, express_1.urlencoded)({ extended: true }));
        this.app.use((0, cookie_parser_1.default)());
        this.app.use(passport_1.default.initialize());
    }
    setRoutes() {
        this.app.get("/health", (req, res) => {
            res.status(200).json({ status: "success", message: "Server is healthy" });
        });
        this.app.use("/api/v1", apis_1.default);
    }
    setErrorHandler() {
        this.app.use(error_middleware_1.errorMiddleware);
    }
}
exports.App = App;
