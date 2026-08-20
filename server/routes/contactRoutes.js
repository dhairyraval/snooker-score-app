import express from "express";
import { contactAdmin } from "../controllers/contactController.js";
import { contactRateLimiter } from "../middleware/rateLimiter.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// protected and rate limited
router.post("/", protect, contactRateLimiter, contactAdmin);     // contact & log for bug reports

export default router;