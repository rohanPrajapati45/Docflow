import "dotenv/config";

import express from "express";
import cors from "cors";

import connectDB from "./src/config/db.js";
import redis from "./src/config/redis.js";
import { initMinioBucket } from "./src/config/minio.js";

import authRoutes from "./src/routes/auth.js";
import fileRoutes from "./src/routes/files.js";
import authMiddleware from "./src/middleware/auth.js";

const app = express();

// ── Middleware ──
app.use(cors());
app.use(express.json());

// ── Routes ──
app.use("/api/auth", authRoutes);
app.use("/api/files", authMiddleware, fileRoutes);

// ── Start Server ──
const PORT = process.env.PORT || 5000;

const start = async () => {
  await connectDB();
  await initMinioBucket();
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
};

start();
