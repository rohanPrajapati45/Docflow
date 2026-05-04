import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import File from "../models/File.js";
import ShareLink from "../models/ShareLink.js";
import redis from "../config/redis.js";
import { minioClient } from "../config/minio.js";

const router = Router();

const BUCKET = process.env.MINIO_BUCKET;

// POST /api/files/:fileId/share - Create a share link
router.post("/:fileId/share", async (req, res) => {
  try {
    const userId = req.user.id;
    const { expiryOption, maxDownloads } = req.body;

    const file = await File.findOne({ fileId: req.params.fileId, uploadedBy: userId });
    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    // Calculate expiry time based on option
    let expiresAt = new Date();
    switch (expiryOption) {
      case "1h":
        expiresAt.setHours(expiresAt.getHours() + 1);
        break;
      case "24h":
        expiresAt.setDate(expiresAt.getDate() + 1);
        break;
      case "7d":
        expiresAt.setDate(expiresAt.getDate() + 7);
        break;
      case "never":
        expiresAt.setFullYear(expiresAt.getFullYear() + 10); // 10 years
        break;
      default:
        expiresAt.setDate(expiresAt.getDate() + 7); // Default 7 days
    }

    const token = uuidv4();
    const shareLink = await ShareLink.create({
      token,
      fileId: file._id,
      createdBy: userId,
      expiresAt,
      maxDownloads: maxDownloads === "unlimited" ? null : parseInt(maxDownloads),
      downloadCount: 0,
    });

    // Cache in Redis
    await redis.set(
      `session:${token}`,
      JSON.stringify(shareLink),
      "EX",
      Math.floor((expiresAt.getTime() - Date.now()) / 1000)
    );

    res.status(201).json({
      message: "Share link created",
      shareLink,
      shareUrl: `${process.env.FRONTEND_URL}/share/${token}`,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/share/:token - Public route to access shared file (no auth required)
router.get("/:token", async (req, res) => {
  try {
    const token = req.params.token;

    // Check Redis cache first
    let shareLink = await redis.get(`session:${token}`);
    if (shareLink) {
      shareLink = JSON.parse(shareLink);
    } else {
      // Fetch from MongoDB
      shareLink = await ShareLink.findOne({ token });
      if (!shareLink) {
        return res.status(404).json({ error: "Share link not found" });
      }
    }

    // Check expiry
    if (new Date(shareLink.expiresAt) < new Date()) {
      return res.status(403).json({ error: "Share link has expired" });
    }

    // Check max downloads
    if (shareLink.maxDownloads && shareLink.downloadCount >= shareLink.maxDownloads) {
      return res.status(403).json({ error: "Download limit reached" });
    }

    // Increment download count
    shareLink.downloadCount += 1;
    await ShareLink.findByIdAndUpdate(shareLink._id, {
      downloadCount: shareLink.downloadCount,
    });

    // Get file details
    const file = await File.findById(shareLink.fileId);
    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    // Generate presigned URL
    const downloadUrl = await minioClient.presignedGetObject(
      BUCKET,
      file.currentMinioKey,
      60
    );

    res.json({
      file,
      downloadUrl,
      remainingDownloads: shareLink.maxDownloads
        ? shareLink.maxDownloads - shareLink.downloadCount
        : null,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/files/:fileId/share-links - Get all share links for a file
router.get("/:fileId/share-links", async (req, res) => {
  try {
    const userId = req.user.id;
    const file = await File.findOne({ fileId: req.params.fileId, uploadedBy: userId });

    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    const shareLinks = await ShareLink.find({ fileId: file._id });

    res.json(shareLinks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/share/:token - Delete a share link
router.delete("/:token", async (req, res) => {
  try {
    const userId = req.user.id;
    const shareLink = await ShareLink.findOne({ token: req.params.token });

    if (!shareLink) {
      return res.status(404).json({ error: "Share link not found" });
    }

    // Verify user owns the file
    const file = await File.findById(shareLink.fileId);
    if (file.uploadedBy.toString() !== userId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    await ShareLink.deleteOne({ token: req.params.token });
    await redis.del(`session:${req.params.token}`);

    res.json({ message: "Share link deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
