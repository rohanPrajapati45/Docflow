import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5001/api",
});

// Attach JWT token to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("username");
      localStorage.removeItem("userId");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// ── Auth ──
export const registerUser = (data) => API.post("/auth/register", data);
export const loginUser = (data) => API.post("/auth/login", data);

// ── Files ──
export const uploadFile = (formData) =>
  API.post("/files/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const getAllFiles = (params) => API.get("/files", { params });

export const getFilePreview = (fileId) => API.get(`/files/${fileId}/preview`);

export const getFileDownload = (fileId) => API.get(`/files/${fileId}/download`);

export const deleteFile = (fileId) => API.delete(`/files/${fileId}`);

export const toggleStar = (fileId) => API.patch(`/files/${fileId}/star`);

export const updateTags = (fileId, tags) =>
  API.patch(`/files/${fileId}/tags`, { tags });

export const getVersions = (fileId) => API.get(`/files/${fileId}/versions`);

export const restoreVersion = (fileId, versionId) =>
  API.post(`/files/${fileId}/restore/${versionId}`);

export const deleteVersion = (fileId, versionId) =>
  API.delete(`/files/${fileId}/versions/${versionId}`);

// ── Folders ──
export const createFolder = (data) => API.post("/folders", data);

export const getFolders = () => API.get("/folders");

export const deleteFolder = (folderId) => API.delete(`/folders/${folderId}`);

// ── Sharing ──
export const createShareLink = (fileId, data) =>
  API.post(`/files/${fileId}/share`, data);

export const getShareLinks = (fileId) => API.get(`/files/${fileId}/share-links`);

export const deleteShareLink = (token) => API.delete(`/share/${token}`);

export const getPublicFile = (token) => API.get(`/share/${token}`);

// ── Storage ──
export const getStorageInfo = () => API.get("/storage");

// ── Recent ──
export const getRecentFiles = () => API.get("/recent");

export const searchFiles = (query) => API.get(`/files/search?q=${query}`);
