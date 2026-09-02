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

export async function addGuest(req, res) {
  try {
    const gName = req.body?.gName;
    const game = req.game;
    if (!gName || typeof gName !== "string" || gName.trim().length === 0) {
      return res.status(400).json({ message: "Error: Need to provide guest name" });
    }

    const trimmedName = gName.trim();
    if (trimmedName.length > 20) {
      return res.status(400).json({ message: "Guest name must be 20 characters or fewer." });
    }

    const nameExists = game.players.some(
      (p) => p.displayName.toLowerCase() === trimmedName.toLowerCase()
    );
    if (nameExists) {
      return res.status(409).json({ message: "A player with this name is already in the lobby." });
    }

    const sanitizedGuest = {
      player: null,
      displayName: trimmedName,
      isGuest: true,
      status: "ACTIVE"
    }

    game.players.push(sanitizedGuest);
    await game.save()

    const createdGuest = game.players[game.players.length - 1];

    // req.io?.to(game._id.toString()).emit("player_joined", createdGuest);

    return res.status(201).json({
      message: "Guest added successfully",
      player: createdGuest,
      players: game.players
    });
  } catch (error) {
    console.error("Error adding guest:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}

export async function addPlayer(req, res) {
  try {
    const playerToAdd = await PlayerModel.findById(req.body?.pId);

    if (!playerToAdd) {
      return res.status(409).json({ message: "Error: Invalid player id provided" });
    }

    const game = req.game;

    // check if player's already joined in game
    if (game.players.some(p => p.player && p.player.toString() === playerToAdd._id.toString())) {
      return res.status(409).json({ message: "Player already added to game" });
    }

    const sanitizedPlayer = {
      player: playerToAdd._id,
      displayName: playerToAdd.name,
      isGuest: false,
      status: "ACTIVE"
    }

    game.players.push(sanitizedPlayer);
    await game.save()

    const createdPlayer = game.players[game.players.length - 1];

    // req.io?.to(game._id.toString()).emit("player_joined", createdPlayer);

    return res.status(201).json({
      message: "Player added successfully",
      player: createdPlayer,
      players: game.players
    });
  } catch (error) {
    console.error("Error adding player:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}

export async function joinGame(req, res) {

  try {
    const player = req.player;
    const givenGameId = req.params?.id;
    const game = await GameModel.findById(givenGameId);

    if (!game) {
      return res.status(400).json({ message: "Error: Invalid game id" });
    }

    // check if player's already joined in game
    if (game.players.some(p => p.player && p.player.toString() === player._id.toString())) {
      return res.status(409).json({ message: "Player already added to game" });
    }

    const sanitizedPlayer = {
      player: player._id,
      displayName: player.name,
      isGuest: false,
      status: "ACTIVE"
    }

    game.players.push(sanitizedPlayer);
    await game.save()

    const createdPlayer = game.players[game.players.length - 1];

    // req.io?.to(game._id.toString()).emit("player_joined", createdPlayer);

    return res.status(201).json({
      message: "Player added successfully",
      player: createdPlayer,
      players: game.players
    });

  } catch (error) {
    console.error("Error adding player:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
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