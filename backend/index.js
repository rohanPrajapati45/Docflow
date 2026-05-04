import "dotenv/config";

import express from "express";
import cors from "cors";

import connectDB from "./src/config/db.js";
import redis from "./src/config/redis.js";
import { initMinioBucket } from "./src/config/minio.js";

import authRoutes from "./src/routes/auth.js";
import fileRoutes from "./src/routes/files.js";
import folderRoutes from "./src/routes/folders.js";
import sharingRoutes from "./src/routes/sharing.js";
import storageRoutes from "./src/routes/storage.js";
import recentRoutes from "./src/routes/recent.js";
import authMiddleware from "./src/middleware/auth.js";

const app = express();

// ── Middleware ──
app.use(cors());
app.use(express.json());

// ── Routes ──
app.use("/api/auth", authRoutes);
app.use("/api/files", authMiddleware, fileRoutes);
app.use("/api/folders", authMiddleware, folderRoutes);
app.use("/api/share", sharingRoutes);
app.use("/api/storage", authMiddleware, storageRoutes);
app.use("/api/recent", authMiddleware, recentRoutes);
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "docflow-backend" });
});

// ── Start Server ──
const PORT = process.env.PORT || 5001;

const start = async () => {
  await connectDB();
  await initMinioBucket();
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
};

start();
