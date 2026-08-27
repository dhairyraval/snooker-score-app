import { GameModel } from "../models/GameModel.js";

export async function checkNoOngoingGame(req, res, next) {

  try {
    //check if given player has any games with status === "ONGOING"
    const playerId = req.player._id

    if (!playerId) {
      return res.status(401).json({ message: "Unauthorized: User identification missing." });
    }

    const activeGame = await GameModel.findOne({
      status: 'ONGOING',
      'players.player': playerId
    }).select('_id status').lean();

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