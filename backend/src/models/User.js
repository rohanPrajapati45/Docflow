import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  storageUsed: {
    type: Number,
    default: 0, // in bytes
  },
  storageLimit: {
    type: Number,
    default: 524288000, // 500 MB default
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const User = mongoose.model("User", userSchema);

export default User;
