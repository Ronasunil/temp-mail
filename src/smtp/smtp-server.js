"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const smtp_server_1 = require("smtp-server");
const env_config_1 = __importDefault(require("../packages/shared/config/env.config"));
const smtpServer = new smtp_server_1.SMTPServer();
class SmtpServer {
    rcptoHandler() {
        return (address, session, callback) => {
            const receiveraddress = address.address;
            if (!receiveraddress.endsWith("mailloop.online"))
                // TODO convert to AppError
                throw new Error("Invalid recipient address");
            callback();
        };
    }
    config() {
        const smtpServerOpt = {
            authOptional: true,
            onRcptTo: this.rcptoHandler(),
        };
    }
    init() {
        smtpServer.listen(env_config_1.default.SMTP_SERVER_PORT, () => {
            this.config();
            console.info(`SMTP Server is listening on port ${env_config_1.default.SMTP_SERVER_PORT}`);
        });
    }
}
const smtpServerInstance = new SmtpServer();
smtpServerInstance.init();
