import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { authService } from "../services/authService";
import { OTPModal } from "../components/OTPModal";
import toast from "react-hot-toast";

const ROLES = [
  { value: "student",   label: "Student",    icon: "school",           desc: "Upload & track print jobs" },
  { value: "staff",     label: "Staff",      icon: "badge",            desc: "Priority printing access" },
  { value: "printshop", label: "Print Shop", icon: "print",            desc: "Manage the print queue" },
  { value: "admin",     label: "Admin",      icon: "admin_panel_settings", desc: "Full system access" },
];

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", role: "student", collegeId: "" });
  const [loading, setLoading] = useState(false);
  const [showOTP, setShowOTP] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    if (!form.phone || form.phone.length < 10) { toast.error("Please enter a valid 10-digit phone number"); return; }
    
    setLoading(true);
    try {
      await authService.requestOTP(form.phone);
      toast.success("Verification code sent to WhatsApp!");
      setShowOTP(true);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (otp) => {
    setVerifying(true);
    try {
      await authService.verifyOTP(form.phone, otp);
      const user = await register(form);
      toast.success(`Account verified! Welcome, ${user.name}`);
      const roleHome = { student: "/upload", staff: "/upload", printshop: "/printshop", admin: "/admin" };
      navigate(roleHome[user.role] || "/upload");
    } catch (err) {
      toast.error(err.response?.data?.message || "Verification failed");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 540 }}>
        <div className="auth-logo">
          <div className="auth-logo-icon">
            <span className="material-symbols-outlined" style={{ color: "#fff", fontSize: 24 }}>print</span>
          </div>
          SmartPrint
        </div>

        <h2 style={{ textAlign: "center", marginBottom: 4, fontSize: "1.5rem" }}>Create account</h2>
        <p style={{ textAlign: "center", fontSize: "0.875rem", marginBottom: "var(--space-lg)" }}>
          Join your college print system
        </p>

        {/* Role selector */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: "var(--space-lg)" }}>
          {ROLES.map((r) => (
            <div
              key={r.value}
              onClick={() => setForm({ ...form, role: r.value })}
              id={`role-${r.value}`}
              style={{
                padding: "12px",
                borderRadius: "var(--radius-lg)",
                background: form.role === r.value ? "var(--primary-fixed)" : "var(--surface-container-high)",
                cursor: "pointer",
                transition: "all 0.15s",
                outline: form.role === r.value ? "2px solid var(--primary)" : "none",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16, color: form.role === r.value ? "var(--primary)" : "var(--on-surface-variant)" }}>{r.icon}</span>
                <span style={{ fontSize: "0.875rem", fontWeight: 700, color: form.role === r.value ? "var(--primary)" : "var(--on-surface)" }}>{r.label}</span>
              </div>
              <div style={{ fontSize: "0.7rem", color: "var(--on-surface-variant)" }}>{r.desc}</div>
            </div>
          ))}
        </div>

        <form className="auth-form" onSubmit={handleSubmit} id="register-form">
          <div className="grid-2" style={{ gap: "var(--space-md)" }}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input name="name" type="text" className="form-input" placeholder="Your name" value={form.name} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label className="form-label">College ID</label>
              <input name="collegeId" type="text" className="form-input" placeholder="22CS001" value={form.collegeId} onChange={handleChange} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Email</label>
            <input name="email" type="email" className="form-input" placeholder="you@college.edu" value={form.email} onChange={handleChange} required />
          </div>

          <div className="grid-2" style={{ gap: "var(--space-md)" }}>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input name="phone" type="tel" className="form-input" placeholder="9876543210" value={form.phone} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input name="password" type="password" className="form-input" placeholder="Min 6 chars" value={form.password} onChange={handleChange} required />
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-full btn-lg"
            disabled={loading} id="register-submit-btn" style={{ marginTop: "var(--space-sm)" }}>
            {loading ? <span className="spinner" /> : "Create Account"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: "var(--space-lg)", fontSize: "0.875rem", color: "var(--on-surface-variant)" }}>
          Already have an account?{" "}
          <Link to="/login" style={{ fontWeight: 700, color: "var(--primary)" }}>Sign in</Link>
        </p>
      </div>

      {showOTP && (
        <OTPModal
          mode="input"
          title="Verify your WhatsApp"
          description={`Enter the 6-digit code we sent to +91 ${form.phone}`}
          onVerify={handleVerifyOTP}
          onClose={() => setShowOTP(false)}
          loading={verifying}
        />
      )}
    </div>
  );
}
