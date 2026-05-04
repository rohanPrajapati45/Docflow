import mongoose from "mongoose";

const folderSchema = new mongoose.Schema({
  folderId: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  color: {
    type: String,
    default: "#1A73E8", // Google blue
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Folder = mongoose.model("Folder", folderSchema);

export default Folder;
