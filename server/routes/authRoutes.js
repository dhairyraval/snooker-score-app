import express from "express";

import { registerPlayer, loginPlayer, handleRefreshToken } from "../controllers/authControllers.js";
import { protect, isAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

// public routes
router.post("/login", loginPlayer);
router.post("/token", handleRefreshToken);

//protected routes
router.post("/register", protect, isAdmin, registerPlayer);

export default router;