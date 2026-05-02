import { Link, NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useQueue } from "../context/QueueContext";

const NAV_LINKS = {
  student: [
    { to: "/upload", label: "Upload", icon: "📤" },
    { to: "/track", label: "My Jobs", icon: "📋" },
  ],
  staff: [
    { to: "/upload", label: "Upload", icon: "📤" },
    { to: "/track", label: "My Jobs", icon: "📋" },
  ],
  printshop: [
    { to: "/printshop", label: "Dashboard", icon: "🖨️" },
  ],
  admin: [
    { to: "/admin", label: "Dashboard", icon: "📊" },
    { to: "/admin/jobs", label: "Jobs", icon: "📋" },
    { to: "/admin/users", label: "Users", icon: "👥" },
  ],
};

export const Navbar = () => {
  const { user, logout } = useAuth();
  const { connected } = useQueue();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const links = user ? NAV_LINKS[user.role] || [] : [];
  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <>
      {/* Mobile Navbar */}
      <nav className="navbar">
        <button 
          className={`hamburger-btn ${sidebarOpen ? 'open' : ''}`}
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        <Link to="/" className="navbar-brand">
          <div className="navbar-brand-icon">🖨️</div>
          SmartPrint
        </Link>

        <div className="navbar-user" style={{ gap: "8px" }}>
          {connected && (
            <div className="live-badge">
              <div className="live-dot" />
              Live
            </div>
          )}
          {user && (
            <>
              <div style={{ textAlign: "right", display: "none" }} className="user-info-desktop">
                <div style={{ fontSize: "0.875rem", fontWeight: 600 }}>{user.name}</div>
                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "capitalize" }}>
                  {user.role}
                </div>
              </div>
              <div className="user-avatar">{initials}</div>
            </>
          )}
        </div>
      </nav>

      {/* Sidebar Overlay for mobile */}
      <div 
        className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Bottom Navigation for mobile */}
      {user && (
        <nav className="bottom-nav">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => `bottom-nav-item ${isActive ? "active" : ""}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="material-symbols-outlined">{link.icon === "📤" ? "upload" : link.icon === "📋" ? "receipt_long" : link.icon === "🖨️" ? "print" : link.icon === "📊" ? "dashboard" : link.icon === "👥" ? "group" : "home"}</span>
              <span>{link.label}</span>
            </NavLink>
          ))}
        </nav>
      )}
    </>
  );
};
