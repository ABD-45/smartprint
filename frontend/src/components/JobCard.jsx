import { StatusBadge } from "./StatusBadge";
import { Link } from "react-router-dom";

const formatDate = (d) =>
  new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

const ROLE_STYLE = {
  staff:    { bg: "var(--primary-fixed)", color: "var(--on-primary-fixed)", label: "Staff" },
  admin:    { bg: "var(--error-container)", color: "var(--on-error-container)", label: "Admin" },
  student:  { bg: "var(--tertiary-container)", color: "var(--on-tertiary-container)", label: "Student" },
};

export const JobCard = ({ job, showPayBtn = false, queuePosition, queueNumber, etaMinutes }) => {
  const isQueued = ["queued","printing"].includes(job.status);
  const roleStyle = ROLE_STYLE[job.userRole] || ROLE_STYLE.student;
  const totalPages = (job.pages || 0) * (job.copies || 1);

  return (
    <div style={{ background: "var(--surface-container-low)", borderRadius: "var(--radius-xl)", padding: "clamp(16px, 4vw, 32px)", position: "relative", overflow: "hidden", transition: "background var(--transition-base)" }}
      onMouseEnter={e => e.currentTarget.style.background = "var(--surface-container)"}
      onMouseLeave={e => e.currentTarget.style.background = "var(--surface-container-low)"}>

      {/* Gradient top bar for active/printing */}
      {isQueued && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg, var(--primary), #00adc8)" }} />
      )}

      {/* Header */}
      <div className="job-card-header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "clamp(16px, 3vw, 20px)", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "clamp(10px, 2vw, 14px)", flex: 1, minWidth: 0 }}>
          <div style={{ width: "clamp(36px, 8vw, 44px)", height: "clamp(36px, 8vw, 44px)", background: "var(--primary-fixed)", borderRadius: "var(--radius-lg)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span className="material-symbols-outlined" style={{ color: "var(--primary)", fontSize: "clamp(18px, 4vw, 22px)" }}>picture_as_pdf</span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: "clamp(0.85rem, 2vw, 0.9rem)", color: "var(--on-surface)", marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{job.originalName}</div>
            <div style={{ fontSize: "clamp(0.65rem, 1.5vw, 0.7rem)", color: "var(--on-surface-variant)" }}>{formatDate(job.createdAt)}</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
          <StatusBadge status={job.status} showDot />
          <span style={{ fontSize: "clamp(0.6rem, 1.2vw, 0.65rem)", padding: "2px 8px", borderRadius: "var(--radius-full)", background: roleStyle.bg, color: roleStyle.color, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            {roleStyle.label}
          </span>
        </div>
      </div>

      {/* Queue Banner */}
      {isQueued && queueNumber && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px",
          background: "var(--surface-container-highest)", borderRadius: "var(--radius-lg)",
          padding: "clamp(10px, 2vw, 12px) clamp(12px, 3vw, 16px)", marginBottom: "clamp(16px, 3vw, 20px)", borderLeft: "4px solid var(--primary)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "clamp(8px, 2vw, 12px)" }}>
            <span style={{ fontFamily: "var(--font-headline)", fontWeight: 900, fontSize: "clamp(1.2rem, 4vw, 1.4rem)", color: "var(--primary)", letterSpacing: "-0.02em" }}>{queueNumber}</span>
            <div>
              <div style={{ fontSize: "clamp(0.72rem, 1.8vw, 0.78rem)", fontWeight: 700, color: "var(--on-surface)" }}>Position #{queuePosition} in queue</div>
              <div style={{ fontSize: "clamp(0.65rem, 1.5vw, 0.68rem)", color: "var(--on-surface-variant)" }}>Your print job is waiting</div>
            </div>
          </div>
          {etaMinutes != null && (
            etaMinutes <= 2
              ? <div style={{ fontSize: "clamp(0.75rem, 1.8vw, 0.8rem)", fontWeight: 700, color: "var(--secondary)" }}>Next up!</div>
              : <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "var(--font-headline)", fontWeight: 900, fontSize: "clamp(1rem, 2.5vw, 1.1rem)", color: "var(--tertiary)" }}>~{etaMinutes} min</div>
                  <div style={{ fontSize: "clamp(0.6rem, 1.4vw, 0.65rem)", color: "var(--on-surface-variant)" }}>Est. wait</div>
                </div>
          )}
        </div>
      )}

      {/* Details grid */}
      <div className="job-card-details-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: "clamp(6px, 1.5vw, 8px)", marginBottom: "clamp(16px, 3vw, 20px)" }}>
        {[
          { label: "Pages", value: `${job.pages} × ${job.copies}` },
          { label: "Sheets", value: `${totalPages}` },
          { label: "Color", value: job.color ? "Color" : "B&W" },
          { label: "Duplex", value: job.duplex ? "Yes" : "No" },
          { label: "Paper", value: job.paperSize || "A4" },
          { label: "Orientation", value: job.orientation === "landscape" ? "Landscape" : "Portrait" },
        ].map(item => (
          <div key={item.label} style={{ background: "var(--surface-container-high)", border: "1px solid var(--outline-variant)", borderRadius: "var(--radius-lg)", padding: "clamp(10px, 2vw, 12px) clamp(12px, 2.5vw, 14px)" }}>
            <div style={{ fontSize: "clamp(0.58rem, 1.2vw, 0.6rem)", color: "var(--on-surface-variant)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "clamp(4px, 1vw, 6px)" }}>{item.label}</div>
            <div style={{ fontSize: "clamp(0.8rem, 1.8vw, 0.85rem)", fontWeight: 800, color: "var(--on-surface)" }}>{item.value}</div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="job-card-footer" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
        <div>
          <span style={{ fontSize: "clamp(0.68rem, 1.5vw, 0.72rem)", color: "var(--on-surface-variant)" }}>Amount · </span>
          <span style={{ fontFamily: "var(--font-headline)", fontWeight: 900, fontSize: "clamp(1.1rem, 2.5vw, 1.2rem)", color: "var(--primary)" }}>₹{job.totalAmount}</span>
        </div>
        {showPayBtn && job.status === "uploaded" && (
          <Link to={`/pay/${job._id}`} className="btn btn-primary btn-sm btn-mobile-full" id={`pay-btn-${job._id}`} style={{ minWidth: "120px" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>credit_card</span>
            Pay Now
          </Link>
        )}
      </div>
    </div>
  );
};
