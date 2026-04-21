import { StatusBadge } from "./StatusBadge";

export const QueueList = ({ queue, loading }) => {
  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 72, borderRadius: "var(--radius-xl)" }} />)}
    </div>
  );

  if (!queue || queue.length === 0) return (
    <div style={{ textAlign: "center", padding: "40px 24px" }}>
      <span className="material-symbols-outlined" style={{ fontSize: 48, color: "var(--outline-variant)", display: "block", marginBottom: 12 }}>queue</span>
      <p style={{ color: "var(--on-surface-variant)", fontWeight: 500 }}>Queue is empty</p>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {/* Column headers */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 80px", gap: 12, padding: "4px 20px", fontSize: "0.6rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--on-surface-variant)" }}>
        <span>Student & File</span>
        <span>Specs</span>
        <span>Status</span>
      </div>

      {queue.map((job, idx) => {
        const isActive = job.status === "printing";
        const totalPages = (job.pages || 0) * (job.copies || 1);

        return (
          <div key={job._id} style={{
            background: isActive ? "var(--surface-container-highest)" : "var(--surface-container-low)",
            borderRadius: "var(--radius-xl)", padding: "16px 20px",
            position: "relative", overflow: "hidden",
            transition: "all var(--transition-base)",
            outline: isActive ? "2px solid rgba(0,104,121,0.2)" : "none",
          }}>
            {/* Left priority accent bar */}
            <div style={{
              position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)",
              width: 3, height: 40, borderRadius: "0 4px 4px 0",
              background: idx === 0 ? "var(--primary)" : idx === 1 ? "rgba(0,104,121,0.6)" : "var(--outline-variant)",
            }} />

            {isActive && (
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(0,104,121,0.04), transparent)", pointerEvents: "none" }} />
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 80px", gap: 12, alignItems: "center" }}>
              {/* Student & file */}
              <div>
                <div style={{ fontWeight: 700, color: "var(--on-surface)", fontSize: "0.875rem", textTransform: "capitalize" }}>
                  {job.userRole || job.userId?.role || "Student"}
                  {job.userId?.name && <span style={{ fontWeight: 400, opacity: 0.7, marginLeft: 8 }}>· {job.userId.name}</span>}
                </div>
                {isActive
                  ? <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--secondary)", display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 10 }}>sync</span>
                      PRINTING IN PROGRESS
                    </div>
                  : <div style={{ fontSize: "0.72rem", color: "var(--on-surface-variant)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {job.originalName}
                    </div>
                }
              </div>

              {/* Specs */}
              <div>
                <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--on-surface)" }}>{totalPages} sheets</div>
                <div style={{ fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--on-surface-variant)", marginTop: 2 }}>
                  {job.paperSize || "A4"} · {job.color ? "Color" : "B&W"}
                </div>
              </div>

              {/* Status */}
              <div>
                <StatusBadge status={job.status} showDot />
              </div>
            </div>

            {/* Progress bar for printing */}
            {isActive && (
              <div style={{ marginTop: 10, background: "rgba(191,198,220,0.3)", borderRadius: 999, overflow: "hidden", height: 3 }}>
                <div style={{ width: "65%", height: "100%", background: "var(--primary)", boxShadow: "0 0 8px rgba(0,104,121,0.5)" }} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
