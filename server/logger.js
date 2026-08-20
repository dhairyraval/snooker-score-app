import winston from 'winston';
import dotenv from "dotenv";
import 'winston-mongodb';

dotenv.config();

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
    winston.format.metadata() // capture request metadata in MongoDB
  ),
  transports: [
    // Console transport
    new winston.transports.Console(),

    // MongoDB transport
    new winston.transports.MongoDB({
      level: 'warn',
      db: process.env.MONGO_URI,
      options: { useUnifiedTopology: true },
      collection: 'app_logs', // Name of the target collection
      capped: true,               // Caps collection size to prevent boundless growth
      cappedSize: 5242880,        // 5MB max size limit
      cappedMax: 10000,           // max 10000 docs
      metaKey: 'meta'             // Groups metadata fields under an object key
    })
  ]
});
