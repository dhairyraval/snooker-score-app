import jwt from "jsonwebtoken";
import mongoose from "mongoose";

import { PlayerModel } from "../models/PlayerModel.js";
import { GameModel } from "../models/GameModel.js";

export async function protect(req, res, next) {
  const authHeader = req.headers['authorization'];
  const authToken = authHeader && authHeader.split(' ')[1];
  if (authToken == null) { return res.sendStatus(401); }

  try {
    const decodedPayload = jwt.verify(authToken, process.env.JWT_SECRET);
    // check if player exists (checks by claimed player._id)
    const player = await PlayerModel.findById(decodedPayload.sub);
    if (!player) {
      return res.status(401).json({ message: "User not found." });
    }

    // check for recent password changes
    if (player.passwordChangedAt) {
      const changedTimestamp = parseInt(player.passwordChangedAt.getTime() / 1000, 10);

      // decodedPayload.iat is in seconds
      if (decodedPayload.iat < changedTimestamp) {
        return res.status(401).json({
          message: "Password was recently changed. Please log in again."
        });
      }
    }

    req.user = decodedPayload; // Token payload ({ sub, role, iat })
    req.player = player; // mongoose document
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token has expired. Please log in again." });
    }
    return res.status(401).json({ message: "Invalid token.", error: error.message });
  }
}

export async function isAdmin(req, res, next) {

  try {
    //check player is admin
    if (req.player.role !== "admin") {
      return res.status(403).json({
        message: "Forbidden: You do not have permission to perform this action."
      });
    }
    next();
  } catch (error) {
    next(error);
  }
};

export async function isHostOrAdmin(req, res, next) {
  try {
    const gameId = req.params?.id;
    const player = req.player

    const game = await GameModel.findById(gameId);
    if(!game){
      return res.status(404).json({ message: "Game not found." });
    }

    const isHost = game.host.toString() === player._id.toString();
    const isAdmin = player.role === "admin";

    // if reqest is not made either by host or admin -- error
    if (!isHost && !isAdmin) {
      return res.status(403).json({
        message: "Forbidden: You do not have permission to perform this action."
      });
    }
    req.game = game;
    next();

  } catch (error) {
    next(error);
  }
}

export function generateAccessToken(player) {
  // TODO: update expiry date before shipping to prod
  return jwt.sign({ sub: player._id, name: player.name, role: player.role }, process.env.JWT_SECRET, { expiresIn: "7d" });
}