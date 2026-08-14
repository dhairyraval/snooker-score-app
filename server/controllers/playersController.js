// import Transaction from "../models/Transaction.js";

export async function getAllPlayers(req, res) {
  try {
    // TODO
    res.status(200).json({message: "getAllPlayers working!"});
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

export async function updatePlayerPassword(req, res) {
  try {
    // TODO
    res.status(200).json({message: "updatePlayerPassword working!"});
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}