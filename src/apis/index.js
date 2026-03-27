"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_route_1 = require("./auth/auth.route");
const router = (0, express_1.Router)();
// Auth routes
router.use("/auth", auth_route_1.authRouter);
exports.default = router;
