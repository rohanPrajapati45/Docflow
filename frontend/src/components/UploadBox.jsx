import { useState, useRef } from "react";
import { uploadFile } from "../api/index.js";
import "./UploadBox.css";

const UploadBox = ({ onUploadSuccess }) => {
  const [file, setFile] = useState(null);
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const fileInputRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setMessage({ text: "Please select a file", type: "error" });
      return;
    }

    setLoading(true);
    setMessage({ text: "", type: "" });

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (category.trim()) {
        formData.append("category", category.trim());
      }

      await uploadFile(formData);

      setMessage({ text: "File uploaded successfully!", type: "success" });
      setFile(null);
      setCategory("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (onUploadSuccess) onUploadSuccess();
    } catch (err) {
      setMessage({
        text: err.response?.data?.error || "Upload failed",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="upload-box">
      <h3 className="upload-title">Upload File</h3>

      <form onSubmit={handleSubmit} className="upload-form">
        <div className="upload-file-area" onClick={() => fileInputRef.current?.click()}>
          <input
            ref={fileInputRef}
            type="file"
            onChange={(e) => setFile(e.target.files[0])}
            hidden
          />
          <div className="upload-icon">📁</div>
          <p className="upload-label">
            {file ? file.name : "Click to select a file"}
          </p>
          {file && (
            <span className="upload-size">
              {(file.size / 1024).toFixed(1)} KB
            </span>
          )}
        </div>

        <input
          type="text"
          className="upload-category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Category (optional)"
        />

        <button type="submit" className="upload-btn" disabled={loading}>
          {loading ? "Uploading..." : "Upload"}
        </button>
      </form>

      {message.text && (
        <div className={`upload-message ${message.type}`}>{message.text}</div>
      )}
    </div>
  );
};

export default UploadBox;
