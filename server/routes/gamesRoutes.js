import express from "express";

import { getAllGames, getGame, createGame, addGameEvent, updateGame, deleteGame } from "../controllers/gamesController.js";
import { isAdmin, protect } from "../middleware/authMiddleware.js";
import { checkNoOngoingGame } from "../middleware/gameGuard.js";

const router = express.Router();

router.get("/", getAllGames);     // get list of all games -- only used for admin dashboard
router.get("/:id", getGame);  // get a game's details (using game id)  
router.post("/", protect, checkNoOngoingGame, createGame);     // create a new game
router.post("/:id/event", addGameEvent);     // update a game (add event)
router.patch("/:id", updateGame);     // update a game's final score
router.delete("/:id", deleteGame);     // delete a game (using game id)

export default router;