import mongoose from 'mongoose';

const rateLimitSchema = new mongoose.Schema({
  key: { type: String, required: true, index: true },
  createdAt: { 
    type: Date, 
    default: Date.now, 
    expires: 3600 // Auto-deletes document after 1 hour (3600 seconds)
  }
});

export const RateLimitRecord = mongoose.model('RateLimitRecord', rateLimitSchema);