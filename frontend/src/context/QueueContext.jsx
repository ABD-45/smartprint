import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { queueService } from "../services/queueService";
import socket from "../services/socket";

const QueueContext = createContext(null);

export const QueueProvider = ({ children }) => {
  const { token, isAuthenticated } = useAuth();
  const [queue, setQueue] = useState([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !token) return;

    // Authenticate socket with JWT token
    socket.auth = { token };
    socket.connect();

    socket.on("connect", async () => {
      setConnected(true);
      socket.emit("joinQueue");
      // Immediately fetch current queue via HTTP so we don't wait for next broadcast
      try {
        const data = await queueService.getQueue();
        const jobs = Array.isArray(data.queue) ? data.queue : [];
        const sorted = [...jobs].sort((a, b) => (a.queuePosition ?? 999) - (b.queuePosition ?? 999));
        setQueue(sorted);
      } catch (_) { /* socket will eventually deliver updates */ }
    });

    socket.on("disconnect", () => setConnected(false));

    socket.on("queueUpdate", (payload) => {
      // payload = { timestamp, queue: [...jobs], stats }
      const jobs = Array.isArray(payload) ? payload : (payload?.queue ?? []);
      // Ensure sorted by queuePosition ascending
      const sorted = [...jobs].sort((a, b) => (a.queuePosition ?? 999) - (b.queuePosition ?? 999));
      setQueue(sorted);
    });

    return () => {
      socket.disconnect();
      setConnected(false);
    };
  }, [isAuthenticated, token]);

  const joinJob = (jobId) => {
    if (socket) socket.emit("joinJob", jobId);
  };

  const onJobUpdate = (jobId, callback) => {
    if (!socket) return;
    socket.on("jobStatusUpdate", (data) => {
      if (data.jobId === jobId || !data.jobId) callback(data);
    });
    return () => socket.off("jobStatusUpdate", callback);
  };

  return (
    <QueueContext.Provider value={{ queue, connected, socket, joinJob, onJobUpdate }}>
      {children}
    </QueueContext.Provider>
  );
};

export const useQueue = () => {
  const ctx = useContext(QueueContext);
  if (!ctx) throw new Error("useQueue must be used inside QueueProvider");
  return ctx;
};
