import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useQueue } from "../context/QueueContext";

const NAV_LINKS = {
  student: [
    { to: "/upload", label: "Upload", icon: "upload" },
    { to: "/track", label: "My Jobs", icon: "receipt_long" },
  ],
  staff: [
    { to: "/upload", label: "Upload", icon: "upload" },
    { to: "/track", label: "My Jobs", icon: "receipt_long" },
  ],
  printshop: [
    { to: "/printshop", label: "Dashboard", icon: "print" },
  ],
  admin: [
    { to: "/admin", label: "Dashboard", icon: "dashboard" },
    { to: "/printshop", label: "Queue", icon: "print" },
  ],
};

export const Navbar = ({ sidebarOpen, setSidebarOpen }) => {
  const { user } = useAuth();
  const { connected } = useQueue();

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
            <div className="user-avatar">{initials}</div>
          )}
        </div>
      </nav>

      {/* Bottom Navigation for mobile */}
      {user && (
        <nav className="bottom-nav">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => `bottom-nav-item ${isActive ? "active" : ""}`}
            >
              <span className="material-symbols-outlined">{link.icon}</span>
              <span>{link.label}</span>
            </NavLink>
          ))}
        </nav>
      )}
    </>
  );
};
