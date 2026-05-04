import mongoose from "mongoose";

const shareLinkSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true,
  },
  fileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "File",
    required: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  maxDownloads: {
    type: Number,
    default: null, // null = unlimited
  },
  downloadCount: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const ShareLink = mongoose.model("ShareLink", shareLinkSchema);

export default ShareLink;
