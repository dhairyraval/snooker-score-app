import mongoose from "mongoose";

import { GameModel } from "../models/GameModel.js";
import { PlayerModel } from "../models/PlayerModel.js";

export async function getAllGames(req, res) {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // dynamic filter obj
    const filter = {}

    // text search filter using regex + options
    if (search && search.trim() !== '') {
      filter.name = { $regex: search.trim(), $options: 'i' };
    }

    // sorting & pagination logic
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
    const skip = (page - 1) * limit;

    const [games, gameCount] = await Promise.all([
      GameModel.find(filter).lean().sort(sort).skip(skip).limit(limit),
      GameModel.countDocuments(filter)
    ]);

    res.status(200).json({
      gameList: games,
      pagination: {
        totalItems: gameCount,
        totalPages: Math.ceil(gameCount / limit),
        currPage: page,
        limit: limit
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function getGame(req, res) {
  try {
    const game = await GameModel.findById(req.params?.id).lean();
    if (!game) return res.status(404).json({ message: "Game with given id not found" });
    res.status(200).json({ success: true, game });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function createGame(req, res) {
  // get name from req.body
  // get host from req.player._id
  try {
    const { gameName, visibility = "PUBLIC", registeredPlayerIds = [], guestNames = [] } = req.body;
    if (!gameName || gameName.trim().length === 0) return res.status(400).json({ message: "Error: Need to provide game name" });
    const player = req.player;
    if (!player) return res.status(404).json({ message: "Error 404: Player not found" });

    // newGamePlayers - an array containting objects of gamePlayerSchema
    // first player is always the host - added directly
    const newGamePlayers = [
      {
        player: player._id,
        displayName: player.name,
        isGuest: false,
        status: 'ACTIVE'
      }
    ];

    const hostIdStr = player._id.toString();

    // validate and add other registered players
    if (Array.isArray(registeredPlayerIds) && registeredPlayerIds.length > 0) {
      const validIds = [
        ...new Set(
          registeredPlayerIds
            .map((id) => (typeof id === "string" ? id.trim() : ""))
            .filter((id) => mongoose.Types.ObjectId.isValid(id) && id !== hostIdStr)
        )
      ];

      if (validIds.length > 0) {
        const registeredPlayers = await PlayerModel.find({
          _id: { $in: validIds }
        }).select("_id name").lean();

        const formattedRegisteredPlayers = registeredPlayers.map((player) => ({
          player: player._id,
          displayName: player.name,
          isGuest: false,
          status: "ACTIVE"
        }));

        newGamePlayers.push(...formattedRegisteredPlayers)
      }
    }

    // validate and add guests
    if (Array.isArray(guestNames)) {
      const sanitizedGuests = guestNames
        .map((gName) => (typeof gName === "string" ? gName.trim() : ""))
        .filter((gName) => gName.length > 0)
        .map((gName) => ({
          player: null,
          displayName: gName,
          isGuest: true,
          status: "ACTIVE"
        }));

      newGamePlayers.push(...sanitizedGuests);
    }
    const newGame = await GameModel.create({
      name: gameName,
      host: player._id,
      players: newGamePlayers,
      visibility: visibility
    });
    res.status(201).json({ newGame });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

export async function updateGame(req, res) {
  try {
    // TODO
    res.status(200).json({ message: "updateGame working!" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function addGameEvent(req, res) {
  try {
    // TODO
    res.status(200).json({ message: "addGameEvent working!" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function deleteGame(req, res) {
  try {
    // TODO
    res.status(200).json({ message: "deleteGame working!" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}