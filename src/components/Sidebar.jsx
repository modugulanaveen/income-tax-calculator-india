
import React from "react";
import { 
  Home, Users, UserPlus, FileText, 
  Upload, Settings as SettingsIcon, Percent,
  ChevronUp, ChevronDown
} from "lucide-react"; 

export default function Sidebar({ setPage, page }) {
  const menuItems = [
    { id: "dashboard", icon: Home, label: "Dashboard" },
    { id: "employees", icon: Users, label: "Employees" },
    { id: "addEmployee", icon: UserPlus, label: "Add Employee" },
    { id: "payslips", icon: FileText, label: "Generate Payslips" },
    { id: "upload", icon: Upload, label: "Upload Excel", subLabel: "Bulk update" },
    { id: "settings", icon: SettingsIcon, label: "Settings", subLabel: "Bulk update" },
    { id: "epf-ecr", icon: Percent, label: "EPF/ECR", subLabel: "PF Management" }
  ];

  const scrollToTop = () => {
    // Simple and reliable: scroll the window
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToBottom = () => {
    // Simple and reliable: scroll the window to bottom
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };

  return (
    <aside className="sidebar">
      <div className="logo-section">
        <div className="logo">
          <div className="logo-icon">₹</div>
          <div>
            <h2>Payroll Pro</h2>
            <p className="logo-subtitle">Simple Payroll System</p>
          </div>
        </div>
      </div>

      <nav className="nav-menu">
        {menuItems.map((item) => (
          <button
            key={item.id}
            className={`nav-btn ${page === item.id ? "active" : ""}`}
            onClick={() => window.location.hash = item.id}
          >
            <item.icon size={20} />
            <div className="nav-labels">
              <span className="nav-label">{item.label}</span>
              {item.subLabel && <small className="nav-sub">{item.subLabel}</small>}
            </div>
          </button>
        ))}
      </nav>

      {/* Scroll Control Buttons */}
      <div className="scroll-controls">
        <button
          className="scroll-btn scroll-btn-top"
          onClick={scrollToTop}
          title="Back to Top"
        >
          <ChevronUp size={16} />
          <span>Top</span>
        </button>
        <button
          className="scroll-btn scroll-btn-bottom"
          onClick={scrollToBottom}
          title="Go to Bottom"
        >
          <ChevronDown size={16} />
          <span>Down</span>
        </button>
      </div>

      <div className="sidebar-footer">
        <div className="version-info">
          <small>Version 2.0.0</small>
        </div>
      </div>
    </aside>
  );
}
