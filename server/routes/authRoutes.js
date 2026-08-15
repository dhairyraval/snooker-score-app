import express from "express";

import { registerPlayer, loginPlayer, handleRefreshToken, changePassword, changePasswordAdmin, logout, logoutAll } from "../controllers/authControllers.js";
import { protect, isAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

// public routes
router.post("/login", loginPlayer);
router.post("/token", handleRefreshToken);
router.post("/logout", logout)

//protected routes
router.post("/register", protect, isAdmin, registerPlayer);
router.post("/change-password", protect, changePassword);
router.post("/change-password-admin", protect, isAdmin, changePasswordAdmin);
router.post("/logout-all", protect, logoutAll);

export default router;