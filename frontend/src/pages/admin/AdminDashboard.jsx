import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { adminService } from "../../services/queueService";
import { StatusBadge } from "../../components/StatusBadge";
import { QueueList } from "../../components/QueueList";

const HOUR_LABEL = (h) => {
  if (h === 0) return "12AM";
  if (h === 12) return "12PM";
  return h < 12 ? `${h}AM` : `${h - 12}PM`;
};

const formatCurrency = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const formatDate = (d) =>
  new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

const ROLE_BADGE = {
  staff:   { bg: "var(--primary-fixed)",      color: "var(--on-primary-fixed)" },
  admin:   { bg: "var(--error-container)",    color: "var(--on-error-container)" },
  student: { bg: "var(--tertiary-container)", color: "var(--on-tertiary-container)" },
};

export default function AdminDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [jobs, setJobs]           = useState([]);
  const [users, setUsers]         = useState([]);
  const [liveQueue, setLiveQueue] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [tab, setTab]             = useState("overview");
  const [timeline, setTimeline]   = useState([]);
  const [timeRange, setTimeRange] = useState("daily");
  const [tlLoading, setTlLoading] = useState(false);
  
  // Peak Hours Filter State
  const [peakRange, setPeakRange] = useState("24h");
  const [customRange, setCustomRange] = useState({ from: "", to: "" });

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const peakParams = peakRange === "custom" ? { from: customRange.from, to: customRange.to } : { peakRange };
        const [aData, jData, uData, qData] = await Promise.all([
          adminService.getAnalytics(peakParams), adminService.getAllJobs({ limit: 50 }),
          adminService.getAllUsers({ limit: 50 }), adminService.getQueueLive(),
        ]);
        setAnalytics(aData.analytics);
        const sorted = [...(jData.jobs || [])].sort((a, b) => {
          const aA = ["queued","printing"].includes(a.status) && a.queuePosition != null;
          const bA = ["queued","printing"].includes(b.status) && b.queuePosition != null;
          if (aA && bA) return (a.queuePosition ?? 999) - (b.queuePosition ?? 999);
          if (aA) return -1; if (bA) return 1;
          return new Date(b.createdAt) - new Date(a.createdAt);
        });
        setJobs(sorted); setUsers(uData.users);
        setLiveQueue([...(qData.queue || [])].sort((a,b) => (a.queuePosition??999)-(b.queuePosition??999)));
      } catch { toast.error("Failed to load analytics"); }
      finally { setLoading(false); }
    };
    fetchAll();
  }, [peakRange, customRange]);

  useEffect(() => {
    if (tab !== "reports") return;
    const fetchTimeline = async () => {
      setTlLoading(true);
      try {
        const d = await adminService.getTimeline(timeRange);
        setTimeline(d.timeline || []);
      } catch { toast.error("Failed to load timeline"); }
      finally { setTlLoading(false); }
    };
    fetchTimeline();
  }, [tab, timeRange]);

  if (loading || !analytics) return (
    <div className="page-wrapper">
      <div className="page-header"><h1>Administrative Analytics</h1></div>
      <div className="grid-4" style={{ marginBottom: 24 }}>
        {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 100, borderRadius: "var(--radius-full)" }} />)}
      </div>
    </div>
  );

  const statusSummary = {};
  analytics.statusBreakdown?.forEach(({ _id, count }) => { statusSummary[_id] = count; });

  const TABS = ["overview","queue","jobs","users","reports"];

  const statCards = [
    { label: "Total Jobs",    value: analytics.totalJobs,               icon: "receipt_long",  cls: "teal"  },
    { label: "Today's Jobs",  value: analytics.todayJobs,               icon: "today",         cls: "blue"  },
    { label: "Total Revenue", value: formatCurrency(analytics.totalRevenue), icon: "currency_rupee", cls: "green" },
    { label: "In Queue Now",  value: liveQueue.length,                  icon: "schedule",      cls: "amber" },
  ];

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <h1 style={{ letterSpacing: "-0.03em", marginBottom: 6 }}>Administrative Analytics</h1>
        <p>Operational overview for SmartPrint infrastructure.</p>
      </div>

      {/* KPI cards — pill-shaped (rounded-full) */}
      <div className="grid-4" style={{ marginBottom: 40 }}>
        {statCards.map(s => (
          <div className="stat-card" key={s.label}>
            <div className={`stat-icon ${s.cls}`}>
              <span className="material-symbols-outlined" style={{ fontSize: 22 }}>{s.icon}</span>
            </div>
            <div>
              <div className="stat-value" style={{ fontSize: typeof s.value === "string" ? "1.2rem" : undefined }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24, marginBottom: 40 }}>
        {/* Peak Printing Hours — full 24h bar chart */}
        <div style={{ background: "var(--surface-container-low)", borderRadius: "var(--radius-xl)", padding: 32 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
            <div>
              <h2 style={{ fontSize: "1.2rem", marginBottom: 4 }}>Peak Printing Hours</h2>
              <p style={{ fontSize: "0.82rem" }}>Jobs submitted per hour · {peakRange === "custom" ? "Custom Range" : peakRange === "7d" ? "Last 7 Days" : peakRange === "30d" ? "Last 30 Days" : "Last 24 Hours"}</p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
              <div style={{ display: "flex", gap: 6 }}>
                {["24h", "7d", "30d", "custom"].map(r => (
                  <button key={r} className={`btn btn-sm ${peakRange === r ? "btn-primary" : "btn-secondary"}`}
                    style={{ fontSize: "0.6rem", padding: "4px 10px" }}
                    onClick={() => setPeakRange(r)}>
                    {r.toUpperCase()}
                  </button>
                ))}
              </div>
              {peakRange === "custom" && (
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input type="date" className="form-input" style={{ fontSize: "0.7rem", padding: "4px 8px" }}
                    value={customRange.from} onChange={e => setCustomRange(prev => ({ ...prev, from: e.target.value }))} />
                  <span style={{ fontSize: "0.7rem" }}>to</span>
                  <input type="date" className="form-input" style={{ fontSize: "0.7rem", padding: "4px 8px" }}
                    value={customRange.to} onChange={e => setCustomRange(prev => ({ ...prev, to: e.target.value }))} />
                </div>
              )}
            </div>
          </div>
          {!analytics.hasAnyActivity ? (
            <div style={{ textAlign: "center", padding: "32px 0", color: "var(--on-surface-variant)" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 40, display: "block", marginBottom: 8 }}>bar_chart</span>
              <p style={{ fontSize: "0.875rem" }}>No print jobs in the last 24 hours</p>
            </div>
          ) : (() => {
            const hours = analytics.peakHours || [];
            const maxCount = Math.max(...hours.map(h => h.count), 1);
            // Show every 3rd hour label to avoid crowding
            return (
              <div>
                {/* Y-axis hint */}
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 4 }}>
                  <span style={{ fontSize: "0.6rem", color: "var(--on-surface-variant)" }}>max: {maxCount} jobs</span>
                </div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 130 }}>
                  {hours.map(({ _id: h, count }) => {
                    const pct = Math.round((count / maxCount) * 100);
                    const isMax = count === maxCount && count > 0;
                    return (
                      <div key={h} title={`${HOUR_LABEL(h)}: ${count} job${count !== 1 ? "s" : ""}`}
                        style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, height: "100%", cursor: "default" }}>
                        <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "flex-end" }}>
                          <div style={{
                            width: "100%",
                            height: count === 0 ? 3 : `${Math.max(pct, 4)}%`,
                            background: isMax ? "var(--primary)" : count === 0 ? "var(--outline-variant)" : `rgba(0,104,121,${0.2 + (pct / 160)})`,
                            borderRadius: "3px 3px 0 0",
                            transition: "height 0.4s ease",
                          }} />
                        </div>
                        {h % 6 === 0 && (
                          <span style={{ fontSize: "0.52rem", fontWeight: 700, color: "var(--on-surface-variant)", whiteSpace: "nowrap" }}>{HOUR_LABEL(h)}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
                {/* X-axis baseline */}
                <div style={{ height: 1, background: "var(--outline-variant)", marginTop: 2 }} />
                <p style={{ fontSize: "0.7rem", color: "var(--on-surface-variant)", marginTop: 8, textAlign: "center" }}>
                  Busiest hour: <strong style={{ color: "var(--primary)" }}>{HOUR_LABEL(analytics.peakHours.reduce((a, b) => b.count > a.count ? b : a, analytics.peakHours[0])?._id)}</strong>
                  {" · "}{analytics.peakHours.reduce((s, h) => s + h.count, 0)} total jobs
                </p>
              </div>
            );
          })()}
        </div>

        {/* Job Status donut */}
        <div style={{ background: "var(--surface-container-low)", borderRadius: "var(--radius-xl)", padding: 32, display: "flex", flexDirection: "column" }}>
          <h2 style={{ fontSize: "1.2rem", marginBottom: 4 }}>Job Status</h2>
          <p style={{ fontSize: "0.82rem", marginBottom: 28 }}>Real-time workflow distribution</p>
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 140, height: 140, position: "relative" }}>
              <svg viewBox="0 0 36 36" style={{ transform: "rotate(-90deg)" }}>
                <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="var(--surface-container-high)" strokeWidth="3.8" />
                {(() => {
                  const items = [
                    { label: "Done",     color: "var(--secondary)",          count: statusSummary.done || 0 },
                    { label: "Printing", color: "var(--primary)",            count: statusSummary.printing || 0 },
                    { label: "Failed",   color: "var(--error)",              count: statusSummary.failed || 0 },
                    { label: "Other",    color: "var(--outline-variant)",    count: analytics.totalJobs - (statusSummary.done||0) - (statusSummary.printing||0) - (statusSummary.failed||0) }
                  ].filter(i => i.count > 0);
                  
                  let offset = 0;
                  return items.map((item, idx) => {
                    const percentage = (item.count / (analytics.totalJobs || 1)) * 100;
                    const strokeDash = `${percentage} ${100 - percentage}`;
                    const strokeOffset = -offset;
                    offset += percentage;
                    return (
                      <circle key={idx} cx="18" cy="18" r="15.915" fill="transparent" 
                        stroke={item.color} strokeWidth="3.8" 
                        strokeDasharray={strokeDash} strokeDashoffset={strokeOffset}
                        style={{ transition: "all 0.6s ease" }} />
                    );
                  });
                })()}
              </svg>
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontFamily: "var(--font-headline)", fontWeight: 900, fontSize: "1.5rem", color: "var(--on-surface)" }}>{analytics.totalJobs}</span>
                <span style={{ fontSize: "0.6rem", fontWeight: 700, color: "var(--on-surface-variant)", textTransform: "uppercase" }}>Total Jobs</span>
              </div>
            </div>
          </div>
          <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { label: "Done",     color: "var(--secondary)",          count: statusSummary.done || 0 },
              { label: "Printing", color: "var(--primary)",            count: statusSummary.printing || 0 },
              { label: "Failed",   color: "var(--error)",              count: statusSummary.failed || 0 },
            ].map(item => (
              <div key={item.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: item.color }} />
                  <span style={{ fontSize: "0.82rem", color: "var(--on-surface)" }}>{item.label}</span>
                </div>
                <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--on-surface)" }}>{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tab nav */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, paddingBottom: 16, borderBottom: "1px solid rgba(191,198,220,0.15)" }}>
        {TABS.map(t => (
          <button key={t} className={`btn ${tab === t ? "btn-primary" : "btn-secondary"} btn-sm`} onClick={() => setTab(t)} id={`tab-${t}`}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {tab === "overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {/* Status breakdown */}
          <div style={{ background: "var(--surface-container-low)", borderRadius: "var(--radius-xl)", padding: 28 }}>
            <h3 style={{ marginBottom: 20, fontSize: "1rem" }}>Status Breakdown</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {["done","printing","queued","paid","uploaded","failed"].map(status => {
                const count = statusSummary[status] || 0;
                const pct = analytics.totalJobs > 0 ? Math.round((count/analytics.totalJobs)*100) : 0;
                return (
                  <div key={status}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <StatusBadge status={status} />
                      <span style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--on-surface)" }}>{count}</span>
                    </div>
                    <div style={{ background: "var(--surface-container-high)", borderRadius: 999, height: 5, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg, var(--primary), #00adc8)", transition: "width 0.6s ease" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Users by role + peak hours */}
          <div style={{ background: "var(--surface-container-low)", borderRadius: "var(--radius-xl)", padding: 28 }}>
            <h3 style={{ marginBottom: 20, fontSize: "1rem" }}>Users by Role</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 28 }}>
              {analytics.usersByRole?.map(({ _id: role, count }) => {
                const rb = ROLE_BADGE[role] || ROLE_BADGE.student;
                return (
                  <div key={role} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ background: rb.bg, color: rb.color, padding: "3px 12px", borderRadius: "var(--radius-full)", fontSize: "0.68rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.06em" }}>{role}</span>
                    <span style={{ fontFamily: "var(--font-headline)", fontWeight: 900, fontSize: "1.2rem", color: "var(--on-surface)" }}>{count}</span>
                  </div>
                );
              })}
            </div>
            <h3 style={{ marginBottom: 12, fontSize: "1rem" }}>Peak Hours</h3>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {analytics.peakHours?.map(({ _id: hour, count }) => (
                <div key={hour} style={{ background: "var(--surface-container-high)", borderRadius: "var(--radius-sm)", padding: "6px 12px", fontSize: "0.78rem", fontWeight: 600, color: "var(--on-surface)" }}>
                  {hour}:00 <span style={{ color: "var(--primary)", fontWeight: 900 }}>({count})</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Queue tab */}
      {tab === "queue" && (
        <div style={{ background: "var(--surface-container-low)", borderRadius: "var(--radius-xl)", padding: 28 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
            <div>
              <h2 style={{ fontSize: "1.2rem" }}>Priority Queue — Live View</h2>
              <p style={{ fontSize: "0.82rem", marginTop: 4 }}>{liveQueue.length} job{liveQueue.length !== 1 ? "s" : ""} in queue</p>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {["staff","student","admin"].map(role => {
                const count = liveQueue.filter(j => j.userRole === role).length;
                if (!count) return null;
                const rb = ROLE_BADGE[role] || ROLE_BADGE.student;
                return (
                  <span key={role} style={{ background: rb.bg, color: rb.color, padding: "4px 12px", borderRadius: "var(--radius-full)", fontSize: "0.7rem", fontWeight: 700 }}>
                    {role.charAt(0).toUpperCase()+role.slice(1)}: {count}
                  </span>
                );
              })}
            </div>
          </div>
          <QueueList queue={liveQueue} loading={false} />
        </div>
      )}

      {/* Jobs tab */}
      {tab === "jobs" && (
        <div style={{ background: "var(--surface-container-low)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
          <div style={{ padding: "24px 28px", borderBottom: "1px solid rgba(191,198,220,0.12)" }}>
            <h2 style={{ fontSize: "1.2rem" }}>All Jobs</h2>
          </div>
          <div className="table-wrapper" style={{ padding: "0 0 20px" }}>
            <table>
              <thead>
                <tr>
                  {["Queue#","File","User","Role","Status","Pages","Amount","Created"].map(h => <th key={h}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {jobs.map(job => {
                  const totalPages = (job.pages || 0) * (job.copies || 1);
                  const rb = ROLE_BADGE[job.userRole] || ROLE_BADGE.student;
                  return (
                    <tr key={job._id}>
                      <td>
                        {job.queueNumber
                          ? <span style={{ fontFamily: "var(--font-headline)", fontWeight: 800, color: "var(--tertiary)", background: "var(--tertiary-container)", padding: "2px 8px", borderRadius: 999, fontSize: "0.72rem" }}>{job.queueNumber}</span>
                          : <span style={{ color: "var(--outline)", fontSize: "0.78rem" }}>—</span>
                        }
                      </td>
                      <td style={{ fontWeight: 500, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{job.originalName}</td>
                      <td style={{ color: "var(--on-surface-variant)" }}>{job.userId?.name || "—"}</td>
                      <td>
                        <span style={{ background: rb.bg, color: rb.color, padding: "2px 8px", borderRadius: 999, fontWeight: 700, fontSize: "0.68rem", textTransform: "uppercase" }}>{job.userRole}</span>
                      </td>
                      <td><StatusBadge status={job.status} /></td>
                      <td style={{ fontSize: "0.82rem" }}>
                        {job.pages}p × {job.copies}
                        <br /><span style={{ color: "var(--on-surface-variant)", fontSize: "0.7rem" }}>{totalPages} sheets · {job.color ? "Color" : "B&W"}</span>
                      </td>
                      <td style={{ fontWeight: 700, color: "var(--primary)" }}>₹{job.totalAmount}</td>
                      <td style={{ fontSize: "0.78rem", color: "var(--on-surface-variant)" }}>{formatDate(job.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Users tab */}
      {tab === "users" && (
        <div style={{ background: "var(--surface-container-low)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
          <div style={{ padding: "24px 28px", borderBottom: "1px solid rgba(191,198,220,0.12)" }}>
            <h2 style={{ fontSize: "1.2rem" }}>User Activity Monitor</h2>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  {["User Identity","System Role","Phone","Status","Joined"].map(h => <th key={h}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {users.map(u => {
                  const rb = ROLE_BADGE[u.role] || ROLE_BADGE.student;
                  const initials = u.name?.split(" ").map(n=>n[0]).join("").toUpperCase().slice(0,2) || "?";
                  return (
                    <tr key={u._id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{ width: 38, height: 38, borderRadius: "var(--radius-full)", background: "var(--primary-fixed)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-headline)", fontWeight: 700, color: "var(--primary)", fontSize: "0.82rem", flexShrink: 0 }}>{initials}</div>
                          <div>
                            <div style={{ fontWeight: 700, color: "var(--on-surface)" }}>{u.name}</div>
                            <div style={{ fontSize: "0.7rem", color: "var(--on-surface-variant)" }}>{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{ background: rb.bg, color: rb.color, padding: "3px 10px", borderRadius: "var(--radius-full)", fontSize: "0.65rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.05em" }}>{u.role}</span>
                      </td>
                      <td style={{ color: "var(--on-surface-variant)" }}>{u.phone || "—"}</td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--secondary)" }}>
                          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--secondary)" }} />
                          <span style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Active</span>
                        </div>
                      </td>
                      <td style={{ fontSize: "0.78rem", color: "var(--on-surface-variant)" }}>{formatDate(u.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reports tab */}
      {tab === "reports" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Controls */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <h2 style={{ fontSize: "1.2rem" }}>Print Activity Timeline</h2>
              <p style={{ fontSize: "0.82rem", marginTop: 4 }}>Job volume and revenue over time</p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {["daily", "monthly"].map(r => (
                <button key={r} className={`btn btn-sm ${timeRange === r ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => setTimeRange(r)}>
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {tlLoading ? (
            <div className="skeleton" style={{ height: 240, borderRadius: "var(--radius-xl)" }} />
          ) : timeline.length === 0 ? (
            <div style={{ background: "var(--surface-container-low)", borderRadius: "var(--radius-xl)", padding: 48, textAlign: "center" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 48, color: "var(--outline-variant)", display: "block", marginBottom: 12 }}>timeline</span>
              <p style={{ color: "var(--on-surface-variant)" }}>No data available for this range</p>
            </div>
          ) : (() => {
            const maxJobs = Math.max(...timeline.map(t => t.jobs), 1);
            const totalJobsInRange = timeline.reduce((s, t) => s + t.jobs, 0);
            const totalRevenueInRange = timeline.reduce((s, t) => s + t.revenue, 0);
            const busiestDay = timeline.reduce((a, b) => b.jobs > a.jobs ? b : a, timeline[0]);
            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {/* Summary KPIs */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                  {[
                    { label: "Total Jobs", value: totalJobsInRange, icon: "receipt_long" },
                    { label: "Total Revenue", value: `₹${totalRevenueInRange.toLocaleString("en-IN")}`, icon: "currency_rupee" },
                    { label: "Busiest Day", value: busiestDay?.label || "—", icon: "star" },
                  ].map(s => (
                    <div key={s.label} style={{ background: "var(--surface-container-low)", borderRadius: "var(--radius-xl)", padding: 20, display: "flex", gap: 14, alignItems: "center" }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 28, color: "var(--primary)" }}>{s.icon}</span>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: "1.2rem", color: "var(--on-surface)" }}>{s.value}</div>
                        <div style={{ fontSize: "0.72rem", color: "var(--on-surface-variant)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700 }}>{s.label}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Bar chart */}
                <div style={{ background: "var(--surface-container-low)", borderRadius: "var(--radius-xl)", padding: 28 }}>
                  <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
                    <span style={{ fontSize: "0.6rem", color: "var(--on-surface-variant)" }}>max: {maxJobs} jobs</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: timeRange === "daily" ? 3 : 8, height: 180, overflowX: "auto" }}>
                    {timeline.map((item, idx) => {
                      const pct = Math.round((item.jobs / maxJobs) * 100);
                      return (
                        <div key={idx} title={`${item.label}: ${item.jobs} jobs · ₹${item.revenue}`}
                          style={{ flex: timeRange === "monthly" ? 1 : "0 0 auto", width: timeRange === "daily" ? 14 : undefined, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, height: "100%", cursor: "default" }}>
                          <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "flex-end", minWidth: timeRange === "daily" ? 14 : undefined }}>
                            <div style={{
                              width: "100%",
                              height: item.jobs === 0 ? 3 : `${Math.max(pct, 4)}%`,
                              background: item.jobs === 0 ? "var(--outline-variant)" : `rgba(0,104,121,${0.25 + (pct / 140)})`,
                              borderRadius: "3px 3px 0 0",
                              transition: "height 0.4s ease",
                            }} />
                          </div>
                          {(timeRange === "monthly" || idx % Math.ceil(timeline.length / 10) === 0) && (
                            <span style={{ fontSize: "0.52rem", fontWeight: 700, color: "var(--on-surface-variant)", whiteSpace: "nowrap", transform: timeRange === "daily" ? "rotate(-45deg)" : "none", transformOrigin: "center" }}>
                              {item.label}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ height: 1, background: "var(--outline-variant)", marginTop: 2 }} />
                </div>

                {/* Data table */}
                <div style={{ background: "var(--surface-container-low)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
                  <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(191,198,220,0.12)" }}>
                    <h3 style={{ fontSize: "1rem" }}>Detailed Breakdown</h3>
                  </div>
                  <div className="table-wrapper">
                    <table>
                      <thead><tr>{["Period","Jobs","Sheets","Revenue"].map(h => <th key={h}>{h}</th>)}</tr></thead>
                      <tbody>
                        {[...timeline].reverse().map((item, idx) => (
                          <tr key={idx}>
                            <td style={{ fontWeight: 600 }}>{item.label}</td>
                            <td>{item.jobs}</td>
                            <td>{(item.sheets || 0).toLocaleString()}</td>
                            <td style={{ fontWeight: 700, color: "var(--primary)" }}>₹{item.revenue.toLocaleString("en-IN")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
