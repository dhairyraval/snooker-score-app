import mongoose from "mongoose";
import { PlayerModel } from "../models/PlayerModel.js";

export async function getAllPlayers(req, res) {
  try {
    const {
      page = 1,
      limit = 1,
      search,
      sortBy = 'name',
      sortOrder = 'desc'
    } = req.query;
    const playerList = await PlayerModel.find();


    // dynamic filter obj
    const filter = {}

    // text search filter using regex + options
    if (search && search.trim() !== '') {
      filter.name = { $regex: search.trim(), $options: 'i' };
    }

    // sorting & pagination logic
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
    const skip = (page - 1) * limit;

    const [players, playerCount] = await Promise.all([
      PlayerModel.find(filter).select('name avatarSeed').lean().sort(sort).skip(skip).limit(limit),
      PlayerModel.countDocuments(filter)
    ]);

    res.status(200).json({
      playerList: players,
      pagination: {
        totalItems: playerCount,
        totalPages: Math.ceil(playerCount / limit),
        currPage: page,
        limit: limit
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function getPlayer(req, res) {
  try {
    const player = await PlayerModel.findById(req.params?.id, 'name avatarSeed').lean();
    if (!player) return res.status(404).json({ message: "Player with given id not found" });
    res.status(200).json({ success: true, player });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function getMyDetails(req, res) {
  try {
    const player = req.player;
    if (!player) return res.status(404).json({ message: "Error 404: Player not found" });
    res.status(200).json({ success: true, player });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function updateProfile(req, res) {
  try {
    const { updateAvatar = false, name } = req.body;
    const player = req.player;
    if (!player) return res.status(404).json({ message: "Error 404: Player not found" });
    if (name !== undefined) player.name = name;
    if (updateAvatar) { player.regenerateAvatar(); }
    await player.save();
    res.status(200).json({ success: true, player });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: error.message });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function getPlayerStats(req, res) {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid player ID format." });
    }
    const player = await PlayerModel.findById(id, '-refreshTokens -passwordChangedAt');
    if (!player) {
      return res.status(404).json({ success: false, message: "Error 404: Player not found" });
    }
    res.status(200).json({ success: true, player })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}