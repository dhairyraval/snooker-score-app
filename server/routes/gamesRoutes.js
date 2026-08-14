import express from "express";

import { getAllGames, getGame, createGame, updateGame, updateScore, updateType, updateStatus, deleteGame } from "../controllers/gamesController.js";

const router = express.Router();

router.get("/", getAllGames);     // get list of all games
router.get("/:id", getGame);  // get a game's details (using game id)  
router.post("/", createGame);     // create a new game
router.put("/:id/event", updateGame);     // update a game (add event)
router.put("/:id/score", updateScore);     // update a game's final score
router.put("/:id/gameType", updateType);     // update a game's type
router.put("/:id/gameStatus", updateStatus);     // update a game's status
router.delete("/:id", deleteGame);     // delete a game (using game id)

export default router;