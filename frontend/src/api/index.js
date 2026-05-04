import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api",
});

// Attach JWT token to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Auth ──
export const registerUser = (data) => API.post("/auth/register", data);
export const loginUser = (data) => API.post("/auth/login", data);

// ── Files ──
export const uploadFile = (formData) =>
  API.post("/files/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const getAllFiles = () => API.get("/files");

export const downloadFile = (fileId) => API.get(`/files/${fileId}`);

export const deleteFile = (fileId) => API.delete(`/files/${fileId}`);

export const searchFiles = (query) => API.get(`/files/search?q=${query}`);
