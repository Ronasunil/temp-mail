import express, { Application, json, urlencoded } from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import passport from "passport";
import { ENV } from "./configs/env.config";
import { errorMiddleware } from "./middlewares/error.middleware";
import apiRoutes from "./apis";

export class App {
  public app: Application;

  constructor() {
    this.app = express();
    this.setMiddlewares();
    this.setRoutes();
    this.setErrorHandler();
  }

  private setMiddlewares(): void {
    this.app.use(helmet());
    this.app.use(
      cors({
        origin: ENV.ALLOWED_ORIGINS,
        credentials: true,
      })
    );
    this.app.use(json());
    this.app.use(urlencoded({ extended: true }));
    this.app.use(cookieParser());
    this.app.use(passport.initialize());
  }

  private setRoutes(): void {
    this.app.get("/health", (req, res) => {
      res.status(200).json({ status: "success", message: "Server is healthy" });
    });

    this.app.use("/api/v1", apiRoutes);
  }

  private setErrorHandler(): void {
    this.app.use(errorMiddleware);
  }
}
