import { Router } from "express";
import { authRouter } from "./auth/auth.route";

const router = Router();

// Auth routes
router.use("/auth", authRouter);

export default router;
