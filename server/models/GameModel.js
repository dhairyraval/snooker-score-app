import mongoose from "mongoose";

const VALID_BALLS = ['RED', 'YELLOW', 'GREEN', 'BROWN', 'BLUE', 'PINK', 'BLACK'];
const VALID_PENALTIES = [0, 4, 5, 6, 7];

const eventSchema = new mongoose.Schema(
  {
    currPlayer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
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
      default: () => new Map()
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
  },
  { _id: false } // Avoids creating a separate ObjectId for every single in-game tap
);

const gameSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    players: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Player' }],
      default: []
    },
    visibility: {
      type: String,
      enum: ['PUBLIC', 'PRIVATE'],
      default: 'PUBLIC'
    },
    status: {
      type: String,
      enum: ['ONGOING', 'COMPLETE'],
      default: 'ONGOING'
    },
    finalScores: {
      type: Map,
      of: Number,
      default: () => new Map()
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
gameSchema.index({name: 'text'});

export const GameModel = mongoose.model("Game", gameSchema);