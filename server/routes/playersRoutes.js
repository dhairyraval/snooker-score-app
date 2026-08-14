import express from "express";

import { getAllPlayers, getPlayer, updatePlayerPassword } from "../controllers/playersController.js";

const router = express.Router();

router.get("/", getAllPlayers);     // get list of all registered players
router.get("/:id", getPlayer);  // get player details (using player id)  
// router.post("/me/change-password", updatePlayerPassword);     // update password (auth using jwt)

export default router;