import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useQueue } from "../../context/QueueContext";
import { QueueList } from "../../components/QueueList";
import { StatusBadge } from "../../components/StatusBadge";
import { OTPModal } from "../../components/OTPModal";
import { adminService } from "../../services/queueService";

const formatDate = (d) =>
  new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

// Returns true if the given date is today
const isToday = (dateStr) => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
};

export default function PrintShopDashboard() {
  const { queue, connected, socket } = useQueue();
  const [allJobs, setAllJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [otpModal, setOtpModal] = useState(null);
  const [otpDisplayJob, setOtpDisplayJob] = useState(null);
  const [displayedOTP, setDisplayedOTP] = useState(null);
  const [filter, setFilter] = useState("paid");
  const [doneTodayCount, setDoneTodayCount] = useState(0);
  const [printsTodayCount, setPrintsTodayCount] = useState(0);

  const fetchJobs = async () => {
    try {
      const data = await adminService.getAllJobs({ status: filter });
      setAllJobs(data.jobs);
    } catch {
      toast.error("Failed to load jobs");
    } finally {
      setLoading(false);
    }
  };

  // Fetch accurate "Done Today" & "Prints Today" counts independently from filter
  const fetchTodayStats = async () => {
    try {
      const data = await adminService.getAnalytics();
      if (data.analytics) {
        setDoneTodayCount(data.analytics.todayCompleted ?? 0);
        setPrintsTodayCount(data.analytics.todayJobs ?? 0);
      }
    } catch {
      // non-blocking — silently ignore
    }
  };

  useEffect(() => {
    fetchTodayStats();
    fetchJobs();
    const t = setInterval(fetchJobs, 15000);
    const s = setInterval(fetchTodayStats, 60000);
    return () => { clearInterval(t); clearInterval(s); };
  }, [filter]);

  useEffect(() => {
    if (!socket) return;
    const handler = (data) => setAllJobs(prev => {
      const updated = prev.filter(j => j._id !== data.jobId);
      if (updated.length < prev.length) toast.success("Job collected and removed");
      return updated;
    });
    socket.on("jobVerified", handler);
    return () => socket.off("jobVerified", handler);
  }, [socket]);

  const handleAction = async (jobId, action, reason) => {
    setActionLoading(prev => ({ ...prev, [jobId]: action }));
    const statusMap = { "start-printing": "printing", "mark-done": "done", "mark-failed": "failed", "requeue": "paid" };
    setAllJobs(prev => prev.map(j => j._id === jobId ? { ...j, status: statusMap[action] || j.status } : j));
    try {
      await adminService.updateJobStatus(jobId, action, reason);
      toast.success(`Job ${action} successful`);
      setTimeout(() => { fetchJobs(); fetchTodayStats(); }, 500);
      if (action === "mark-done") setOtpModal(null);
    } catch (err) {
      toast.error(err.response?.data?.message || "Action failed");
      fetchJobs();
    } finally {
      setActionLoading(prev => ({ ...prev, [jobId]: null }));
    }
  };

  const handleShowOTPToCustomer = (job) => {
    if (job.otp) { setDisplayedOTP(job.otp); setOtpDisplayJob(job); }
    else toast.error("OTP not available");
  };

  const STATUS_FILTERS = ["paid", "queued", "printing", "done", "collected", "failed", "uploaded"];

  // Stats — Done Today uses backend value, independent of filter
  const printingNow = allJobs.filter(j => j.status === "printing").length;
  const collectedCount = allJobs.filter(j => j.status === "collected").length;

  const stats = [
    { label: "In Queue",      value: queue.length,       icon: "schedule",      cls: "teal"  },
    { label: "Prints Today",  value: printsTodayCount,   icon: "today",         cls: "blue"  },
    { label: "Done Today",    value: doneTodayCount,     icon: "check_circle",  cls: "green" },
    { label: "Collected",     value: collectedCount,     icon: "done_all",      cls: "amber" },
  ];

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 32 }}>
        <div>
          <span style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--on-surface-variant)", display: "block", marginBottom: 6 }}>
            Operator Panel
          </span>
          <h1 style={{ letterSpacing: "-0.03em" }}>Print Shop Dashboard</h1>
          <p style={{ marginTop: 6 }}>
            Algorithmic sorting active ·{" "}
            <span style={{ fontWeight: 700, color: "var(--secondary)" }}>{queue.length} Jobs in Line</span>
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {connected
            ? <div className="live-badge"><div className="live-dot" /> Live</div>
            : <span style={{ background: "var(--error-container)", color: "var(--on-error-container)", padding: "4px 12px", borderRadius: "var(--radius-full)", fontSize: "0.75rem", fontWeight: 700 }}>Offline</span>
          }
          <button className="btn btn-secondary" onClick={() => { fetchJobs(); fetchTodayStats(); }} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>refresh</span>
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid-4" style={{ marginBottom: 32 }}>
        {stats.map(s => (
          <div className="stat-card" key={s.label}>
            <div className={`stat-icon ${s.cls}`}>
              <span className="material-symbols-outlined" style={{ fontSize: 22 }}>{s.icon}</span>
            </div>
            <div>
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* EQUAL 2-column layout — Live Queue LEFT | Job Actions RIGHT */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" }}>

        {/* ── LEFT: Live Queue ── */}
        <div style={{ background: "var(--surface-container-low)", borderRadius: "var(--radius-xl)", padding: 24 }}>
          {/* Panel header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div>
              <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--on-surface)" }}>Live Priority Queue</span>
              <p style={{ fontSize: "0.75rem", color: "var(--on-surface-variant)", marginTop: 2 }}>
                {queue.length} job{queue.length !== 1 ? "s" : ""} waiting
              </p>
            </div>
            {connected
              ? <div className="live-badge"><div className="live-dot" /> Live</div>
              : null
            }
          </div>

          {/* Column headers */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 90px 100px", gap: 10, padding: "4px 16px 10px", fontSize: "0.58rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--on-surface-variant)" }}>
            <span>Student & Project</span>
            <span>Specs</span>
            <span>Wait</span>
            <span style={{ textAlign: "right" }}>Actions</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: "60vh", overflowY: "auto" }}>
            {queue.length === 0 && (
              <div style={{ background: "var(--surface-container)", borderRadius: "var(--radius-xl)", padding: "48px 24px", textAlign: "center" }}>
                <span className="material-symbols-outlined" style={{ fontSize: 48, color: "var(--outline-variant)", display: "block", marginBottom: 12 }}>queue_play_next</span>
                <p style={{ fontWeight: 500, color: "var(--on-surface-variant)" }}>Queue is empty</p>
              </div>
            )}
            {queue.map((job, idx) => {
              const isActive = job.status === "printing";
              const totalPages = (job.pages || 0) * (job.copies || 1);
              return (
                <div key={job._id} style={{
                  background: isActive ? "var(--surface-container-highest)" : "var(--surface-container)",
                  borderRadius: "var(--radius-lg)", padding: "16px", position: "relative", overflow: "hidden",
                  transition: "all var(--transition-base)",
                  outline: isActive ? "2px solid rgba(0,104,121,0.2)" : "none",
                }}>
                  {isActive && <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(0,104,121,0.04), transparent)", pointerEvents: "none" }} />}
                  <div style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", width: 3, height: 40, borderRadius: "0 4px 4px 0", background: idx === 0 ? "var(--primary)" : idx < 3 ? "rgba(0,104,121,0.5)" : "var(--outline-variant)" }} />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 90px 100px", gap: 10, alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 700, color: "var(--on-surface)", fontSize: "0.85rem", textTransform: "capitalize" }}>
                        {job.userRole || job.userId?.role || "Student"}
                        {job.userId?.name && <span style={{ fontWeight: 400, opacity: 0.7, marginLeft: 8 }}>· {job.userId.name}</span>}
                      </div>
                      {isActive
                        ? <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--secondary)", display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}><span className="material-symbols-outlined" style={{ fontSize: 11 }}>sync</span>PRINTING</div>
                        : <div style={{ fontSize: "0.7rem", color: "var(--on-surface-variant)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }}>{job.originalName}</div>
                      }
                    </div>
                    <div>
                      <div style={{ fontSize: "0.8rem", fontWeight: 600 }}>{totalPages} sheets</div>
                      <div style={{ fontSize: "0.58rem", fontWeight: 700, textTransform: "uppercase", color: "var(--on-surface-variant)", marginTop: 2 }}>{job.paperSize || "A4"} · {job.color ? "Color" : "B&W"}</div>
                    </div>
                    <div>
                      {job.estimatedTime
                        ? <div style={{ display: "flex", alignItems: "center", gap: 4, fontWeight: 700, fontSize: "0.85rem", color: idx === 0 ? "var(--error)" : "var(--on-surface)" }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 13, color: idx === 0 ? "var(--error)" : "var(--secondary)" }}>schedule</span>
                            {job.estimatedTime}m
                          </div>
                        : isActive
                          ? <div style={{ background: "var(--outline-variant)", borderRadius: 999, height: 3, overflow: "hidden" }}>
                              <div style={{ width: "65%", height: "100%", background: "var(--primary)", boxShadow: "0 0 6px rgba(0,104,121,0.5)" }} />
                            </div>
                          : <span style={{ color: "var(--on-surface-variant)", fontSize: "0.8rem" }}>—</span>
                      }
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
                      {job.status === "queued" && (
                        <button className="btn btn-primary btn-sm" onClick={() => handleAction(job._id, "start-printing")} disabled={!!actionLoading[job._id]} id={`start-print-${job._id}`}>
                          {actionLoading[job._id] === "start-printing" ? <span className="spinner" /> : "Start"}
                        </button>
                      )}
                      {job.status === "printing" && (
                        <>
                          <button className="btn btn-success btn-sm" onClick={() => handleAction(job._id, "mark-done")} disabled={!!actionLoading[job._id]} id={`done-${job._id}`}>Done</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleAction(job._id, "mark-failed", "Print failed")}>Fail</button>
                        </>
                      )}
                      <button className="btn btn-secondary btn-sm" style={{ padding: "7px 8px" }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>more_vert</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── RIGHT: Job Actions Panel ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Job Actions */}
          <div style={{ background: "var(--surface-container-low)", borderRadius: "var(--radius-xl)", padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--on-surface)" }}>Job Actions</span>
                <p style={{ fontSize: "0.75rem", color: "var(--on-surface-variant)", marginTop: 2 }}>
                  {allJobs.length} {filter} job{allJobs.length !== 1 ? "s" : ""}
                </p>
              </div>
              <select className="form-select" style={{ width: "auto", fontSize: "0.8rem", padding: "6px 12px" }} value={filter} onChange={e => setFilter(e.target.value)}>
                {STATUS_FILTERS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>

            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 90 }} />)}
              </div>
            ) : allJobs.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px 16px" }}>
                <span className="material-symbols-outlined" style={{ fontSize: 40, color: "var(--outline-variant)", display: "block", marginBottom: 8 }}>inbox</span>
                <p style={{ fontSize: "0.875rem", color: "var(--on-surface-variant)" }}>No {filter} jobs right now</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: "55vh", overflowY: "auto" }}>
                {allJobs.map(job => {
                  const totalPages = (job.pages || 0) * (job.copies || 1);
                  return (
                    <div key={job._id} style={{ background: "var(--surface-container-high)", borderRadius: "var(--radius-lg)", padding: 14 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, overflow: "hidden" }}>
                          {(job.queueNumber || job.queuePosition) && (
                            <span style={{ fontFamily: "var(--font-headline)", fontWeight: 800, fontSize: "0.7rem", color: "var(--tertiary)", background: "var(--tertiary-container)", padding: "2px 8px", borderRadius: 999, flexShrink: 0 }}>
                              {job.queueNumber || `Q-${String(job.queuePosition).padStart(3, "0")}`}
                            </span>
                          )}
                          <span style={{ fontWeight: 600, fontSize: "0.82rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{job.originalName}</span>
                        </div>
                        <StatusBadge status={job.status} showDot />
                      </div>
                      <div style={{ fontSize: "0.7rem", color: "var(--on-surface-variant)", marginBottom: 8 }}>
                        {job.userId?.name} · {totalPages} sheets · {job.color ? "Color" : "B&W"} · ₹{job.totalAmount}
                        {job.estimatedTime && <span style={{ color: "var(--tertiary)", fontWeight: 700 }}> · ~{job.estimatedTime}min</span>}
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {job.status === "queued" && (
                          <button className="btn btn-primary btn-sm" disabled={actionLoading[job._id] === "start-printing"} onClick={() => handleAction(job._id, "start-printing")} id={`start-print-${job._id}`}>
                            {actionLoading[job._id] === "start-printing" ? <span className="spinner" /> : <><span className="material-symbols-outlined" style={{ fontSize: 12 }}>print</span> Print</>}
                          </button>
                        )}
                        {job.status === "printing" && (
                          <>
                            <button className="btn btn-success btn-sm" disabled={actionLoading[job._id] === "mark-done"} onClick={() => handleAction(job._id, "mark-done")} id={`done-${job._id}`}>
                              <span className="material-symbols-outlined" style={{ fontSize: 12 }}>check</span> Done
                            </button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleAction(job._id, "mark-failed", "Print failed")}>
                              <span className="material-symbols-outlined" style={{ fontSize: 12 }}>close</span> Failed
                            </button>
                          </>
                        )}
                        {job.status === "done" && !job.otpVerified && (
                          <>
                            <button className="btn btn-secondary btn-sm" onClick={() => setOtpModal(job)} id={`verify-otp-btn-${job._id}`}>
                              <span className="material-symbols-outlined" style={{ fontSize: 12 }}>lock</span> Verify OTP
                            </button>
                            <button className="btn btn-secondary btn-sm" onClick={() => handleShowOTPToCustomer(job)} id={`show-otp-customer-${job._id}`}>
                              <span className="material-symbols-outlined" style={{ fontSize: 12 }}>smartphone</span> Show OTP
                            </button>
                          </>
                        )}
                        {job.status === "failed" && (
                          <button className="btn btn-secondary btn-sm" onClick={() => handleAction(job._id, "requeue")}>
                            <span className="material-symbols-outlined" style={{ fontSize: 12 }}>replay</span> Requeue
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Station Health */}
          <div style={{ background: "#191c1d", borderRadius: "var(--radius-xl)", padding: 24, color: "#fff", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", right: -20, bottom: -20, width: 120, height: 120, background: "rgba(0,104,121,0.2)", borderRadius: "50%", filter: "blur(40px)" }} />
            <div style={{ position: "relative" }}>
              <h4 style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#54d7f2", marginBottom: 16 }}>Station Health</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  { name: "Main Plotter 01", status: "READY",  statusBg: "rgba(34,197,94,0.2)",  statusColor: "#4ade80" },
                  { name: "Main Plotter 02", status: "ACTIVE", statusBg: "rgba(0,104,121,0.25)", statusColor: "#54d7f2" },
                  { name: "Laser Binder",    status: "JAMMED", statusBg: "rgba(186,26,26,0.2)",  statusColor: "#ffdad6" },
                ].map(s => (
                  <div key={s.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.85)" }}>{s.name}</span>
                    <span style={{ background: s.statusBg, color: s.statusColor, padding: "3px 10px", borderRadius: "var(--radius-sm)", fontSize: "0.65rem", fontWeight: 900 }}>{s.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>

      {otpModal && (
        <OTPModal mode="verify" onClose={() => setOtpModal(null)}
          onVerify={async (otp) => {
            try {
              const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
              const response = await fetch(`${API}/jobs/${otpModal._id}/verify-otp`, {
                method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("sp_token")}` },
                body: JSON.stringify({ otp }),
              });
              const data = await response.json();
              if (!response.ok) { toast.error(data.message || "OTP verification failed"); return; }
              toast.success("OTP verified! Job collected.");
              setOtpModal(null); fetchJobs(); fetchTodayStats();
            } catch (err) { toast.error(err.message || "OTP verification failed"); }
          }} />
      )}

      {otpDisplayJob && displayedOTP && (
        <OTPModal mode="display" otp={displayedOTP} onClose={() => { setOtpDisplayJob(null); setDisplayedOTP(null); }} />
      )}
    </div>
  );
}
