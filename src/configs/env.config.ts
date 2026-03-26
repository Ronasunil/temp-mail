import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env") });

export class ENV {
  public static readonly PORT = process.env.PORT || 3000;
  public static readonly MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/mailloop";
  public static readonly NODE_ENV = process.env.NODE_ENV || "development";
  public static readonly JWT_SECRET = process.env.JWT_SECRET || "default_jwt_secret";
  public static readonly JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "default_refresh_secret";
  public static readonly SMTP_DOMAIN = process.env.SMTP_DOMAIN || "localhost";
  public static readonly ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",") : ["*"];
}
