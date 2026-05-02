import { useState, useRef } from "react";

export const OTPModal = ({ mode = "display", otp, onVerify, onClose, loading, title, description }) => {
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const refs = useRef([]);

  const handleChange = (val, idx) => {
    if (!/^\d*$/.test(val)) return;
    const d = [...digits];
    d[idx] = val.slice(-1);
    setDigits(d);
    if (val && idx < 5) refs.current[idx + 1]?.focus();
  };

  const handleKeyDown = (e, idx) => {
    if (e.key === "Backspace" && !digits[idx] && idx > 0) {
      refs.current[idx - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const paste = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (paste.length === 6) {
      setDigits(paste.split(""));
      refs.current[5]?.focus();
    }
  };

  const handleVerify = () => {
    const combined = digits.join("");
    if (combined.length === 6) onVerify(combined);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {mode === "display" ? (
          <>
            <div style={{ textAlign: "center", marginBottom: "clamp(16px, 4vw, 24px)" }}>
              <div style={{ width: "clamp(48px, 12vw, 56px)", height: "clamp(48px, 12vw, 56px)", background: "var(--secondary-container)", borderRadius: "var(--radius-full)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <span className="material-symbols-outlined" style={{ color: "var(--on-secondary-container)", fontSize: "clamp(24px, 6vw, 28px)" }}>check_circle</span>
              </div>
              <h3 style={{ marginBottom: 8, fontSize: "clamp(1.1rem, 4vw, 1.3rem)" }}>Prints Ready!</h3>
              <p style={{ fontSize: "clamp(0.8rem, 2vw, 0.875rem)" }}>Show this OTP at the print shop to collect your prints</p>
            </div>
            <div className="otp-display">{otp}</div>
            <p style={{ textAlign: "center", fontSize: "clamp(0.7rem, 1.6vw, 0.75rem)", color: "var(--on-surface-variant)", marginTop: "var(--space-md)", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, flexWrap: "wrap" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>schedule</span>
              Valid for 2 hours
            </p>
            <button className="btn btn-secondary btn-full" style={{ marginTop: "clamp(16px, 4vw, 24px)" }} onClick={onClose}>Close</button>
          </>
        ) : (
          <>
            <div style={{ textAlign: "center", marginBottom: "clamp(20px, 5vw, 32px)" }}>
              <div style={{ width: "clamp(48px, 12vw, 56px)", height: "clamp(48px, 12vw, 56px)", background: "var(--tertiary-container)", borderRadius: "var(--radius-full)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <span className="material-symbols-outlined" style={{ color: "var(--on-tertiary-container)", fontSize: "clamp(24px, 6vw, 28px)" }}>lock</span>
              </div>
              <h3 style={{ marginBottom: 8, fontSize: "clamp(1.1rem, 4vw, 1.3rem)" }}>{title || "Enter OTP"}</h3>
              <p style={{ fontSize: "clamp(0.8rem, 2vw, 0.875rem)" }}>{description || "Ask the customer for their 6-digit OTP"}</p>
            </div>
            <div className="otp-input-row" onPaste={handlePaste}>
              {digits.map((d, i) => (
                <input key={i} ref={(el) => (refs.current[i] = el)} className="otp-digit"
                  type="text" inputMode="numeric" maxLength={1} value={d}
                  onChange={(e) => handleChange(e.target.value, i)}
                  onKeyDown={(e) => handleKeyDown(e, i)} id={`otp-digit-${i}`} />
              ))}
            </div>
            <button className="btn btn-primary btn-full" style={{ marginTop: "clamp(20px, 5vw, 32px)" }}
              onClick={handleVerify} disabled={digits.join("").length < 6 || loading} id="verify-otp-btn">
              {loading ? <span className="spinner" /> : "Verify OTP"}
            </button>
            <button className="btn btn-ghost btn-full" style={{ marginTop: "var(--space-sm)" }} onClick={onClose}>Cancel</button>
          </>
        )}
      </div>
    </div>
  );
};
