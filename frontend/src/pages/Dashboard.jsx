import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAllFiles } from "../api/index.js";
import UploadBox from "../components/UploadBox.jsx";
import SearchBar from "../components/SearchBar.jsx";
import FileList from "../components/FileList.jsx";
import "./Dashboard.css";

const Dashboard = () => {
  const [files, setFiles] = useState([]);
  const [searchResults, setSearchResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const username = localStorage.getItem("username") || "User";

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const { data } = await getAllFiles();
      setFiles(data);
    } catch {
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    navigate("/login");
  };

  const handleSearchResults = (results) => {
    setSearchResults(results);
  };

  const handleUploadSuccess = () => {
    setSearchResults(null);
    fetchFiles();
  };

  const displayedFiles = searchResults !== null ? searchResults : files;

  return (
    <div className="dashboard">
      <nav className="dashboard-nav">
        <h1 className="dashboard-logo">DocFlow</h1>
        <div className="dashboard-nav-right">
          <span className="dashboard-user">👤 {username}</span>
          <button className="dashboard-logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </nav>

      <main className="dashboard-main">
        <div className="dashboard-sidebar">
          <UploadBox onUploadSuccess={handleUploadSuccess} />
        </div>

        <div className="dashboard-content">
          <SearchBar onSearchResults={handleSearchResults} />

          <div className="dashboard-files">
            {loading ? (
              <p className="dashboard-loading">Loading files...</p>
            ) : (
              <FileList files={displayedFiles} onDeleteSuccess={fetchFiles} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
