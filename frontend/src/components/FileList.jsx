import React, { useState } from "react";
import { Grid3x3, List } from "lucide-react";
import FileCard from "./FileCard.jsx";
import "./FileList.css";

const FileList = ({
  files,
  loading,
  onPreview,
  onDownload,
  onDelete,
  onShare,
  onStar,
  onVersions,
  viewMode = "grid",
  onViewModeChange,
}) => {
  const [sortBy, setSortBy] = useState("date");

  const sortedFiles = [...files].sort((a, b) => {
    switch (sortBy) {
      case "name":
        return a.originalName.localeCompare(b.originalName);
      case "size":
        return b.size - a.size;
      case "date":
      default:
        return new Date(b.uploadedAt) - new Date(a.uploadedAt);
    }
  });

  if (loading) {
    return (
      <div className="file-list-loading">
        <div className="spinner"></div>
        <p>Loading files...</p>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📁</div>
        <h3>No files yet</h3>
        <p>Upload your first file to get started!</p>
      </div>
    );
  }

  return (
    <div className="file-list-container">
      {/* Controls */}
      <div className="file-list-controls">
        <div className="sort-controls">
          <label htmlFor="sort">Sort by:</label>
          <select
            id="sort"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="date">Date</option>
            <option value="name">Name</option>
            <option value="size">Size</option>
          </select>
        </div>

        <div className="view-controls">
          <button
            className={`view-btn ${viewMode === "grid" ? "active" : ""}`}
            onClick={() => onViewModeChange("grid")}
            title="Grid view"
          >
            <Grid3x3 size={20} />
          </button>
          <button
            className={`view-btn ${viewMode === "list" ? "active" : ""}`}
            onClick={() => onViewModeChange("list")}
            title="List view"
          >
            <List size={20} />
          </button>
        </div>
      </div>

      {/* Grid view */}
      {viewMode === "grid" && (
        <div className="files-grid">
          {sortedFiles.map((file) => (
            <FileCard
              key={file._id}
              file={file}
              onPreview={onPreview}
              onDownload={onDownload}
              onDelete={onDelete}
              onShare={onShare}
              onStar={onStar}
              onVersions={onVersions}
            />
          ))}
        </div>
      )}

      {/* List view */}
      {viewMode === "list" && (
        <div className="files-list">
          <div className="list-header">
            <div className="col-name">Name</div>
            <div className="col-type">Type</div>
            <div className="col-size">Size</div>
            <div className="col-date">Modified</div>
            <div className="col-actions">Actions</div>
          </div>
          {sortedFiles.map((file) => (
            <div key={file._id} className="list-row">
              <div className="col-name">{file.originalName}</div>
              <div className="col-type">{file.mimetype.split("/")[1]}</div>
              <div className="col-size">{formatFileSize(file.size)}</div>
              <div className="col-date">{new Date(file.uploadedAt).toLocaleDateString()}</div>
              <div className="col-actions">
                <button
                  className="action-btn"
                  onClick={() => onPreview(file)}
                  title="Preview"
                >
                  👁️
                </button>
                <button
                  className="action-btn"
                  onClick={() => onDownload(file)}
                  title="Download"
                >
                  ↓
                </button>
                <button
                  className="action-btn"
                  onClick={() => onShare(file)}
                  title="Share"
                >
                  🔗
                </button>
                <button
                  className="action-btn delete"
                  onClick={() => {
                    if (window.confirm("Delete this file?")) {
                      onDelete(file);
                    }
                  }}
                  title="Delete"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

function formatFileSize(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

export default FileList;
