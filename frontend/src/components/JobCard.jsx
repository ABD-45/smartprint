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
    <div style={{ background: "var(--surface-container-low)", borderRadius: "var(--radius-xl)", padding: "var(--space-xl)", position: "relative", overflow: "hidden", transition: "background var(--transition-base)" }}
      onMouseEnter={e => e.currentTarget.style.background = "var(--surface-container)"}
      onMouseLeave={e => e.currentTarget.style.background = "var(--surface-container-low)"}>

      {/* Gradient top bar for active/printing */}
      {isQueued && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg, var(--primary), #00adc8)" }} />
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 44, height: 44, background: "var(--primary-fixed)", borderRadius: "var(--radius-lg)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span className="material-symbols-outlined" style={{ color: "var(--primary)", fontSize: 22 }}>picture_as_pdf</span>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--on-surface)", marginBottom: 3 }}>{job.originalName}</div>
            <div style={{ fontSize: "0.7rem", color: "var(--on-surface-variant)" }}>{formatDate(job.createdAt)}</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
          <StatusBadge status={job.status} showDot />
          <span style={{ fontSize: "0.65rem", padding: "2px 8px", borderRadius: "var(--radius-full)", background: roleStyle.bg, color: roleStyle.color, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            {roleStyle.label}
          </span>
        </div>
      </div>

      {/* Queue Banner */}
      {isQueued && queueNumber && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "var(--surface-container-highest)", borderRadius: "var(--radius-lg)",
          padding: "12px 16px", marginBottom: 20, borderLeft: "4px solid var(--primary)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontFamily: "var(--font-headline)", fontWeight: 900, fontSize: "1.4rem", color: "var(--primary)", letterSpacing: "-0.02em" }}>{queueNumber}</span>
            <div>
              <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--on-surface)" }}>Position #{queuePosition} in queue</div>
              <div style={{ fontSize: "0.68rem", color: "var(--on-surface-variant)" }}>Your print job is waiting</div>
            </div>
          </div>
          {etaMinutes != null && (
            etaMinutes <= 2
              ? <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--secondary)" }}>Next up!</div>
              : <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "var(--font-headline)", fontWeight: 900, fontSize: "1.1rem", color: "var(--tertiary)" }}>~{etaMinutes} min</div>
                  <div style={{ fontSize: "0.65rem", color: "var(--on-surface-variant)" }}>Est. wait</div>
                </div>
          )}
        </div>
      )}

      {/* Details grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 20 }}>
        {[
          { label: "Pages", value: `${job.pages} × ${job.copies}` },
          { label: "Sheets", value: `${totalPages}` },
          { label: "Color", value: job.color ? "Color" : "B&W" },
          { label: "Duplex", value: job.duplex ? "Yes" : "No" },
          { label: "Paper", value: job.paperSize || "A4" },
          { label: "Orientation", value: job.orientation === "landscape" ? "Landscape" : "Portrait" },
        ].map(item => (
          <div key={item.label} style={{ background: "var(--surface-container-high)", border: "1px solid var(--outline-variant)", borderRadius: "var(--radius-lg)", padding: "12px 14px" }}>
            <div style={{ fontSize: "0.6rem", color: "var(--on-surface-variant)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{item.label}</div>
            <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--on-surface)" }}>{item.value}</div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <span style={{ fontSize: "0.72rem", color: "var(--on-surface-variant)" }}>Amount · </span>
          <span style={{ fontFamily: "var(--font-headline)", fontWeight: 900, fontSize: "1.2rem", color: "var(--primary)" }}>₹{job.totalAmount}</span>
        </div>
        {showPayBtn && job.status === "uploaded" && (
          <Link to={`/pay/${job._id}`} className="btn btn-primary btn-sm" id={`pay-btn-${job._id}`}>
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>credit_card</span>
            Pay Now
          </Link>
        )}
      </div>
    </div>
  );
};
