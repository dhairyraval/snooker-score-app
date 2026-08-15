import mongoose from "mongoose";
const playerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ["player", "admin"],
    default: "player"
  },
  refreshTokens: {
    type: [String],
    default: []
  }
});

// --- INDEXES ---
playerSchema.index({ name: 'text' });

const PlayerModel = mongoose.model("Player", playerSchema);

export default PlayerModel