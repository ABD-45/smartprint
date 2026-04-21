import axios from "axios";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({ baseURL: BASE });

// Attach JWT from localStorage automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("sp_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const authService = {
  register: async (data) => {
    const res = await api.post("/auth/register", data);
    return res.data;
  },
  login: async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    return res.data;
  },
  getMe: async (token) => {
    const res = await api.get("/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  },
  updateProfile: async (data) => {
    const res = await api.put("/auth/profile", data);
    return res.data;
  },
  requestOTP: async (phone) => {
    const res = await api.post("/auth/request-otp", { phone });
    return res.data;
  },
  verifyOTP: async (phone, otp) => {
    const res = await api.post("/auth/verify-otp", { phone, otp });
    return res.data;
  },
};
