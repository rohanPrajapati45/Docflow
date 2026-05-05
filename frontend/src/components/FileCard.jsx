import React, { useEffect, useState } from "react";
import {
  MoreVertical,
  Star,
  Download,
  Trash2,
  Share2,
  Eye,
  History,
  Edit3,
} from "lucide-react";
import { getFilePreview } from "../api/index.js";
import { formatDate, getFileIcon, getFileTypeColor } from "../utils/helpers.js";
import "./FileCard.css";

const FileCard = ({ file, onPreview, onDownload, onDelete, onShare, onStar, onVersions }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const isImage = file.mimetype.startsWith("image/");
  const isPDF = file.mimetype === "application/pdf";
  const isVideo = file.mimetype.startsWith("video/");

  useEffect(() => {
    if (!isImage) return;

    // Use backend proxy URL directly for thumbnails
    const token = localStorage.getItem("token");
    if (token) {
      setThumbnailUrl(`http://localhost:5000/api/files/${file.fileId}/raw?token=${token}`);
    }
  }, [file.fileId, isImage]);

  return (
    <div className={`file-card ${isImage || isPDF || isVideo ? "has-preview" : ""}`}>
      {/* Preview thumbnail */}
      <div className="file-preview">
        {isImage ? (
          thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={file.originalName}
              className="file-thumbnail"
              onError={() => setThumbnailUrl("")}
            />
          ) : (
            <div className="file-icon" style={{ backgroundColor: getFileTypeColor(file.mimetype) }}>
              {getFileIcon(file.mimetype)}
            </div>
          )
        ) : (
          <div className="file-icon" style={{ backgroundColor: getFileTypeColor(file.mimetype) }}>
            {getFileIcon(file.mimetype)}
          </div>
        )}

        {/* Overlay actions */}
        <div className="file-overlay">
          <button
            className="btn-action"
            onClick={() => onPreview(file)}
            title="Preview"
          >
            <Eye size={20} />
          </button>
          <button
            className="btn-action"
            onClick={() => onDownload(file)}
            title="Download"
          >
            <Download size={20} />
          </button>
        </div>

        {/* Star badge */}
        {file.starred && (
          <div className="star-badge">
            <Star size={16} fill="currentColor" />
          </div>
        )}

        {/* Compression info */}
        {file.isCompressed && (
          <div className="compression-badge">
            Compressed
          </div>
        )}
      </div>

      {/* File info */}
      <div className="file-info">
        <h3 className="file-name" title={file.originalName}>
          {file.originalName}
        </h3>

        <div className="file-meta">
          <span className="file-size">
            {formatFileSize(file.size)}
          </span>
          <span className="file-date">
            {formatDate(file.uploadedAt)}
          </span>
        </div>

        {/* Tags */}
        {file.tags && file.tags.length > 0 && (
          <div className="file-tags">
            {file.tags.slice(0, 2).map((tag) => (
              <span key={tag} className="tag">
                {tag}
              </span>
            ))}
            {file.tags.length > 2 && (
              <span className="tag-more">+{file.tags.length - 2}</span>
            )}
          </div>
        )}
      </div>

      {/* Menu */}
      <div className="file-menu">
        <button
          className="btn-menu"
          onClick={() => setShowMenu(!showMenu)}
        >
          <MoreVertical size={20} />
        </button>

        {showMenu && (
          <div className="menu-dropdown">
            <button
              className="menu-item"
              onClick={() => {
                onPreview(file);
                setShowMenu(false);
              }}
            >
              <Eye size={16} />
              Preview
            </button>
            <button
              className="menu-item"
              onClick={() => {
                onDownload(file);
                setShowMenu(false);
              }}
            >
              <Download size={16} />
              Download
            </button>
            <button
              className="menu-item"
              onClick={() => {
                onStar(file);
                setShowMenu(false);
              }}
            >
              <Star size={16} />
              {file.starred ? "Unstar" : "Star"}
            </button>
            <button
              className="menu-item"
              onClick={() => {
                onShare(file);
                setShowMenu(false);
              }}
            >
              <Share2 size={16} />
              Share
            </button>
            <button
              className="menu-item"
              onClick={() => {
                onVersions(file);
                setShowMenu(false);
              }}
            >
              <History size={16} />
              Versions
            </button>
            <hr />
            <button
              className="menu-item delete"
              onClick={() => {
                if (window.confirm("Delete this file?")) {
                  onDelete(file);
                  setShowMenu(false);
                }
              }}
            >
              <Trash2 size={16} />
              Delete
            </button>
          </div>
        )}
      </div>
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

export default FileCard;
