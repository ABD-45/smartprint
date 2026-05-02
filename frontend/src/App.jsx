import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { QueueProvider } from "./context/QueueContext";
import { ThemeProvider } from "./context/ThemeContext";
import { Sidebar } from "./components/Sidebar";
import { Navbar } from "./components/Navbar";
import { ProtectedRoute } from "./components/ProtectedRoute";

import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import UploadPage from "./pages/student/UploadPage";
import PaymentPage from "./pages/student/PaymentPage";
import TrackPage from "./pages/student/TrackPage";
import PrintShopDashboard from "./pages/printshop/PrintShopDashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";

const ROLE_HOME = {
  student: "/upload",
  staff: "/upload",
  printshop: "/printshop",
  admin: "/admin",
};

const AppLayout = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  if (!isAuthenticated) return <>{children}</>;
  
  return (
    <div className="app-shell">
      {/* Mobile Navbar */}
      <Navbar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      
      {/* Sidebar Overlay */}
      <div 
        className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />
      
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="main-content">
        <header className="topbar">
          <span className="topbar-brand">SmartPrint</span>
          <div className="topbar-actions">
            <button className="icon-btn" title="Notifications">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <button className="icon-btn" title="Help">
              <span className="material-symbols-outlined">help_outline</span>
            </button>
            <div className="user-avatar" title={user?.name}>
              {user?.name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "?"}
            </div>
          </div>
        </header>
        <main style={{ flex: 1 }}>{children}</main>
      </div>
    </div>
  );
};

const AppRoutes = () => {
  const { isAuthenticated, user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to={ROLE_HOME[user?.role] || "/upload"} replace /> : <LoginPage />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to={ROLE_HOME[user?.role] || "/upload"} replace /> : <RegisterPage />} />
      <Route path="/upload" element={<ProtectedRoute allowedRoles={["student","staff","admin"]}><UploadPage /></ProtectedRoute>} />
      <Route path="/pay/:jobId" element={<ProtectedRoute allowedRoles={["student","staff","admin"]}><PaymentPage /></ProtectedRoute>} />
      <Route path="/track" element={<ProtectedRoute allowedRoles={["student","staff","admin"]}><TrackPage /></ProtectedRoute>} />
      <Route path="/printshop" element={<ProtectedRoute allowedRoles={["printshop","admin"]}><PrintShopDashboard /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute allowedRoles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
      <Route path="/" element={isAuthenticated ? <Navigate to={ROLE_HOME[user?.role] || "/upload"} replace /> : <Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <QueueProvider>
            <AppLayout>
              <AppRoutes />
            </AppLayout>
            <Toaster
              position="top-right"
              toastOptions={{
                style: {
                  background: "var(--surface-container-high)",
                  color: "var(--on-surface)",
                  border: "none",
                  borderRadius: "12px",
                  boxShadow: "0 4px 24px rgba(0,0,0,0.1)",
                  fontSize: "0.875rem",
                  fontFamily: "'Inter', sans-serif",
                },
                success: { iconTheme: { primary: "var(--primary)", secondary: "#fff" } },
                error:   { iconTheme: { primary: "var(--error)", secondary: "#fff" } },
              }}
            />
          </QueueProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
