import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import toast from "react-hot-toast";
import { Upload, X } from "lucide-react";
import { uploadFile, getFolders } from "../api/index.js";
import "./UploadBox.css";

const UploadBox = ({ onUploadSuccess }) => {
  const [files, setFiles] = useState([]);
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState("");
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});

  // Load folders on mount
  useEffect(() => {
    loadFolders();
  }, []);

  const loadFolders = async () => {
    try {
      const { data } = await getFolders();
      setFolders(data);
    } catch (error) {
      console.error("Failed to load folders");
    }
  };

  const onDrop = useCallback((acceptedFiles) => {
    setFiles((prev) => [
      ...prev,
      ...acceptedFiles.map((file) => ({
        file,
        id: Math.random(),
        progress: 0,
      })),
    ]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
  });

  const removeFile = (fileId) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const addTag = (e) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput)) {
        setTags([...tags, tagInput]);
      }
      setTagInput("");
    }
  };

  const removeTag = (tag) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error("Please select files to upload");
      return;
    }

    setLoading(true);

    try {
      for (const fileItem of files) {
        const formData = new FormData();
        formData.append("file", fileItem.file);
        if (category) formData.append("category", category);
        if (tags.length > 0) formData.append("tags", JSON.stringify(tags));
        if (selectedFolder) formData.append("folderId", selectedFolder);

        await uploadFile(formData);
        setUploadProgress((prev) => ({ ...prev, [fileItem.id]: 100 }));
      }

      toast.success("Files uploaded successfully!");
      setFiles([]);
      setCategory("");
      setTags([]);
      setTagInput("");
      setSelectedFolder(null);
      if (onUploadSuccess) onUploadSuccess();
    } catch (error) {
      toast.error(error.response?.data?.error || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="upload-box">
      <div className="upload-header">
        <Upload size={24} className="upload-icon" />
        <h3>Upload Files</h3>
      </div>

      {/* Drag & Drop Zone */}
      <div
        {...getRootProps()}
        className={`upload-dropzone ${isDragActive ? "active" : ""}`}
      >
        <input {...getInputProps()} />
        <div className="dropzone-content">
          <Upload size={48} className="dropzone-icon" />
          <p className="dropzone-text">
            {isDragActive
              ? "Drop files here..."
              : "Drag & drop files here, or click to select"}
          </p>
          <p className="dropzone-hint">Supported: Images, PDFs, Videos, Documents</p>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="upload-files-list">
          <p className="files-count">{files.length} file(s) selected</p>
          {files.map((fileItem) => (
            <div key={fileItem.id} className="file-item">
              <div className="file-info">
                <p className="file-name">{fileItem.file.name}</p>
                <p className="file-size">
                  {(fileItem.file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <div className="file-progress">
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${uploadProgress[fileItem.id] || 0}%` }}
                  />
                </div>
              </div>
              <button
                type="button"
                className="btn-remove"
                onClick={() => removeFile(fileItem.id)}
                disabled={loading}
              >
                <X size={18} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Metadata */}
      {files.length > 0 && (
        <div className="upload-metadata">
          <div className="metadata-group">
            <label htmlFor="category">Category</label>
            <input
              id="category"
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g., Work, Personal"
            />
          </div>

          <div className="metadata-group">
            <label htmlFor="folder">Folder (optional)</label>
            <select
              id="folder"
              value={selectedFolder || ""}
              onChange={(e) => setSelectedFolder(e.target.value || null)}
            >
              <option value="">Root</option>
              {folders.map((folder) => (
                <option key={folder._id} value={folder._id}>
                  {folder.name}
                </option>
              ))}
            </select>
          </div>

          <div className="metadata-group">
            <label htmlFor="tags">Tags</label>
            <input
              id="tags"
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={addTag}
              placeholder="Type and press Enter to add"
            />
            {tags.length > 0 && (
              <div className="tags-list">
                {tags.map((tag) => (
                  <span key={tag} className="tag">
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="tag-remove"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Upload Button */}
      {files.length > 0 && (
        <button
          onClick={handleUpload}
          className="btn btn-primary upload-submit"
          disabled={loading}
        >
          {loading ? "Uploading..." : `Upload ${files.length} file(s)`}
        </button>
      )}
    </div>
  );
};

export default UploadBox;
