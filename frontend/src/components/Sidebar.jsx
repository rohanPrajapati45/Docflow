import React, { useState, useEffect } from "react";
import {
  HardDrive,
  Folder,
  Star,
  Clock,
  MoreVertical,
  Plus,
  Trash2,
} from "lucide-react";
import { getFolders, deleteFolder, getStorageInfo, createFolder } from "../api/index.js";
import toast from "react-hot-toast";
import "./Sidebar.css";

const Sidebar = ({
  activeFolder,
  onFolderSelect,
  onViewChange,
  tags,
  onTagSelect,
}) => {
  const [folders, setFolders] = useState([]);
  const [storage, setStorage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderColor, setNewFolderColor] = useState("#1A73E8");

  useEffect(() => {
    loadFolders();
    loadStorage();
    const interval = setInterval(loadStorage, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const loadFolders = async () => {
    try {
      const response = await getFolders();
      setFolders(response.data);
    } catch (error) {
      console.error("Failed to load folders:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadStorage = async () => {
    try {
      const response = await getStorageInfo();
      setStorage(response.data);
    } catch (error) {
      console.error("Failed to load storage:", error);
    }
  };

  const handleDeleteFolder = async (folderId) => {
    if (!window.confirm("Delete this folder? Files will be moved to root.")) return;

    try {
      await deleteFolder(folderId);
      loadFolders();
      onFolderSelect(null);
      toast.success("Folder deleted");
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to delete folder");
    }
  };

  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) {
      toast.error("Folder name required");
      return;
    }

    try {
      await createFolder({ name: newFolderName.trim(), color: newFolderColor });
      loadFolders();
      setShowNewFolder(false);
      setNewFolderName("");
      setNewFolderColor("#1A73E8");
      toast.success("Folder created");
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to create folder");
    }
  };

  const formatStorageSize = (bytes) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <HardDrive size={28} className="logo-icon" />
        <h1>DocFlow</h1>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <button
          className={`nav-item ${activeFolder === null ? "active" : ""}`}
          onClick={() => onFolderSelect(null)}
        >
          <HardDrive size={20} />
          My Drive
        </button>
        <button
          className={`nav-item ${activeFolder === "recent" ? "active" : ""}`}
          onClick={() => onFolderSelect("recent")}
        >
          <Clock size={20} />
          Recent
        </button>
        <button
          className={`nav-item ${activeFolder === "starred" ? "active" : ""}`}
          onClick={() => onFolderSelect("starred")}
        >
          <Star size={20} />
          Starred
        </button>
        <button
          className={`nav-item ${activeFolder === "trash" ? "active" : ""}`}
          onClick={() => onFolderSelect("trash")}
        >
          <Trash2 size={20} />
          Trash
        </button>
      </nav>

      <hr className="sidebar-divider" />

      {/* Folders Section */}
      <div className="sidebar-section">
        <div className="section-header">
          <h3>Folders</h3>
          <button
            className="btn-icon"
            onClick={() => setShowNewFolder(!showNewFolder)}
            title="Create folder"
          >
            <Plus size={18} />
          </button>
        </div>

        {showNewFolder && (
          <form onSubmit={handleCreateFolder} className="new-folder-form">
            <input
              type="text"
              placeholder="Folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              autoFocus
            />
            <input
              type="color"
              value={newFolderColor}
              onChange={(e) => setNewFolderColor(e.target.value)}
              title="Folder color"
            />
            <button type="submit" className="btn btn-primary">
              Create
            </button>
          </form>
        )}

        <div className="folders-list">
          {loading ? (
            <p className="text-secondary">Loading...</p>
          ) : folders.length === 0 ? (
            <p className="text-secondary">No folders yet</p>
          ) : (
            folders.map((folder) => (
              <div key={folder.folderId} className="folder-item">
                <button
                  className={`folder-name ${
                    activeFolder === folder._id ? "active" : ""
                  }`}
                  onClick={() => onFolderSelect(folder._id)}
                >
                  <Folder
                    size={18}
                    style={{ color: folder.color }}
                    fill={folder.color}
                  />
                  <span>{folder.name}</span>
                </button>
                <button
                  className="btn-icon"
                  onClick={() => handleDeleteFolder(folder.folderId)}
                >
                  <MoreVertical size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Tags Section */}
      {tags.length > 0 && (
        <>
          <hr className="sidebar-divider" />
          <div className="sidebar-section">
            <h3 className="section-title">Tags</h3>
            <div className="tags-cloud">
              {tags.map((tag) => (
                <button
                  key={tag}
                  className="tag-badge"
                  onClick={() => onTagSelect(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <hr className="sidebar-divider" />

      {/* Storage */}
      <div className="sidebar-storage">
        <div className="storage-info">
          <p className="storage-label">
            {storage ? formatStorageSize(storage.used) : "0 B"} of{" "}
            {storage ? formatStorageSize(storage.limit) : "500 MB"}
          </p>
          <div className="storage-bar">
            <div
              className="storage-used"
              style={{
                width: `${storage ? storage.percentage : 0}%`,
              }}
            />
          </div>
          {storage && storage.percentage > 90 && (
            <p className="storage-warning">Storage almost full!</p>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
