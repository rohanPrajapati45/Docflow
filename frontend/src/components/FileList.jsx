import { downloadFile, deleteFile } from "../api/index.js";
import "./FileList.css";

const FileList = ({ files, onDeleteSuccess }) => {
  const handleDownload = async (fileId) => {
    try {
      const { data } = await downloadFile(fileId);
      window.open(data.downloadUrl, "_blank");
    } catch {
      alert("Download failed");
    }
  };

  const handleDelete = async (fileId) => {
    if (!confirm("Delete this file?")) return;

    try {
      await deleteFile(fileId);
      if (onDeleteSuccess) onDeleteSuccess();
    } catch {
      alert("Delete failed");
    }
  };

  if (!files || files.length === 0) {
    return (
      <div className="filelist-empty">
        <span className="filelist-empty-icon">📂</span>
        <p>No files found</p>
      </div>
    );
  }

  return (
    <div className="filelist-grid">
      {files.map((file) => (
        <div key={file.fileId} className="file-card">
          <div className="file-card-header">
            <span className="file-card-name" title={file.originalName}>
              {file.originalName}
            </span>
            <span className="file-card-category">{file.category}</span>
          </div>

          <div className="file-card-meta">
            <span>{(file.size / 1024).toFixed(1)} KB</span>
            <span>{new Date(file.uploadedAt).toLocaleDateString()}</span>
          </div>

          <div className="file-card-uploader">
            Uploaded by <strong>{file.uploadedBy}</strong>
          </div>

          <div className="file-card-actions">
            <button
              className="file-btn download"
              onClick={() => handleDownload(file.fileId)}
            >
              Download
            </button>
            <button
              className="file-btn delete"
              onClick={() => handleDelete(file.fileId)}
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default FileList;
