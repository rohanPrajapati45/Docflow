import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import Folder from "../models/Folder.js";
import File from "../models/File.js";
import redis from "../config/redis.js";

const router = Router();

// POST /api/folders - Create a new folder
router.post("/", async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, color } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Folder name is required" });
    }

    const folderId = uuidv4();
    const folder = await Folder.create({
      folderId,
      name,
      color: color || "#1A73E8",
      createdBy: userId,
    });

    // Invalidate cache
    await redis.del(`files:${userId}`);

    res.status(201).json({ message: "Folder created", folder });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/folders - Get user's folders
router.get("/", async (req, res) => {
  try {
    const userId = req.user.id;

    const folders = await Folder.find({ createdBy: userId }).sort({ createdAt: -1 });

    res.json(folders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/folders/:id - Delete folder (and move files to root)
router.delete("/:id", async (req, res) => {
  try {
    const userId = req.user.id;
    const folder = await Folder.findOne({
      folderId: req.params.id,
      createdBy: userId,
    });

    if (!folder) {
      return res.status(404).json({ error: "Folder not found" });
    }

    // Move all files in this folder to root
    await File.updateMany(
      { folderId: folder._id, uploadedBy: userId },
      { folderId: null }
    );

    // Delete folder
    await Folder.deleteOne({ folderId: req.params.id });

    // Invalidate cache
    await redis.del(`files:${userId}`);

    res.json({ message: "Folder deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
