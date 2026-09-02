import mongoose from "mongoose";

const VALID_BALLS = ['RED', 'YELLOW', 'GREEN', 'BROWN', 'BLUE', 'PINK', 'BLACK'];
const VALID_PENALTIES = [0, 4, 5, 6, 7];


const gamePlayerSchema = new mongoose.Schema({
  player: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    default: null // Allows guests to have no Player document
  },
  displayName: {
    type: String,
    required: true,
    trim: true // Stores the name for guests or cached name for registered users
  },
  isGuest: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'FORFEITED', 'LEFT'],
    default: 'ACTIVE'
  },
  joinedAt: {
    type: Date,
    default: Date.now
  }
});

const eventSchema = new mongoose.Schema(
  {
    currPlayer: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    breakPots: {
      type: [{ type: String, enum: VALID_BALLS }],
      default: []
    },
    breakScore: { type: Number, default: 0, min: 0 },
    penalty: { type: Number, default: 0, enum: VALID_PENALTIES },
    runningScores: {
      type: Map,
      of: Number,
      default: {}
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
  },
  { _id: false }
);

const gameSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    players: {
      type: [gamePlayerSchema],
      default: []
    },
    winner: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      required: true,
    },
    visibility: {
      type: String,
      enum: ['PUBLIC', 'PRIVATE'],
      default: 'PUBLIC'
    },
    status: {
      type: String,
      enum: ['ONGOING', 'COMPLETE', 'ABANDONED'],
      default: 'ONGOING'
    },
    curr_turn: {
      type: Number,
      default: 0
    },
    finalScores: {
      type: Map,
      of: Number,
      default: {}
    },
    events: {
      type: [eventSchema],
      default: []
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// -- INDEXED --
gameSchema.index({ name: 'text' });
gameSchema.index({ status: 1, 'players.player': 1 });

export const GameModel = mongoose.model("Game", gameSchema);