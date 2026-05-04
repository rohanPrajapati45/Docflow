import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  getAllFiles,
  getRecentFiles,
  uploadFile,
  deleteFile,
  toggleStar,
  updateTags,
  getFileDownload,
  getFilePreview,
  createFolder,
  createShareLink,
  getVersions,
} from "../api/index.js";
import Navbar from "../components/Navbar.jsx";
import Sidebar from "../components/Sidebar.jsx";
import FileList from "../components/FileList.jsx";
import UploadBox from "../components/UploadBox.jsx";
import { getAllTags as extractTags } from "../utils/helpers.js";
import "./Dashboard.css";

const Dashboard = () => {
  const navigate = useNavigate();
  const username = localStorage.getItem("username") || "User";

  // State
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFolder, setActiveFolder] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [selectedTag, setSelectedTag] = useState(null);
  const [recentFiles, setRecentFiles] = useState([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareFile, setShareFile] = useState(null);
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [versionFile, setVersionFile] = useState(null);
  const [versions, setVersions] = useState([]);
  const [tags, setTags] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }
    loadFiles();
    loadRecent();
  }, [activeFolder, selectedTag]);

  const loadFiles = async () => {
    setLoading(true);
    try {
      const params = {};
      if (activeFolder && activeFolder !== "recent" && activeFolder !== "starred") {
        params.folderId = activeFolder;
      }
      if (selectedTag) {
        params.tag = selectedTag;
      }
      if (activeFolder === "starred") {
        params.starred = "true";
      }

      const { data } = await getAllFiles(params);
      setFiles(data);
      const allTags = extractTags(data);
      setTags(allTags);
    } catch (error) {
      toast.error("Failed to load files");
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  const loadRecent = async () => {
    try {
      const { data } = await getRecentFiles();
      setRecentFiles(data);
    } catch (error) {
      console.error("Failed to load recent files");
    }
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
  };

  const handleUpload = async (fileData) => {
    try {
      const formData = new FormData();
      formData.append("file", fileData.file);
      if (fileData.folderId) formData.append("folderId", fileData.folderId);
      if (fileData.tags) formData.append("tags", JSON.stringify(fileData.tags));

      const { data } = await uploadFile(formData);
      setShowUploadModal(false);
      toast.success("File uploaded successfully");
      loadFiles();
    } catch (error) {
      toast.error(error.response?.data?.error || "Upload failed");
    }
  };

  const handleDelete = async (file) => {
    try {
      await deleteFile(file.fileId);
      toast.success("File deleted");
      loadFiles();
    } catch (error) {
      toast.error("Failed to delete file");
    }
  };

  const handleStar = async (file) => {
    try {
      await toggleStar(file.fileId);
      toast.success(file.starred ? "Unstarred" : "Starred");
      loadFiles();
    } catch (error) {
      toast.error("Failed to update star");
    }
  };

  const handlePreview = async (file) => {
    try {
      const { data } = await getFilePreview(file.fileId);
      setPreviewFile(file);
      setPreviewUrl(data.previewUrl);
      setShowPreviewModal(true);
    } catch (error) {
      toast.error("Failed to load preview");
    }
  };

  const handleDownload = async (file) => {
    try {
      const { data } = await getFileDownload(file.fileId);
      window.open(data.downloadUrl, "_blank");
      toast.success("Download started");
    } catch (error) {
      toast.error("Failed to download file");
    }
  };

  const handleShare = (file) => {
    setShareFile(file);
    setShowShareModal(true);
  };

  const handleVersions = async (file) => {
    try {
      const { data } = await getVersions(file.fileId);
      setVersions(data.versions);
      setVersionFile(file);
      setShowVersionModal(true);
    } catch (error) {
      toast.error("Failed to load versions");
    }
  };

  // Filter files based on search
  let displayedFiles = activeFolder === "recent" ? recentFiles : files;
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    displayedFiles = displayedFiles.filter(
      (file) =>
        file.originalName.toLowerCase().includes(query) ||
        (file.category || "").toLowerCase().includes(query) ||
        (file.tags || []).some((tag) => tag.toLowerCase().includes(query))
    );
  }

  return (
    <div className="dashboard">
      <Sidebar
        activeFolder={activeFolder}
        onFolderSelect={setActiveFolder}
        onViewChange={setViewMode}
        tags={tags}
        onTagSelect={setSelectedTag}
      />

      <div className="dashboard-main">
        <Navbar
          onSearch={handleSearch}
          onUpload={() => setShowUploadModal(true)}
          userName={username}
        />

        <main className="dashboard-content">
          <div className="content-area">
            <FileList
              files={displayedFiles}
              loading={loading}
              onPreview={handlePreview}
              onDownload={handleDownload}
              onDelete={handleDelete}
              onShare={handleShare}
              onStar={handleStar}
              onVersions={handleVersions}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
            />
          </div>
        </main>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Upload File</h2>
              <button
                className="btn-icon"
                onClick={() => setShowUploadModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <UploadBox onUploadSuccess={() => {
                setShowUploadModal(false);
                loadFiles();
              }} />
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && previewFile && (
        <div className="modal-overlay" onClick={() => setShowPreviewModal(false)}>
          <div className="preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="preview-content">
              {previewFile.mimetype.startsWith("image/") && (
                <img
                  src={previewUrl}
                  alt={previewFile.originalName}
                  className="preview-image"
                />
              )}
              {previewFile.mimetype === "application/pdf" && (
                <iframe
                  src={previewUrl}
                  className="preview-pdf"
                />
              )}
              {previewFile.mimetype.startsWith("video/") && (
                <video
                  controls
                  className="preview-video"
                  src={previewUrl}
                />
              )}
            </div>
            <button
              className="btn-close"
              onClick={() => {
                setShowPreviewModal(false);
                setPreviewUrl("");
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
