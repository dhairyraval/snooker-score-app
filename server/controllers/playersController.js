import PlayerModel from "../models/PlayerModel.js";

export async function getAllPlayers(req, res) {
  try {
    // TODO
    const playerList = await PlayerModel.find();
    res.status(200).json({playerList});
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}
export async function getPlayer(req, res) {
  try {
    // TODO
    res.status(200).json({message: "getPlayer working!"});
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}