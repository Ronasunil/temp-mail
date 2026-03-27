"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class AppEnv {
}
AppEnv.SMTP_SERVER_PORT = +process.env.SMTP_SERVER_PORT;
exports.default = AppEnv;
