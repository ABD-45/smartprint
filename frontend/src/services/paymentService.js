import axios from "axios";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({ baseURL: BASE });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("sp_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const paymentService = {
  createOrder: async (jobId) => {
    const res = await api.post("/payments/create-order", { jobId });
    return res.data;
  },
  verifyPayment: async (data) => {
    const res = await api.post("/payments/verify", data);
    return res.data;
  },
  getMyPayments: async () => {
    const res = await api.get("/payments/my");
    return res.data;
  },
};
