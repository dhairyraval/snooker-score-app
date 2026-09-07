import mongoose from "mongoose";

import { GameModel } from "../models/GameModel.js";

export async function checkNoOngoingGame(req, res, next) {

  try {
    //check if given player has any games with status === "ONGOING"
    const playerId = req.player?._id

    if (!playerId) {
      return res.status(401).json({ message: "Unauthorized: User identification missing." });
    }

    const activeGame = await GameModel.findOne({
      status: { $in: ["ONGOING", "WAITING"] },
      players: {
        $elemMatch: {
          player: playerId,
          status: "ACTIVE"
        }
      }
    })
      .select("_id status")
      .lean();
    if (activeGame) {
      return res.status(409).json({
        message: 'You already have an active game in progress.',
        activeGameId: activeGame._id
      });
    }
    next();
  } catch (error) {
    next(error);
  }
}

export async function canModifyGame(req, res, next) {
  try {
    const player = req.player;
    const givenGameId = req.params?.id;

    if (!player) {
      return res.status(401).json({ message: "Unauthorized: User identification missing." })
    };

    if (!mongoose.Types.ObjectId.isValid(givenGameId)) {
      return res.status(400).json({ message: "Bad Request: Invalid game ID format." });
    }

    const game = await GameModel.findById(givenGameId);
    if (!game) {
      return res.status(404).json({ message: "Error: Invalid game id" });
    }

    //check if player is involved in-game
    const inGame = game.players.some(
      p => (p.player && p.player.toString() === player._id.toString() && p.status === "ACTIVE")
    );

    const isAdmin = player.role === "admin"
    const isHost = game.host?.toString() === player._id.toString();

    if (!inGame && !isAdmin && !isHost) {
      return res.status(403).json({ message: "Unauthorized: Player not involved in game" })
    }

    req.game = game;
    next();

  } catch (error) {
    next(error);
  }
}