import api from "./api";

export const jobService = {
  /** Analyze a file to detect pages — does NOT create a job */
  analyzeFile: async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await api.post("/jobs/analyze", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  upload: async (formData, onProgress) => {
    const res = await api.post("/jobs/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (e) => {
        if (onProgress) onProgress(Math.round((e.loaded * 100) / e.total));
      },
    });
    return res.data;
  },
  getMyJobs: async () => {
    const res = await api.get("/jobs/my");
    return res.data;
  },
  getJob: async (id) => {
    const res = await api.get(`/jobs/${id}`);
    return res.data;
  },
  getOTP: async (id) => {
    const res = await api.get(`/jobs/${id}/otp`);
    return res.data;
  },
  verifyOTP: async (id, otp) => {
    const res = await api.post(`/jobs/${id}/verify-otp`, { otp });
    return res.data;
  },
};
