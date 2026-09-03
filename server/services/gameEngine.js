import { BALL_POINTS, COLOR_ORDER, VALID_PENALTIES, TOTAL_REDS } from "./constants.js";

/**
 * Validates break pot ordering against standard snooker rules.
 * Enforces Red -> Color alternation during Reds phase,
 * and Yellow -> Green -> Brown -> Blue -> Pink -> Black sequence during Clearance.
 *
 * @param {Array<string>} breakPots - Array of ball strings e.g. ['RED', 'BLACK']
 * @param {number} currentReds - Reds remaining on table before this break
 * @param {number} currentColorIdx - Index into COLOR_ORDER if in clearance phase
 * @returns {Object} Validation outcome obj
 */
export function validateBreakSequence(breakPots, currentReds, currentColorIdx = 0) {
  let reds = currentReds;
  let colorIdx = currentColorIdx;
  let points = 0;
  let nextExpected = reds > 0 ? "RED" : "CLEAR";

  for (let i = 0; i < breakPots.length; i++) {
    const ball = breakPots[i];
    const ballPoints = BALL_POINTS[ball];

    if (!ballPoints) {
      return { isValid: false, error: `Invalid ball identifier: ${ball}` };
    }

    if (reds > 0 || nextExpected === "COLOR") {
      // --- REDS PHASE (OR RESPOTTING FINAL COLOR) ---
      if (nextExpected === "RED") {
        if (ball !== "RED") {
          return {
            isValid: false,
            error: `Illegal shot at index ${i}: expected RED, received ${ball}.`
          };
        }
        reds -= 1;
        // Peek ahead
        const nextBall = breakPots[i + 1];
        if (nextBall === "RED" && reds > 0) {
          nextExpected = "RED"; // Stay on RED for the simultaneous pot
        }
        else {
          nextExpected = "COLOR";
        }
      }
      else {
        // nextExpected === "COLOR"
        if (ball === "RED") {
          return {
            isValid: false,
            error: `Illegal shot at index ${i}: expected a COLOR following RED, received RED.`
          };
        }
        // After potting a color, return to reds (or clear if all reds are gone)
        nextExpected = reds === 0 ? "CLEAR" : "RED";
      }
    }
    else {
      // --- COLOR CLEARANCE PHASE ---
      if (ball === "RED") {
        return {
          isValid: false,
          error: `Illegal shot at index ${i}: cannot pot RED when 0 reds remain.`
        };
      }

      const expectedColor = COLOR_ORDER[colorIdx];

      if (ball !== expectedColor) {
        return {
          isValid: false,
          error: `Illegal clearance sequence at index ${i}: expected ${expectedColor}, received ${ball}.`
        };
      }
      colorIdx += 1;
    }
    points += ballPoints;
  }
  return {
    isValid: true,
    points,
    redsRemaining: reds,
    colorClearanceIndex: colorIdx
  };
}

/**
 * Validates and applies a complete player turn event.
 * Pure function: does not mutate the passed game instance.
 *
 * @param {Object} game - Hydrated Mongoose game doc or plain object
 * @param {Object} incomingEvent - event subdoc from game.events array
 * @returns {Object} { updatedState, error }
 */

export function processTurnEvent(game, incomingEvent) {
  if (game.status !== "ONGOING") {
    return { error: "Cannot submit events to a game that is not ONGOING." };
  }

  const activePlayers = game.players.filter(p => p.status === "ACTIVE");
  if (activePlayers.length === 0) {
    return { error: "No active players in the match." };
  }

  // verify player turn matches current index
  const expectedPlayer = game.players[game.curr_turn];
  if (!expectedPlayer) {
    return { error: "Invalid current turn index in game state." };
  }

  const incomingPlayerId = incomingEvent.currPlayer?.toString();
  const expectedPlayerId = expectedPlayer._id.toString();

  if (incomingPlayerId !== expectedPlayerId) {
    return { error: "It is not this player's turn." };
  }

  const breakPots = Array.isArray(incomingEvent.breakPots) ? incomingEvent.breakPots : [];
  const penalty = incomingEvent?.penalty ?? 0;

  // validate penaly points
  if (!VALID_PENALTIES.includes(penalty)) {
    return { error: "Invalid penalty value passed in Event." };
  }


  // validate sequence and calculate break score
  const validation = validateBreakSequence(breakPots, game.redsRemaining, game.colorClearanceIndex);
  if (!validation.isValid) {
    return { error: validation.error };
  }

  // resolve baseline scores from last event or start at 0
  const lastEvent = game.events && game.events.length > 0
    ? game.events[game.events.length - 1]
    : null;
  const newRunningScores = {};

  game.players.forEach((p) => {
    const pId = p._id.toString();
    const prevScore = lastEvent?.runningScores instanceof Map
      ? (lastEvent.runningScores.get(pId) || 0)
      : (lastEvent?.runningScores?.[pId] || 0);

    newRunningScores[pId] = prevScore;
  });

  newRunningScores[expectedPlayerId] += validation.points;

  // distribute penaly points to other players
  if (penalty > 0) {

    game.players.forEach((p) => {
      const pId = p._id.toString();
      if (pId !== expectedPlayerId && p.status === "ACTIVE") {
        newRunningScores[pId] += penalty;
      }
    });
  }

  // game-Over evaluation (cleared all 6 colors to BLACK)
  const isGameOver = validation.colorClearanceIndex >= COLOR_ORDER.length;

  // turn progression (round-robin among ACTIVE players)
  let nextTurn = (game.curr_turn + 1) % game.players.length;
  while (game.players[nextTurn].status !== "ACTIVE" && nextTurn !== game.curr_turn) {
    nextTurn = (nextTurn + 1) % game.players.length;
  }

  // assemble recorded event
  const processedEvent = {
    currPlayer: expectedPlayer._id,
    breakPots,
    breakScore: validation.points,
    penalty,
    runningScores: newRunningScores,
    timestamp: new Date()
  };

  // updated state patch
  const updatedState = {
    events: game.events.concat(processedEvent),
    redsRemaining: validation.redsRemaining,
    colorClearanceIndex: validation.colorClearanceIndex,
    curr_turn: isGameOver ? game.curr_turn : nextTurn
  };

  if (isGameOver) {
    updatedState.status = "COMPLETE";
    updatedState.finalScores = newRunningScores;

    let topScore = -1; // switch to -Infinity if adding house rules game mode in the future
    let winningPlayerId = null;
    for (const [pId, score] of Object.entries(newRunningScores)) {
      if (score > topScore) {
        topScore = score;
        winningPlayerId = pId;
      }
    }
    updatedState.winner = winningPlayerId;
  }

  return {
    updatedState,
    isGameOver,
    lastEvent: processedEvent
  };
}

/**
 * Pure helper to calculate state rollbacks when undoing the last event.
 *
 * @param {Object} game - Current Mongoose Game document or plain object
 * @returns {Object} { updatedState, error }
 */
export function processUndoEvent(game) {
  if (!game.events || game.events.length === 0) {
    return { error: "No events available to undo." };
  }

  const eventsCopy = [...game.events];
  const revertedEvent = eventsCopy.pop();

  // Restore potted reds from popped event
  const redsToRestore = (revertedEvent.breakPots || []).filter((b) => b === "RED").length;
  const updatedReds = Math.min(TOTAL_REDS, (game.redsRemaining ?? 0) + redsToRestore);

  // Restore potted colors if in clear phase
  const clearedColorsInBreak = (revertedEvent.breakPots || []).filter(
    (b) => b !== "RED" && (game.redsRemaining) === 0
  ).length;
  const updatedColorIdx = Math.max(0, (game.colorClearanceIndex) - clearedColorsInBreak);

  // Roll back current turn to the player who took the undone shot
  const previousPlayerIndex = game.players.findIndex(
    (p) => p._id.toString() === revertedEvent.currPlayer.toString()
  );

  const updatedState = {
    events: eventsCopy,
    redsRemaining: updatedReds,
    colorClearanceIndex: updatedColorIdx,
    curr_turn: previousPlayerIndex !== -1 ? previousPlayerIndex : game.curr_turn,  // Hopefully is never -1
    status: "ONGOING",
    winner: null,
    finalScores: {}
  };

  return {
    updatedState,
    revertedEvent
  };
}