import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      toast.success(`Welcome back, ${user.name}!`);
      const roleHome = { student: "/upload", staff: "/upload", printshop: "/printshop", admin: "/admin" };
      navigate(roleHome[user.role] || "/upload");
    } catch (err) {
      toast.error(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">
            <span className="material-symbols-outlined" style={{ color: "#fff", fontSize: 24 }}>print</span>
          </div>
          SmartPrint
        </div>

        <h2 style={{ textAlign: "center", marginBottom: 4, fontSize: "1.5rem" }}>Welcome back</h2>
        <p style={{ textAlign: "center", fontSize: "0.875rem", marginBottom: "var(--space-xl)" }}>
          Sign in to your account
        </p>

        <form className="auth-form" onSubmit={handleSubmit} id="login-form">
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email</label>
            <input id="email" name="email" type="email" className="form-input"
              placeholder="you@college.edu" value={form.email} onChange={handleChange} required autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input id="password" name="password" type="password" className="form-input"
              placeholder="••••••••" value={form.password} onChange={handleChange} required />
          </div>
          <button type="submit" className="btn btn-primary btn-full btn-lg"
            disabled={loading} id="login-submit-btn" style={{ marginTop: "var(--space-sm)" }}>
            {loading ? <span className="spinner" /> : "Sign In"}
          </button>
        </form>

        <div className="auth-divider" style={{ marginTop: "var(--space-lg)" }}>or</div>

        <p style={{ textAlign: "center", marginTop: "var(--space-md)", fontSize: "0.875rem", color: "var(--on-surface-variant)" }}>
          Don't have an account?{" "}
          <Link to="/register" style={{ fontWeight: 700, color: "var(--primary)" }}>Create one</Link>
        </p>

        <div className="alert alert-info" style={{ marginTop: "var(--space-lg)", flexDirection: "column", gap: 4 }}>
          <div style={{ fontWeight: 700, fontSize: "0.8rem" }}>Demo Accounts</div>
          <div style={{ fontSize: "0.75rem" }}>Register with role: student, staff, printshop, or admin</div>
        </div>
      </div>
    </div>
  );
}
