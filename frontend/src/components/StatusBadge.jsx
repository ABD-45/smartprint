const STATUS_CONFIG = {
  uploaded:  { label: "Uploaded",  icon: "upload",         bg: "var(--surface-container-highest)", color: "var(--on-surface-variant)" },
  paid:      { label: "Paid",      icon: "credit_card",    bg: "var(--tertiary-fixed)",            color: "var(--on-tertiary-fixed)" },
  queued:    { label: "Queued",    icon: "schedule",       bg: "var(--tertiary-container)",        color: "var(--on-tertiary-container)" },
  printing:  { label: "Printing",  icon: "print",          bg: "var(--primary)",                  color: "var(--on-primary)" },
  done:      { label: "Done",      icon: "check_circle",   bg: "var(--secondary-container)",      color: "var(--on-secondary-container)" },
  failed:    { label: "Failed",    icon: "error",          bg: "var(--error-container)",          color: "var(--on-error-container)" },
  cancelled: { label: "Cancelled", icon: "cancel",         bg: "var(--surface-container-highest)", color: "var(--on-surface-variant)" },
  collected: { label: "Collected", icon: "done_all",       bg: "var(--secondary-container)",      color: "var(--on-secondary-container)" },
};

export const StatusBadge = ({ status, showDot = false }) => {
  const cfg = STATUS_CONFIG[status] || { label: status, icon: "help", bg: "var(--surface-container-highest)", color: "var(--on-surface-variant)" };
  const isLive = ["printing","queued"].includes(status);

  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 10px", borderRadius: "9999px",
      background: cfg.bg, color: cfg.color,
      fontSize: "0.65rem", fontWeight: 900,
      textTransform: "uppercase", letterSpacing: "0.06em",
      animation: status === "printing" ? "pulse-badge 2s infinite" : "none",
    }}>
      {showDot && isLive && (
        <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor", animation: "pulse 1.5s infinite", flexShrink: 0 }} />
      )}
      <span className="material-symbols-outlined" style={{ fontSize: 11 }}>{cfg.icon}</span>
      {cfg.label}
    </span>
  );
};
