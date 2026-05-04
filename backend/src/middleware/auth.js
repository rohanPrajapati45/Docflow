import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const authMiddleware = (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const userId = decoded.id || decoded.userId;
    if (!userId) {
      return res.status(401).json({ error: "Token missing user id. Please log in again." });
    }

    if (!mongoose.Types.ObjectId.isValid(String(userId))) {
      return res.status(401).json({ error: "Invalid token payload. Please log in again." });
    }

    req.user = {
      ...decoded,
      id: String(userId),
    };
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
};

export default authMiddleware;
