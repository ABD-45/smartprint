import api from "./api";

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
