import React from "react";
import SalaryCalculator from "./SalaryCalculator";
import { 
  Users, CreditCard, TrendingUp, Calendar,
  Award, Shield, Star, Phone, Mail, MapPin
} from "lucide-react";

export default function Dashboard({ employees = [], company }) {
  const totalEmployees = employees.length;
  const totalNetSalary = employees.reduce((sum, emp) => sum + (emp.net || 0), 0);
  const totalGrossSalary = employees.reduce((sum, emp) => sum + (emp.gross || 0), 0);
  
  // Calculate total deductions - handle both numeric and array formats
  const totalDeductions = employees.reduce((sum, emp) => {
    let deductionAmount = 0;
    if (emp.deductions) {
      if (Array.isArray(emp.deductions)) {
        // If deductions is an array, sum the amounts
        deductionAmount = emp.deductions.reduce((s, d) => s + (parseFloat(d.amount) || 0), 0);
      } else if (typeof emp.deductions === 'number') {
        // If it's already a number, use it directly
        deductionAmount = emp.deductions;
      }
    }
    return sum + deductionAmount;
  }, 0);
  
  // Calculate average salary
  const avgSalary = totalEmployees > 0 ? totalNetSalary / totalEmployees : 0;
  
  // Recent activities
  const recentActivities = [
    { id: 1, action: "Payroll processed for March", time: "2 hours ago", type: "payroll" },
    { id: 2, action: "5 new employees added", time: "Yesterday", type: "employee" },
    { id: 3, action: "Company settings updated", time: "2 days ago", type: "settings" },
    { id: 4, action: "Payslips generated for 15 employees", time: "3 days ago", type: "payslip" }
  ];

  // Your CA Firm Details (You can update these)
  const caFirmDetails = {
    name: "CA koteswr & company ",
    yourName: "CA KOTESWR",
    designation: "Chartered Accountant",
    experience: "10+ Years Experience",
    specialization: "Payroll, Taxation & Compliance",
    phone: "+91 9133250505",
    email: "panuganti@koteshvr.com",
    address: "21-84,vivekanda nagar, gaddiannaram, hyderabad - 500060",
    services: [
      "Payroll Processing",
      "Tax Filing & Compliance",
      "GST Services",
      "Company Registration",
      "Accounting & Auditing",
      "Business Advisory"
    ]
  };

  return (
    <div className="dashboard-page">
      {/* Header with Welcome */}
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Welcome to Professional Payroll Management System</p>
        </div>
        <div className="header-actions">
          <span className="current-date">
            <Calendar size={16} />
            {new Date().toLocaleDateString('en-IN', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </span>
        </div>
      </div>

      <SalaryCalculator />

      {/* CA Firm Introduction */}
      <div className="ca-firm-section">
        <div className="ca-profile">
          <div className="ca-photo-container">
            {/* Replace with your photo URL or use placeholder */}
            <div className="ca-photo">
              <img 
                src="sirimage.jpg" 
                alt="CA [Your Name]"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentElement.innerHTML = '<div class="ca-photo-placeholder"><Award size={48} /></div>';
                }}
              />
              <div className="ca-badge">
                <Award size={16} />
                <span>CA</span>
              </div>
            </div>
            <div className="ca-info">
              <h2>{caFirmDetails.yourName}</h2>
              <p className="ca-designation">{caFirmDetails.designation}</p>
              <p className="ca-experience">{caFirmDetails.experience}</p>
              <div className="ca-specialization">
                <Shield size={14} />
                <span>{caFirmDetails.specialization}</span>
              </div>
            </div>
          </div>
          
          <div className="ca-firm-details">
            <h3>{caFirmDetails.name}</h3>
            <div className="contact-details">
              <div className="contact-item">
                <Phone size={16} />
                <span>{caFirmDetails.phone}</span>
              </div>
              <div className="contact-item">
                <Mail size={16} />
                <span>{caFirmDetails.email}</span>
              </div>
              <div className="contact-item">
                <MapPin size={16} />
                <span>{caFirmDetails.address}</span>
              </div>
            </div>
            
            <div className="services-section">
              <h4>Our Services:</h4>
              <div className="services-grid">
                {caFirmDetails.services.map((service, index) => (
                  <div key={index} className="service-badge">
                    <Star size={12} />
                    <span>{service}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="ca-message">
              <p>
                <strong>Professional Payroll Solution:</strong> This system is designed by {caFirmDetails.name} 
                to provide efficient, accurate, and compliant payroll management for businesses of all sizes.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-section">
        <h3>Payroll Overview</h3>
        <div className="stats-grid">
          <div className="stat-card blue">
            <div className="stat-icon">
              <Users size={24} />
            </div>
            <div className="stat-content">
              <h4>Total Employees</h4>
              <div className="stat-value">{totalEmployees}</div>
              <p className="stat-sub">Active in system</p>
            </div>
          </div>

          <div className="stat-card green">
            <div className="stat-icon">
              <CreditCard size={24} />
            </div>
            <div className="stat-content">
              <h4>Total Payroll</h4>
              <div className="stat-value">₹{totalNetSalary.toLocaleString()}</div>
              <p className="stat-sub">This month</p>
            </div>
          </div>

          <div className="stat-card purple">
            <div className="stat-icon">
              <TrendingUp size={24} />
            </div>
            <div className="stat-content">
              <h4>Average Salary</h4>
              <div className="stat-value">₹{avgSalary.toLocaleString()}</div>
              <p className="stat-sub">Per employee</p>
            </div>
          </div>

          <div className="stat-card orange">
            <div className="stat-content">
              <h4>Total Deductions</h4>
              <div className="stat-value">₹{totalDeductions.toLocaleString()}</div>
              <p className="stat-sub">PF, Tax & PT</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="dashboard-content">
        <div className="content-left">
          <div className="quick-actions-card">
            <h3>Quick Actions</h3>
            <div className="actions-grid">
              <button className="action-btn" onClick={() => window.location.hash = "#addEmployee"}>
                <Users size={20} />
                <span>Add Employee</span>
              </button>
              <button className="action-btn" onClick={() => window.location.hash = "#payslips"}>
                <CreditCard size={20} />
                <span>Generate Payslips</span>
              </button>
              <button className="action-btn" onClick={() => window.location.hash = "#upload"}>
                <TrendingUp size={20} />
                <span>Upload CSV</span>
              </button>
            </div>
          </div>

          <div className="recent-activity-card">
            <h3>Recent Activity</h3>
            <div className="activity-list">
              {recentActivities.map(activity => (
                <div key={activity.id} className="activity-item">
                  <div className="activity-icon">
                    {activity.type === 'payroll' && <CreditCard size={16} />}
                    {activity.type === 'employee' && <Users size={16} />}
                    {activity.type === 'settings' && <Shield size={16} />}
                    {activity.type === 'payslip' && <TrendingUp size={16} />}
                  </div>
                  <div className="activity-content">
                    <p>{activity.action}</p>
                    <span className="activity-time">{activity.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="content-right">
          <div className="system-info-card">
            <h3>About This System</h3>
            <div className="system-info">
              <div className="info-item">
                <strong>Version:</strong>
                <span>2.1.0 (Professional Edition)</span>
              </div>
              <div className="info-item">
                <strong>Developed By:</strong>
                <span>{caFirmDetails.name}</span>
              </div>
              <div className="info-item">
                <strong>Compliance:</strong>
                <span>100% Indian Payroll Standards</span>
              </div>
              <div className="info-item">
                <strong>Data Security:</strong>
                <span>Local Storage Encryption</span>
              </div>
              <div className="info-item">
                <strong>Support:</strong>
                <span>{caFirmDetails.phone}</span>
              </div>
            </div>
            
            <div className="features-list">
              <h4>Key Features:</h4>
              <ul>
                <li>Professional Payslip Generation with Company Logo</li>
                <li>Complete Tax & PF Calculation</li>
                <li>Bank Details Management</li>
                <li>CSV Import/Export</li>
                <li>Digital Signature Support</li>
              </ul>

              <div className="contact-services">
                <span>📊 Payroll Outsourcing</span>
                <span>📋 Tax Filing Services</span>
                <span>🏢 Business Registration</span>
                <span>💰 Financial Advisory</span>
              </div>
              <div className="contact-info">
                <p><Phone size={16} /> {caFirmDetails.phone}</p>
                <p><Mail size={16} /> {caFirmDetails.email}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Message */}
      <div className="dashboard-footer">
        <div className="footer-message">
          <Award size={20} />
          <div>
            <p>
              <strong>Professional Payroll Management System</strong> - 
              Designed and developed by {caFirmDetails.name} for accurate, 
              compliant, and efficient payroll processing.
            </p>
            <p className="footer-note">
              For customization, support, or consultation services, please contact us.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}