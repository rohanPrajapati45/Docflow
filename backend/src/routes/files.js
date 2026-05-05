import { Router } from "express";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import sharp from "sharp";
import File from "../models/File.js";
import User from "../models/User.js";
import Folder from "../models/Folder.js";
import redis from "../config/redis.js";
import { minioClient } from "../config/minio.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const BUCKET = process.env.MINIO_BUCKET;
const STORAGE_LIMIT = 524288000; // 500 MB

// ─── HELPER FUNCTIONS ───

// Generate MinIO key following pattern: {userId}/{folderId or 'root'}/{fileId}-{filename}
const generateMinioKey = (userId, folderId, fileId, filename) => {
  const folder = folderId || "root";
  return `${userId}/${folder}/${fileId}-${filename}`;
};

// Check if user has exceeded storage limit
const checkStorageLimit = async (userId, additionalSize = 0) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  const totalUsage = user.storageUsed + additionalSize;
  if (totalUsage > user.storageLimit) {
    throw new Error(
      `Storage limit exceeded. Available: ${user.storageLimit - user.storageUsed} bytes`
    );
  }
};

// Invalidate user-specific caches
const invalidateUserCaches = async (userId) => {
  await redis.del(`files:${userId}`);
  await redis.del(`storage:${userId}`);
};

const getOwnedFileQuery = (req, extra = {}) => {
  const userId = req.user.id;
  return {
    ...extra,
    uploadedBy: userId,
  };
};

// Log recently viewed file
const logRecentlyViewed = async (userId, fileId) => {
  await redis.zadd(`recent:${userId}`, Date.now(), fileId);
  // Keep only last 10
  await redis.zremrangebyrank(`recent:${userId}`, 0, -11);
};

// Compress image if it's over 2MB
const compressImageIfNeeded = async (buffer, mimetype) => {
  const COMPRESSION_THRESHOLD = 2 * 1024 * 1024; // 2 MB
  const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

  if (!IMAGE_TYPES.includes(mimetype) || buffer.length < COMPRESSION_THRESHOLD) {
    return { buffer, isCompressed: false, originalSize: null };
  }

  try {
    const compressed = await sharp(buffer)
      .resize(1920, 1080, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 85 })
      .toBuffer();

    if (compressed.length < buffer.length) {
      return {
        buffer: compressed,
        isCompressed: true,
        originalSize: buffer.length,
      };
    }
    return { buffer, isCompressed: false, originalSize: null };
  } catch (error) {
    console.error("Image compression failed:", error);
    return { buffer, isCompressed: false, originalSize: null };
  }
};

// ─── ROUTES ───

// POST /api/files/upload
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file provided" });
    }

    const userId = req.user.id;
    const { originalname, size, mimetype, buffer } = req.file;
    const folderId = req.body.folderId || null;
    const category = req.body.category || "general";
    const tags = req.body.tags ? JSON.parse(req.body.tags) : [];

    // Sanitize filename — remove spaces and special characters
    const sanitizedName = originalname
      .replace(/\s+/g, '_')            // spaces → underscore
      .replace(/[^a-zA-Z0-9._-]/g, ''); // remove special chars

    // Check storage limit
    await checkStorageLimit(userId, size);

    const fileId = uuidv4();

    // Compress image if needed
    const { buffer: finalBuffer, isCompressed, originalSize } =
      await compressImageIfNeeded(buffer, mimetype);

    const finalSize = finalBuffer.length;
    const minioKey = generateMinioKey(userId, folderId, fileId, sanitizedName);

    // Upload to MinIO
    await minioClient.putObject(BUCKET, minioKey, finalBuffer, finalSize, {
      "Content-Type": mimetype,
    });

    // Save metadata to MongoDB
    const fileMeta = await File.create({
      fileId,
      originalName: originalname,
      size: finalSize,
      mimetype,
      category,
      tags,
      folderId,
      uploadedBy: userId,
      starred: false,
      isCompressed,
      originalSize,
      currentMinioKey: minioKey,
      versions: [
        {
          versionId: uuidv4(),
          minioKey,
          size: finalSize,
          uploadedAt: new Date(),
        },
      ],
    });

    // Update user storage
    const user = await User.findById(userId);
    user.storageUsed += finalSize;
    await user.save();

    // Invalidate cache
    await invalidateUserCaches(userId);

    res.status(201).json({
      message: "File uploaded",
      file: fileMeta,
      compressionInfo: isCompressed
        ? {
            originalSize,
            compressedSize: finalSize,
            savings: `${Math.round((1 - finalSize / originalSize) * 100)}%`,
          }
        : null,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/files?folderId=&tag=&search=&starred=
router.get("/", async (req, res) => {
  try {
    const userId = req.user.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const { folderId, tag, search, starred } = req.query;

    // Check Redis cache
    const cacheKey = `files:${userId}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      let files = JSON.parse(cached);

      // Safety check in case an old/stale cache was created before ownership fixes.
      files = files.filter((f) => String(f.uploadedBy) === String(userId));

      // Apply filters
      if (folderId) files = files.filter((f) => f.folderId?.toString() === folderId);
      if (tag) files = files.filter((f) => f.tags.includes(tag));
      if (search) {
        const regex = new RegExp(search, "i");
        files = files.filter(
          (f) =>
            regex.test(f.originalName) ||
            regex.test(f.category) ||
            f.tags.some((t) => regex.test(t))
        );
      }
      if (starred === "true") files = files.filter((f) => f.starred);

      return res.json(files);
    }

    // Fetch from MongoDB (user's files only)
    let query = getOwnedFileQuery(req);
    if (folderId) query.folderId = folderId;
    if (starred === "true") query.starred = true;

    let files = await File.find(query).sort({ uploadedAt: -1 }).populate("folderId");

    // Filter by tag if provided
    if (tag) {
      files = files.filter((f) => f.tags.includes(tag));
    }

    // Filter by search if provided
    if (search) {
      const regex = new RegExp(search, "i");
      files = files.filter(
        (f) =>
          regex.test(f.originalName) ||
          regex.test(f.category) ||
          f.tags.some((t) => regex.test(t))
      );
    }

    // Cache for 60 seconds
    await redis.set(cacheKey, JSON.stringify(files), "EX", 60);

    res.json(files);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/files/:id/raw - Stream file content directly (proxy through backend)
// Supports auth via ?token= query param so browser elements (img, video, iframe) can load files
router.get("/:id/raw", async (req, res) => {
  try {
    // Support auth via query param for browser elements, or via Authorization header
    const token = req.query.token || req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Verify JWT manually (since this route bypasses the normal auth middleware for query token support)
    const jwt = await import("jsonwebtoken");
    let decoded;
    try {
      decoded = jwt.default.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ error: "Invalid token" });
    }

    const userId = String(decoded.id || decoded.userId);
    const file = await File.findOne({ fileId: req.params.id, uploadedBy: userId });

    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    // Log to recently viewed
    await logRecentlyViewed(userId, file._id);

    // Set response headers
    res.setHeader("Content-Type", file.mimetype);
    res.setHeader("Content-Length", file.size);

    if (req.query.download === "true") {
      res.setHeader("Content-Disposition", `attachment; filename="${file.originalName}"`);
    } else {
      res.setHeader("Content-Disposition", "inline");
    }

    // Stream file from MinIO directly to the browser
    const stream = await minioClient.getObject(BUCKET, file.currentMinioKey);
    stream.pipe(res);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/files/:id/preview - Return file metadata + proxy preview URL
router.get("/:id/preview", async (req, res) => {
  try {
    const userId = req.user.id;
    const file = await File.findOne(getOwnedFileQuery(req, { fileId: req.params.id }));

    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    // Log to recently viewed
    await logRecentlyViewed(userId, file._id);

    // Return a backend proxy URL instead of a MinIO presigned URL
    const token = req.headers.authorization?.split(" ")[1];
    const previewUrl = `/api/files/${file.fileId}/raw?token=${token}`;

    res.json({
      file,
      previewUrl,
      isPreviewable: [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "application/pdf",
        "video/mp4",
      ].includes(file.mimetype),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/files/:id/download - Return file metadata + proxy download URL
router.get("/:id/download", async (req, res) => {
  try {
    const userId = req.user.id;
    const file = await File.findOne(getOwnedFileQuery(req, { fileId: req.params.id }));

    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    // Log to recently viewed
    await logRecentlyViewed(userId, file._id);

    // Return a backend proxy URL with download flag
    const token = req.headers.authorization?.split(" ")[1];
    const downloadUrl = `/api/files/${file.fileId}/raw?token=${token}&download=true`;

    res.json({ file, downloadUrl });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/files/:id/star - Toggle star status
router.patch("/:id/star", async (req, res) => {
  try {
    const userId = req.user.id;
    const file = await File.findOne(getOwnedFileQuery(req, { fileId: req.params.id }));

    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    file.starred = !file.starred;
    await file.save();

    await invalidateUserCaches(userId);

    res.json({ message: "Star status updated", file });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/files/:id/tags - Update tags
router.patch("/:id/tags", async (req, res) => {
  try {
    const userId = req.user.id;
    const { tags } = req.body;

    const file = await File.findOne(getOwnedFileQuery(req, { fileId: req.params.id }));

    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    file.tags = tags || [];
    await file.save();

    await invalidateUserCaches(userId);

    res.json({ message: "Tags updated", file });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/files/:id/versions - Get version history
router.get("/:id/versions", async (req, res) => {
  try {
    const userId = req.user.id;
    const file = await File.findOne(getOwnedFileQuery(req, { fileId: req.params.id }));

    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    res.json({ versions: file.versions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/files/:id/restore/:versionId - Restore previous version
router.post("/:id/restore/:versionId", async (req, res) => {
  try {
    const userId = req.user.id;
    const file = await File.findOne(getOwnedFileQuery(req, { fileId: req.params.id }));

    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    const version = file.versions.find((v) => v.versionId === req.params.versionId);
    if (!version) {
      return res.status(404).json({ error: "Version not found" });
    }

    // Make the old version current
    file.currentMinioKey = version.minioKey;
    file.updatedAt = new Date();
    await file.save();

    await invalidateUserCaches(userId);

    res.json({ message: "Version restored", file });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/files/:id/versions/:versionId - Delete old version
router.delete("/:id/versions/:versionId", async (req, res) => {
  try {
    const userId = req.user.id;
    const file = await File.findOne(getOwnedFileQuery(req, { fileId: req.params.id }));

    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    const versionIndex = file.versions.findIndex(
      (v) => v.versionId === req.params.versionId
    );
    if (versionIndex === -1) {
      return res.status(404).json({ error: "Version not found" });
    }

    const version = file.versions[versionIndex];

    // Cannot delete current version
    if (version.minioKey === file.currentMinioKey) {
      return res.status(400).json({ error: "Cannot delete current version" });
    }

    // Delete from MinIO
    await minioClient.removeObject(BUCKET, version.minioKey);

    // Remove from versions array
    file.versions.splice(versionIndex, 1);

    // Update storage
    const user = await User.findById(userId);
    user.storageUsed -= version.size;
    await user.save();

    await file.save();
    await invalidateUserCaches(userId);

    res.json({ message: "Version deleted", file });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/files/:id - Delete file
router.delete("/:id", async (req, res) => {
  try {
    const userId = req.user.id;
    const file = await File.findOne(getOwnedFileQuery(req, { fileId: req.params.id }));

    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    // Delete all versions from MinIO
    for (const version of file.versions) {
      await minioClient.removeObject(BUCKET, version.minioKey);
    }

    // Delete from MongoDB
    await File.deleteOne({ fileId: req.params.id });

    // Update user storage
    const user = await User.findById(userId);
    user.storageUsed -= file.size;
    await user.save();

    await invalidateUserCaches(userId);

    res.json({ message: "File deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
