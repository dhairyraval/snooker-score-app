import mongoose from "mongoose";

import { GameModel } from "../models/GameModel.js";
import { PlayerModel } from "../models/PlayerModel.js";
import { processTurnEvent, processUndoEvent } from "../services/gameEngine.js";

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

export async function createGame(req, res, next) {
  try {
    const { gameName, visibility = "PUBLIC" } = req.body || {};
    const player = req.player;
    const trimmedName = typeof gameName === "string" ? gameName.trim() : "";

    if (!trimmedName) {
      return res.status(400).json({ message: "Error: Game name is required." });
    }
    if (trimmedName.length > 60) {
      return res.status(400).json({ message: "Error: Game name must be under 60 characters." });
    }

    const normalizedVisibility = typeof visibility === "string" ? visibility.toUpperCase() : null;
    if (!["PUBLIC", "PRIVATE"].includes(normalizedVisibility)) {
      return res.status(400).json({ message: "Error: Visibility must be either PUBLIC or PRIVATE." });
    }

    const newGamePlayers = [
      {
        player: player._id,
        displayName: player.name,
        isGuest: false,
        status: 'ACTIVE'
      }
    ];

    const newGame = await GameModel.create({
      name: trimmedName,
      host: player._id,
      players: newGamePlayers,
      visibility: normalizedVisibility
    });

    return res.status(201).json({ newGame });
  } catch (error) {
    next(error);
  }
}

export async function addGuest(req, res, next) {
  try {
    const gName = req.body?.gName;
    const game = req.game;

    if (game.status === "COMPLETE" || game.status === "ABANDONED") {
      return res.status(400).json({ message: "Cannot add players to a completed or abandoned game." });
    }

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

    const createdGuest = game.players.create(sanitizedGuest);
    game.players.push(createdGuest);
    game.markModified("players")
    await game.save();

    const io = req.app.get("io");
    io?.to(`game:${game._id}`).emit("player_joined", {
      newPlayer: createdGuest,
      players: game.players
    });

    return res.status(201).json({
      message: "Guest added successfully",
      player: createdGuest,
      players: game.players
    });
  } catch (error) {
    // console.error("Error adding guest:", error);
    next(error);
  }
}

export async function addPlayer(req, res, next) {
  try {
    const { pId } = req.body;
    const game = req.game;

    if (game.status === "COMPLETE" || game.status === "ABANDONED") {
      return res.status(400).json({ message: "Cannot add players to a completed or abandoned game." });
    }

    if (!pId || !mongoose.Types.ObjectId.isValid(pId)) {
      return res.status(400).json({ message: "Error: Valid player ID (pId) is required" });
    }

    const playerToAdd = await PlayerModel.findById(pId).select("_id name").lean();
    if (!playerToAdd) {
      return res.status(404).json({ message: "Error: Player not found" });
    }
    const playerIdStr = playerToAdd._id.toString();

    // check if player's already joined in game
    if (game.players.some(p => p.player && p.player.toString() === playerIdStr)) {
      return res.status(409).json({ message: "Player already added to game" });
    }

    // duplicate name checks
    const nameExists = game.players.some(
      (p) => p.displayName.toLowerCase() === playerToAdd.name.toLowerCase()
    );
    if (nameExists) {
      return res.status(409).json({ message: "A player or guest with this display name is already in the game" });
    }

    const sanitizedPlayer = {
      player: playerToAdd._id,
      displayName: playerToAdd.name,
      isGuest: false,
      status: "ACTIVE"
    }


    const createdPlayer = game.players.create(sanitizedPlayer);
    game.players.push(createdPlayer);
    game.markModified("players")
    await game.save();

    const io = req.app.get("io");
    io?.to(`game:${game._id}`).emit("player_joined", {
      newPlayer: createdPlayer,
      players: game.players
    });

    return res.status(201).json({
      message: "Player added successfully",
      player: createdPlayer,
      players: game.players
    });
  } catch (error) {
    // console.error("Error adding player:", error);
    next(error);
  }
}

export async function joinGame(req, res, next) {

  try {
    const player = req.player;
    const givenGameId = req.params?.id;

    if (!givenGameId || !mongoose.Types.ObjectId.isValid(givenGameId)) {
      return res.status(400).json({ message: "Error: Invalid or missing game ID" });
    }

    const game = await GameModel.findById(givenGameId);

    if (!game) {
      return res.status(404).json({ message: "Error: game not found" });
    }

    if (game.status === "COMPLETE" || game.status === "ABANDONED") {
      return res.status(400).json({ message: "Cannot add players to a completed or abandoned game." });
    }

    const playerIdStr = player._id.toString();

    // check if player's already joined in game
    if (game.players.some(p => p.player && p.player.toString() === playerIdStr)) {
      return res.status(409).json({ message: "Player already added to game" });
    }

    // duplicate name display checks
    const nameExists = game.players.some(
      (p) => p.displayName.toLowerCase() === player.name.toLowerCase()
    );
    if (nameExists) {
      return res.status(409).json({ message: "A player with this name is already in the game -- pls contact host or admin" });
    }

    const sanitizedPlayer = {
      player: player._id,
      displayName: player.name,
      isGuest: false,
      status: "ACTIVE"
    }


    const createdPlayer = game.players.create(sanitizedPlayer);
    game.players.push(createdPlayer);
    game.markModified("players");
    await game.save()


    const io = req.app.get("io");
    io?.to(`game:${game._id}`).emit("player_joined", {
      newPlayer: createdPlayer,
      players: game.players
    });

    return res.status(201).json({
      message: "Player added successfully",
      player: createdPlayer,
      players: game.players
    });

  } catch (error) {
    // console.error("Error adding player:", error);
    next(error);
  }
}

// function used to sort final order of game players and start game (notify all players)
// Currently game model does not have a status: "LOBBY"
// if "LOBBY" status is added in the future, game status would be updated here to "ONGOING"
export async function startGame(req, res, next) {
  try {
    const game = req.game;
    const subDocIds = req.body?.subDocIds;

    if (game.status === "COMPLETE" || game.status === "ABANDONED") {
      return res.status(409).json({ message: "Game has concluded." });
    }

    if (!game.players || game.players.length < 1) {
      return res.status(400).json({ message: "Cannot start a game with no players." });
    }

    const activePlayers = game.players.filter(p => p.status === "ACTIVE");
    if (activePlayers.length === 1) {
      game.isRanked = false;
    }

    if (subDocIds != null) {

      if (!Array.isArray(subDocIds)) {
        return res.status(400).json({ message: "Error: Invalid list of players submitted" });
      }

      // check length
      if (subDocIds.length !== game.players.length) {
        return res.status(400).json({ message: "Error: Sorted no. of players do not match saved players in game" });
      }

      const uniqueIds = new Set(subDocIds);
      if (uniqueIds.size !== game.players.length) {
        return res.status(400).json({ message: "Duplicate player IDs found in order list." });
      }

      const playerMap = new Map(game.players.map(p => [p._id.toString(), p]));
      const reOrdered = [];
      for (const subDocId of subDocIds) {
        const playerObj = playerMap.get(subDocId);
        if (!playerObj) {
          return res.status(400).json({ message: `Player not found: ${subDocId}` });
        }
        reOrdered.push(playerObj);
      }

      // overwrite new order
      game.players = reOrdered;
      game.markModified("players");
    }

    await game.save();

    //sockets update
    const io = req.app.get("io");
    io?.to(`game:${game._id}`).emit("game_started", {
      game: game.toObject()
    });

    return res.status(200).json({ message: "Game started successfully", game });

  } catch (error) {
    next(error);
  }
}

export async function updateFinalScores(req, res, next) {
  try {
    const game = req.game;
    const scores = req.body?.scores;

    if (game.status !== "COMPLETE") {
      return res.status(400).json({ message: "Cannot update scores of ongoing or abandonded games" });
    }

    if (!Array.isArray(scores) || scores.length !== game.players.length) {
      return res.status(400).json({ message: "Scores must match the exact number of players." });
    }

    // non-negative safe integers
    const isValid = scores.every(s => typeof s === "number" && Number.isInteger(s) && s >= 0);
    if (!isValid) {
      return res.status(400).json({ message: "All scores must be non-negative integers." });
    }

    const maxScore = Math.max(...scores);
    const maxScoreIdx = scores.indexOf(maxScore);

    // update finalScores
    game.players.forEach((player, idx) => {
      game.finalScores.set(player._id.toString(), scores[idx]);
    });

    // if 2 players have same score -- no winner
    if (maxScoreIdx !== scores.lastIndexOf(maxScore)) {
      game.winner = null;
    }
    else {
      game.winner = game.players[maxScoreIdx]._id;
    }

    game.markModified("finalScores");
    await game.save();

    // const io = req.app.get("io");
    // if (io) {
    //   io.to(`game:${game._id}`).emit("game:scores_updated", {
    //     gameId: game._id,
    //     finalScores: game.finalScores,
    //     winner: game.winner
    //   });
    // }

    return res.status(200).json({ success: true, message: "final scores updated successfully", game: game });
  } catch (error) {
    next(error);
  }
}

export async function addGameEvent(req, res, next) {
  try {
    const game = req.game;
    const event = req.body?.event;

    if (game.status !== "ONGOING") {
      return res.status(409).json({ message: "Cannot add events to a concluded or non-started game." });
    }

    if (!event || typeof event !== "object" || Array.isArray(event)) {
      return res.status(400).json({ message: "invalid or missing event object" });
    }
    const currPlayer = event?.currPlayer;
    if (!currPlayer || !mongoose.Types.ObjectId.isValid(currPlayer)) {
      return res.status(400).json({ message: "invalid or missing current player in game event" });
    }

    const result = processTurnEvent(game, event);
    if (result?.error) {
      return res.status(400).json({ message: `Error: ${result.error}` });
    }

    Object.assign(game, result.updatedState);
    game.markModified("events");
    await game.save();

    // socket broadcast
    const io = req.app.get("io");
    const gamePayload = game.toObject();
    io?.to(`game:${game._id}`)?.emit("add_event", {
      event: result.lastEvent,
      game: gamePayload
    });

    return res.status(200).json({ message: "Added game event", event: result.lastEvent, game: gamePayload });
  } catch (error) {
    next(error);
  }
}

export async function leaveGame(req, res, next) {
  try {
    const game = req.game;
    const playerLeavingId = req.body?.leavingPlayerId;
    const isValidPlayerId = mongoose.Types.ObjectId.isValid(playerLeavingId);

    if (!isValidPlayerId) {
      return res.status(400).json({ message: "invalid or missing player id" });
    }

    //check if given player is involved in-game (registered player or guest player)
    const inGamePlayer = game.players.find(
      p => (p._id.toString() === playerLeavingId && p.status === "ACTIVE")
    );

    if (!inGamePlayer) {
      return res.status(403).json({ message: "Error: Not an active player not involved in game" });
    }

    // update player status, broadcast changes
    inGamePlayer.status = "FORFEITED";


    // handle host migration
    const isHost = game.host.toString() === inGamePlayer.player?.toString();
    if (isHost) {
      // find the next active registered player
      const nextHostCandidate = game.players.find(
        (p) =>
          p.player &&
          p.status === "ACTIVE" &&
          p._id.toString() !== playerLeavingId.toString()
      );

      if (nextHostCandidate) {
        game.host = nextHostCandidate.player;
      } else {
        game.status = "ABANDONED";
      }
    }

    // evaluate match state if not abandonded
    if (game.status !== "ABANDONED") {
      const activePlayers = game.players.filter((p) => p.status === "ACTIVE");

      if (activePlayers.length <= 1) {
        // Auto-win condition: 1 or 0 players remain
        game.status = "COMPLETE";
        game.winner = activePlayers[0]?._id || null;

      } else if (game.players[game.curr_turn]._id.toString() === playerLeavingId) {
        // Advance turn to the next active player if striker left
        let nextTurn = (game.curr_turn + 1) % game.players.length;
        while (game.players[nextTurn].status !== "ACTIVE") {
          nextTurn = (nextTurn + 1) % game.players.length;
        }
        game.curr_turn = nextTurn;
      }
    }

    game.markModified("players");
    await game.save();
    // add socket broadcast

    return res.status(200).json({
      success: true,
      message: "Player forfeited successfully.",
      game
    });

  } catch (error) {
    next(error);
  }
}

export async function deleteGame(req, res, next) {
  try {
    const { player, game } = req;
    const isOngoing = game.status === "ONGOING";
    const isAdmin = player.role === "admin";

    if (!isOngoing && !isAdmin) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // delete game
    await GameModel.deleteOne({ _id: game._id });

    // Inform connected clients and clean up the room
    const io = req.app.get("io");
    if (io) {
      const room = `game:${game._id}`;
      io.to(room).emit("game_deleted", { gameId: game._id });
      io.in(room).socketsLeave(room);
    }

    return res.status(200).json({
      success: true,
      message: "Game deleted successfully.",
      gameId: game._id
    });

  } catch (error) {
    next(error);
  }
}

export async function undoGameEvent(req, res, next) {
  try {
    const game = req.game;

    if (!game.events?.length) {
      return res.status(400).json({ success: false, message: "No events to undo." });
    }

    const result = processUndoEvent(game);

    if (result?.error) {
      return res.status(409).json({ success: false, message: result?.error });
    }

    Object.assign(game, result.updatedState);
    game.markModified("events");
    await game.save();

    // socket broadcast
    const io = req.app.get("io");
    const gamePayload = game.toObject();
    if (io) {
      const room = `game:${game._id}`;
      io.to(room).emit("undo_event", {
        undoEvent: result.revertedEvent,
        game: gamePayload
      });
    }
    return res.status(200).json({ message: "Last game event removed.", event: result.revertedEvent, game: gamePayload});

  } catch (error) {
    console.log(error.message);
    next(error);
  }
}