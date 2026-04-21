import { Link, NavLink, useNavigate } from "react-router-dom";
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

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const links = user ? NAV_LINKS[user.role] || [] : [];
  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        <div className="navbar-brand-icon">🖨️</div>
        SmartPrint
      </Link>

      <div className="navbar-nav">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
          >
            <span>{link.icon}</span>
            <span>{link.label}</span>
          </NavLink>
        ))}
      </div>

      <div className="navbar-user" style={{ gap: "12px" }}>
        {connected && (
          <div className="live-badge">
            <div className="live-dot" />
            Live
          </div>
        )}
        {user && (
          <>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "0.875rem", fontWeight: 600 }}>{user.name}</div>
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "capitalize" }}>
                {user.role}
              </div>
            </div>
            <div className="user-avatar">{initials}</div>
            <button
              className="btn btn-ghost btn-sm"
              onClick={handleLogout}
              id="logout-btn"
            >
              Exit
            </button>
          </>
        )}
      </div>
    </nav>
  );
};
