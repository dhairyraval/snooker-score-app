import mongoose from "mongoose";
const playerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
    select: false
  },
  role: {
    type: String,
    enum: ["player", "admin"],
    default: "player"
  },
  refreshTokens: {
    type: [String],
    default: []
  },
  passwordChangedAt: {
    type: Date
  }
});

// --- INDEXES ---
playerSchema.index({ name: 'text' });

const PlayerModel = mongoose.model("Player", playerSchema);

export default PlayerModel