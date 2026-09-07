import express from "express";

import { getAllGames, getGame, createGame, addGuest, addPlayer, joinGame, startGame, addGameEvent, undoGameEvent, updateFinalScores, deleteGame } from "../controllers/gamesController.js";
import { protect, isAdmin, isHostOrAdmin } from "../middleware/authMiddleware.js";
import { checkNoOngoingGame, canModifyGame } from "../middleware/gameGuard.js";

const router = express.Router();

router.get("/", protect, isAdmin, getAllGames);     // get list of all games -- only used for admin dashboard
router.get("/:id", protect, getGame);  // get a game's details (using game id)  
router.post("/", protect, checkNoOngoingGame, createGame);     // create a new game
router.post("/:id/add-guest", protect, isHostOrAdmin, addGuest); // host/admin adds guest
router.post("/:id/add-player", protect, isHostOrAdmin, addPlayer); // host/admin adds player
router.post("/:id/join", protect, checkNoOngoingGame, joinGame); // player joins existing game directly
router.post("/:id/event", protect, canModifyGame, addGameEvent);     // update a game (add event)
router.post("/:id/undo", protect, canModifyGame, undoGameEvent); // remove last game event
router.patch("/:id/start", protect, isHostOrAdmin, startGame); // start game (set final order + notify all joined players)

// router.patch("/:id/leave-game", protect, canModifyGame, leaveGame); // handle a player leaving ongoing game

router.patch("/:id", updateFinalScores);     // update a game's final score
router.delete("/:id", deleteGame);     // delete a game (using game id)

export default router;