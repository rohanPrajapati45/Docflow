import React from "react";
import {
  File,
  FileText,
  Image,
  Music,
  Video,
  Archive,
  Code,
  FileJson,
} from "lucide-react";

export function formatDate(date) {
  if (!date) return "";
  const d = new Date(date);
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export function formatFileSize(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

export function getFileIcon(mimetype) {
  if (!mimetype) return React.createElement(File, { size: 48 });

  if (mimetype.startsWith("image/")) {
    return React.createElement(Image, { size: 48 });
  } else if (mimetype.startsWith("video/")) {
    return React.createElement(Video, { size: 48 });
  } else if (mimetype.startsWith("audio/")) {
    return React.createElement(Music, { size: 48 });
  } else if (mimetype === "application/pdf") {
    return React.createElement(FileText, { size: 48 });
  } else if (
    mimetype.includes("zip") ||
    mimetype.includes("rar") ||
    mimetype.includes("7z")
  ) {
    return React.createElement(Archive, { size: 48 });
  } else if (mimetype.includes("json")) {
    return React.createElement(FileJson, { size: 48 });
  } else if (
    mimetype.includes("javascript") ||
    mimetype.includes("typescript") ||
    mimetype.includes("python") ||
    mimetype.includes("java")
  ) {
    return React.createElement(Code, { size: 48 });
  } else if (
    mimetype.includes("word") ||
    mimetype.includes("document") ||
    mimetype === "text/plain"
  ) {
    return React.createElement(FileText, { size: 48 });
  }

  return React.createElement(File, { size: 48 });
}

export function getFileTypeColor(mimetype) {
  if (!mimetype) return "#9e9e9e";

  if (mimetype.startsWith("image/")) {
    return "#4caf50";
  } else if (mimetype.startsWith("video/")) {
    return "#ff9800";
  } else if (mimetype.startsWith("audio/")) {
    return "#2196f3";
  } else if (mimetype === "application/pdf") {
    return "#f44336";
  } else if (
    mimetype.includes("zip") ||
    mimetype.includes("rar") ||
    mimetype.includes("7z")
  ) {
    return "#9c27b0";
  } else if (mimetype.includes("json") || mimetype.includes("code")) {
    return "#3f51b5";
  }

  return "#757575";
}

export function extractFileExtension(filename) {
  return filename.split(".").pop().toUpperCase();
}

export function isFilePreviewable(mimetype) {
  return [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
    "video/mp4",
  ].includes(mimetype);
}

export function bytesToSize(bytes) {
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  if (bytes === 0) return "0 Bytes";
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i];
}

export function formatStorageSize(bytes) {
  return bytesToSize(bytes);
}

export function getAllTags(files) {
  const tagsSet = new Set();
  files.forEach((file) => {
    if (file.tags && Array.isArray(file.tags)) {
      file.tags.forEach((tag) => tagsSet.add(tag));
    }
  });
  return Array.from(tagsSet).sort();
}
