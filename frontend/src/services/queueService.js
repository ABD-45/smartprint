import api from "./api";

export const queueService = {
  getQueue: async () => {
    const res = await api.get("/queue");
    return res.data;
  },

  /**
   * Returns: { inQueue, position, queueNumber, etaMinutes, totalInQueue,
   *            jobsAhead, pagesAhead, waitingMinutes, priorityScore, job }
   */
  getPosition: async (jobId) => {
    const res = await api.get(`/queue/position/${jobId}`);
    return res.data;
  },

  getStats: async () => {
    const res = await api.get("/queue/stats");
    return res.data;
  },
};

export const adminService = {
  getAllJobs: async (params = {}) => {
    const res = await api.get("/admin/jobs", { params });
    return res.data;
  },
  getAnalytics: async (params = {}) => {
    const res = await api.get("/admin/analytics", { params });
    return res.data;
  },
  getTimeline: async (range = "daily") => {
    const res = await api.get("/admin/analytics/timeline", { params: { range } });
    return res.data;
  },
  getAllUsers: async (params = {}) => {
    const res = await api.get("/admin/users", { params });
    return res.data;
  },
  updateJobStatus: async (jobId, action, reason) => {
    const res = await api.patch(`/admin/jobs/${jobId}/status`, { action, reason });
    return res.data;
  },
  getQueueLive: async () => {
    const res = await api.get("/queue");
    return res.data;
  },
};
