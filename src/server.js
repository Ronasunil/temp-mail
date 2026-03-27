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
const app_1 = require("./app");
const env_config_1 = require("./configs/env.config");
const database_1 = require("./configs/database");
const passport_config_1 = require("./configs/passport.config");
class Server {
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Connect to Database
                yield database_1.Database.connect();
                // Initialize Passport
                passport_config_1.PassportConfig.init();
                // Initialize App
                const appInstance = new app_1.App().app;
                // Start HTTP Server
                this.httpServer = appInstance.listen(env_config_1.ENV.PORT, () => {
                    console.log(`Server is running on port ${env_config_1.ENV.PORT} in ${env_config_1.ENV.NODE_ENV} mode`);
                });
                // Handle graceful shutdown
                this.setupGracefulShutdown();
            }
            catch (error) {
                console.error("Critical error during server startup:", error);
                process.exit(1);
            }
        });
    }
    setupGracefulShutdown() {
        const shutdown = (signal) => __awaiter(this, void 0, void 0, function* () {
            console.log(`\n${signal} received. Starting graceful shutdown...`);
            if (this.httpServer) {
                this.httpServer.close(() => __awaiter(this, void 0, void 0, function* () {
                    console.log("HTTP server closed.");
                    yield database_1.Database.disconnect();
                    process.exit(0);
                }));
            }
            else {
                yield database_1.Database.disconnect();
                process.exit(0);
            }
        });
        process.on("SIGTERM", () => shutdown("SIGTERM"));
        process.on("SIGINT", () => shutdown("SIGINT"));
    }
}
new Server().start();
