import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";
import { queueService } from "../services/queueService";

const QueueContext = createContext(null);

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:5000";

export const QueueProvider = ({ children }) => {
  const { token, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);
  const [queue, setQueue] = useState([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !token) return;

    const s = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
    });

    s.on("connect", async () => {
      setConnected(true);
      s.emit("joinQueue");
      // Immediately fetch current queue via HTTP so we don't wait for next broadcast
      try {
        const data = await queueService.getQueue();
        const jobs = Array.isArray(data.queue) ? data.queue : [];
        const sorted = [...jobs].sort((a, b) => (a.queuePosition ?? 999) - (b.queuePosition ?? 999));
        setQueue(sorted);
      } catch (_) { /* socket will eventually deliver updates */ }
    });

    s.on("disconnect", () => setConnected(false));

    s.on("queueUpdate", (payload) => {
      // payload = { timestamp, queue: [...jobs], stats }
      const jobs = Array.isArray(payload) ? payload : (payload?.queue ?? []);
      // Ensure sorted by queuePosition ascending
      const sorted = [...jobs].sort((a, b) => (a.queuePosition ?? 999) - (b.queuePosition ?? 999));
      setQueue(sorted);
    });

    setSocket(s);

    return () => {
      s.disconnect();
      setSocket(null);
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
