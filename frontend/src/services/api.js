import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api"
});

// Attach JWT from localStorage automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("sp_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Optionally handle global error cases
    if (error.response?.status === 401) {
      // Unauthorized - token expired or invalid
      localStorage.removeItem("sp_token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
