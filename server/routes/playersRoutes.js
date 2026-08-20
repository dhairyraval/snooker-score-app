import express from "express";

import { getAllPlayers, getPlayer } from "../controllers/playersController.js";

const router = express.Router();

router.get("/", getAllPlayers);     // get list of all registered players
router.get("/:id", getPlayer);  // get player details (using player id)

export default router;