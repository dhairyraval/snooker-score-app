import rateLimit from 'express-rate-limit';
import MongoStore from 'rate-limit-mongo';

export const contactRateLimiter = rateLimit({
  store: new MongoStore({
    uri: process.env.MONGO_URI,
    collectionName: 'rate_limits',
    expireTimeMs: 15 * 60 * 1000, // 15 mins window
    errorHandler: console.error,
  }),
  windowMs: 15 * 60 * 1000, // 15 mins window
  max: 3, // Max 5 submissions per window
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.player?._id?.toString();
  },
  message: {
    success: false,
    message: 'Too many messages sent. Please wait 15 mins before trying again.',
  },
});