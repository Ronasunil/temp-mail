import { Server as HttpServer } from "http";
import { App } from "./app";
import { ENV } from "./configs/env.config";
import { Database } from "./configs/database";
import { PassportConfig } from "./configs/passport.config";

class Server {
  private httpServer?: HttpServer;

  public async start(): Promise<void> {
    try {
      // Connect to Database
      await Database.connect();

      // Initialize Passport
      PassportConfig.init();

      // Initialize App
      const appInstance = new App().app;
      
      // Start HTTP Server
      this.httpServer = appInstance.listen(ENV.PORT, () => {
        console.log(`Server is running on port ${ENV.PORT} in ${ENV.NODE_ENV} mode`);
      });

      // Handle graceful shutdown
      this.setupGracefulShutdown();
    } catch (error) {
      console.error("Critical error during server startup:", error);
      process.exit(1);
    }
  }

  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      console.log(`\n${signal} received. Starting graceful shutdown...`);
      
      if (this.httpServer) {
        this.httpServer.close(async () => {
          console.log("HTTP server closed.");
          await Database.disconnect();
          process.exit(0);
        });
      } else {
        await Database.disconnect();
        process.exit(0);
      }
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  }
}

new Server().start();
