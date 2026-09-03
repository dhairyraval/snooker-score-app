export const BALL_POINTS = Object.freeze({
  RED: 1,
  YELLOW: 2,
  GREEN: 3,
  BROWN: 4,
  BLUE: 5,
  PINK: 6,
  BLACK: 7
});

export const VALID_BALLS = Object.freeze(Object.keys(BALL_POINTS));
export const VALID_PENALTIES = Object.freeze([0, 4, 5, 6, 7]);
export const COLOR_ORDER = Object.freeze([
  'YELLOW',
  'GREEN',
  'BROWN',
  'BLUE',
  'PINK',
  'BLACK'
]);
export const TOTAL_REDS = 15;
export const MAX_POSSIBLE_BREAK = 147;