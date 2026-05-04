import React, { useState } from "react";
import { Search, Upload, LogOut, User, Menu, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./Navbar.css";

const Navbar = ({ onSearch, onUpload, userName }) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [showProfile, setShowProfile] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    onSearch(value);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    navigate("/login");
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Mobile menu toggle */}
        <button className="mobile-toggle">
          {showMobileMenu ? (
            <X size={24} onClick={() => setShowMobileMenu(false)} />
          ) : (
            <Menu size={24} onClick={() => setShowMobileMenu(true)} />
          )}
        </button>

        {/* Search bar */}
        <div className="search-wrapper">
          <Search size={20} className="search-icon" />
          <input
            type="text"
            placeholder="Search files, folders, tags..."
            value={searchQuery}
            onChange={handleSearch}
            className="search-input"
          />
        </div>

        {/* Right actions */}
        <div className="navbar-actions">
          <button className="btn btn-primary" onClick={onUpload}>
            <Upload size={18} />
            Upload
          </button>

          {/* User profile */}
          <div className="profile-menu">
            <button
              className="profile-button"
              onClick={() => setShowProfile(!showProfile)}
              title={userName}
            >
              <div className="avatar">
                {userName ? userName[0].toUpperCase() : "U"}
              </div>
            </button>

            {showProfile && (
              <div className="profile-dropdown">
                <div className="profile-header">
                  <div className="avatar-large">
                    {userName ? userName[0].toUpperCase() : "U"}
                  </div>
                  <div>
                    <p className="profile-name">{userName || "User"}</p>
                    <p className="profile-email">Logged in</p>
                  </div>
                </div>
                <hr />
                <button className="profile-item" onClick={() => setShowProfile(false)}>
                  <User size={18} />
                  Profile Settings
                </button>
                <button className="profile-item logout" onClick={handleLogout}>
                  <LogOut size={18} />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
