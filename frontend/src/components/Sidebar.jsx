import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ThemeSwitcher } from "./ThemeSwitcher";

const NAV_CONFIG = {
  student: [
    { to: "/upload", label: "New Print Job", icon: "print" },
    { to: "/track",  label: "My Jobs",       icon: "receipt_long" },
  ],
  staff: [
    { to: "/upload", label: "New Print Job", icon: "print" },
    { to: "/track",  label: "My Jobs",       icon: "receipt_long" },
  ],
  printshop: [
    { to: "/printshop", label: "Print Queue", icon: "print" },
  ],
  admin: [
    { to: "/admin", label: "Dashboard",  icon: "dashboard" },
    { to: "/printshop", label: "Print Queue", icon: "print" },
  ],
};

export const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const links = NAV_CONFIG[user.role] || [];

  const handleLogout = () => { logout(); navigate("/login"); };

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-title">SmartPrint</div>
        <div className="sidebar-brand-sub">Print Portal</div>
      </div>

      <nav className="sidebar-nav">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}
          >
            <span className="material-symbols-outlined">{link.icon}</span>
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-cta">
        <NavLink to="/upload" className="sidebar-cta-btn">
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
          New Print Job
        </NavLink>
      </div>

      <ThemeSwitcher />

      <div className="sidebar-footer">
        <button className="sidebar-link" style={{ color: "#475569" }}>
          <span className="material-symbols-outlined">contact_support</span>
          <span>Support</span>
        </button>
        <button className="sidebar-link" onClick={handleLogout} id="logout-btn" style={{ color: "#ba1a1a" }}>
          <span className="material-symbols-outlined">logout</span>
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};
