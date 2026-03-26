import mongoose from "mongoose";
import { ENV } from "./env.config";

export class Database {
  public static async connect(): Promise<void> {
    try {
      await mongoose.connect(ENV.MONGO_URI);
      console.log("Successfully connected to MongoDB");
    } catch (error) {
      console.error("Error connecting to MongoDB:", error);
      process.exit(1);
    }
  }

  public static async disconnect(): Promise<void> {
    try {
      await mongoose.disconnect();
      console.log("Disconnected from MongoDB");
    } catch (error) {
      console.error("Error disconnecting from MongoDB:", error);
    }
  }
}
