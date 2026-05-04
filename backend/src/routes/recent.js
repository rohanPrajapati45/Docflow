import { Router } from "express";
import File from "../models/File.js";
import redis from "../config/redis.js";

const router = Router();

// GET /api/recent - Get recently viewed files
router.get("/", async (req, res) => {
  try {
    const userId = req.user.id;

    // Get recent file IDs from Redis (last 10)
    const recentFileIds = await redis.zrevrange(`recent:${userId}`, 0, 9);

    if (!recentFileIds || recentFileIds.length === 0) {
      return res.json([]);
    }

    // Fetch full file details
    const files = await File.find({
      _id: { $in: recentFileIds },
      uploadedBy: userId,
    }).sort({ uploadedAt: -1 });

    res.json(files);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
