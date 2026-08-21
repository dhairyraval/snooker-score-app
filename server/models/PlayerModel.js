import mongoose from "mongoose";

export function generateAvatarSeed(name) {
  const randomNum = Math.floor(Math.random() * 10) + 1;
  return `${name || 'player'}-${randomNum}`;
}

const playerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [30, 'Name cannot exceed 30 characters']
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

    passwordChangedAt: { type: Date },
    gamesPlayed: { type: Number, default: 0 },
    gamesWon: { type: Number, default: 0 },
    totalPoints: { type: Number, default: 0 },
    highestScore: { type: Number, default: 0 },
    highestBreak: { type: Number, default: 0 },
    currWinStreak: { type: Number, default: 0 },
    highestWinStreak: { type: Number, default: 0 },

    // seed for DiceBear's API
    avatarSeed: {
      type: String,
      default: function () {
        return generateAvatarSeed(this.name);
      }
    }
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// -- VIRTUALS --
// winRate
playerSchema.virtual('winRate').get(function () {
  if (!this.gamesPlayed || this.gamesPlayed === 0) {
    return 0;
  }
  return Number(((this.gamesWon / this.gamesPlayed) * 100).toFixed(1));
});

//avgScore
playerSchema.virtual('avgScore').get(function () {
  if (!this.gamesPlayed || this.gamesPlayed === 0) return 0;
  else return Number((this.totPoints / this.gamesPlayed).toFixed(1));
});

// avatarURL -- DiceBear's HTTP API URL
playerSchema.virtual('avatarUrl').get(function () {
  return `https://api.dicebear.com/10.x/adventurer-neutral/svg?glassesProbability=310seed=${encodeURIComponent(this.avatarSeed)}`;
});

// --- INDEXES ---
playerSchema.index({ name: 'text' });

playerSchema.methods.regenerateAvatar = function () {
  this.avatarSeed = generateAvatarSeed(this.name);
};

export const PlayerModel = mongoose.model("Player", playerSchema);