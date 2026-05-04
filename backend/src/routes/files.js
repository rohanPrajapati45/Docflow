import { Router } from "express";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import File from "../models/File.js";
import redis from "../config/redis.js";
import { minioClient } from "../config/minio.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const BUCKET = process.env.MINIO_BUCKET;

// POST /api/files/upload → upload file to MinIO + save metadata + invalidate cache
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file provided" });
    }

    const fileId = uuidv4();
    const { originalname, size, mimetype, buffer } = req.file;
    const category = req.body.category || "general";

    // Upload to MinIO
    await minioClient.putObject(BUCKET, fileId, buffer, size, {
      "Content-Type": mimetype,
    });

    // Save metadata to MongoDB
    const fileMeta = await File.create({
      fileId,
      originalName: originalname,
      size,
      mimetype,
      category,
      uploadedBy: req.user.username,
    });

    // Invalidate Redis cache
    await redis.del("all_files");

    res.status(201).json({ message: "File uploaded", file: fileMeta });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/files/search?q= → search by originalName or category (must be before /:id)
router.get("/search", async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({ error: "Search query is required" });
    }

    const regex = new RegExp(q, "i");
    const files = await File.find({
      $or: [{ originalName: regex }, { category: regex }],
    });

    res.json(files);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/files → list all files (Redis cached for 60s)
router.get("/", async (req, res) => {
  try {
    // Check Redis cache
    const cached = await redis.get("all_files");
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    // Fetch from MongoDB
    const files = await File.find().sort({ uploadedAt: -1 });

    // Cache in Redis with 60s expiry
    await redis.set("all_files", JSON.stringify(files), "EX", 60);

    res.json(files);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/files/:id → get presigned download URL
router.get("/:id", async (req, res) => {
  try {
    const file = await File.findOne({ fileId: req.params.id });
    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    // Generate presigned URL (60 seconds expiry)
    const url = await minioClient.presignedGetObject(BUCKET, file.fileId, 60);

    res.json({ file, downloadUrl: url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/files/:id → delete from MinIO + MongoDB + invalidate cache
router.delete("/:id", async (req, res) => {
  try {
    const file = await File.findOne({ fileId: req.params.id });
    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    // Delete from MinIO
    await minioClient.removeObject(BUCKET, file.fileId);

    // Delete from MongoDB
    await File.deleteOne({ fileId: req.params.id });

    // Invalidate Redis cache
    await redis.del("all_files");

    res.json({ message: "File deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
