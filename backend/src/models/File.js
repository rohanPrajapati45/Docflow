import mongoose from "mongoose";

const fileSchema = new mongoose.Schema({
  fileId: {
    type: String,
    required: true,
    unique: true,
  },
  originalName: {
    type: String,
    required: true,
  },
  size: {
    type: Number,
    required: true,
  },
  mimetype: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    default: "general",
  },
  tags: {
    type: [String],
    default: [],
  },
  folderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Folder",
    default: null, // null = root
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  starred: {
    type: Boolean,
    default: false,
  },
  isCompressed: {
    type: Boolean,
    default: false,
  },
  originalSize: {
    type: Number,
    default: null, // Set if compressed
  },
  currentMinioKey: {
    type: String,
    required: true,
  },
  versions: [
    {
      versionId: String,
      minioKey: String,
      size: Number,
      uploadedAt: Date,
    },
  ],
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

const File = mongoose.model("File", fileSchema);

export default File;
