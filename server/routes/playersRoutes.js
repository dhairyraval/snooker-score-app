import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { getAllPlayers, getMyDetails, getPlayer, getPlayerStats, updateProfile } from "../controllers/playersController.js";


const router = express.Router();

router.get("/", protect, getAllPlayers);     // get list of all registered players
router.get("/:id", protect, getPlayer);      // get player info (name, avatar, winStreak, lean query)
router.get("/me", protect, getMyDetails);    // get all of current player's details
router.patch("/me", protect, updateProfile);     // update player profile details (username)
router.get("/:id/stats", protect, getPlayerStats)    // get detailed player stats

export default router;