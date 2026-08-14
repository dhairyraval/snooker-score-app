// import Transaction from "../models/Transaction.js";

export async function getAllGames(req, res) {
  try {
    // TODO
    res.status(200).json({message: "getAllGames working!"});
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function getGame(req, res) {
  try {
    // TODO
    res.status(200).json({message: "getGame working!"});
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function createGame(req, res) {
  try {
    // TODO
    res.status(200).json({message: "createGame working!"});
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function updateGame(req, res) {
  try {
    // TODO
    res.status(200).json({message: "updateGame working!"});
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function updateScore(req, res) {
  try {
    // TODO
    res.status(200).json({message: "updateScore working!"});
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function updateType(req, res) {
  try {
    // TODO
    res.status(200).json({message: "updateType working!"});
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function updateStatus(req, res) {
  try {
    // TODO
    res.status(200).json({message: "updateStatus working!"});
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function deleteGame(req, res) {
  try {
    // TODO
    res.status(200).json({message: "deleteGame working!"});
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}