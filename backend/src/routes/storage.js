import { Router } from "express";
import User from "../models/User.js";
import File from "../models/File.js";
import redis from "../config/redis.js";

const router = Router();

// GET /api/storage - Get user's storage info
router.get("/", async (req, res) => {
  try {
    const userId = req.user.id;

    // Check Redis cache first
    const cacheKey = `storage:${userId}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const storageInfo = {
      used: user.storageUsed,
      limit: user.storageLimit,
      percentage: Math.round((user.storageUsed / user.storageLimit) * 100),
    };

    // Cache for 30 seconds
    await redis.set(cacheKey, JSON.stringify(storageInfo), "EX", 30);

    res.json(storageInfo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
