import React, { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import Employees from "./components/Employees";
import AddEmployee from "./components/AddEmployee";
import PayslipPreview from "./components/PayslipPreview";
import ExcelUpload from "./components/ExcelUpload";
import Settings from "./components/Settings";
import EPFECRGenerator from "./components/EPFECRGenerator";
import { loadPayrollData, savePayrollData } from "./services/payrollStorage";

const initialCompany = {
  companyName: "Your Company Name",
  address: "123 Business Street, City, State - PIN",
  cityPincode: "",
  country: "India",
  email: "",
  phone: "",
  website: "",
  panNumber: "ABCDE1234F",
  tanNumber: "BLRA12345F",
  logoDataUrl: null,
};

export default function App() {
  const [page, setPage] = useState("dashboard");
  const [employees, setEmployees] = useState([]);
  const [company, setCompany] = useState(initialCompany);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [saveStatus, setSaveStatus] = useState("Loading payroll data...");

  useEffect(() => {
    const hydrate = async () => {
      setSaveStatus("Loading payroll data...");
      const data = await loadPayrollData();
      setEmployees(data.employees || []);
      setCompany(data.company || initialCompany);
      setHasHydrated(true);
      setSaveStatus("Payroll data loaded");
    };

    hydrate();
  }, []);

  // Handle hash-based routing
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.substring(1) || "dashboard";
      setPage(hash);
    };

    window.addEventListener("hashchange", handleHashChange);
    handleHashChange();

    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;

    const data = { employees, company };
    const timer = window.setTimeout(async () => {
      setSaveStatus("Saving payroll data...");
      const result = await savePayrollData(data);
      setSaveStatus(
        result.source === "supabase"
          ? "Saved to shared storage"
          : "Saved locally",
      );
    }, 300);

    return () => window.clearTimeout(timer);
  }, [employees, company, hasHydrated]);

  return (
    <div className={`app-container`}>
      <Sidebar setPage={setPage} page={page} />

      <div className="main-content">
        <div
          style={{
            padding: "0.75rem 1rem",
            marginBottom: "1rem",
            borderRadius: "0.75rem",
            background: "#f9fafb",
            border: "1px solid #e5e7eb",
            color: "#374151",
          }}
        >
          {saveStatus}
        </div>

        {page === "dashboard" && (
          <Dashboard employees={employees} company={company} />
        )}
        {page === "employees" && (
          <Employees employees={employees} setEmployees={setEmployees} />
        )}
        {page === "addEmployee" && (
          <AddEmployee
            employees={employees}
            setEmployees={setEmployees}
            setPage={setPage}
            setCompany={setCompany}
          />
        )}
        {page === "payslips" && (
          <PayslipPreview employees={employees} company={company} />
        )}
        {page === "upload" && (
          <ExcelUpload
            employees={employees}
            setEmployees={setEmployees}
            company={company}
          />
        )}
        {page === "epf-ecr" && (
          <EPFECRGenerator company={company} employees={employees} />
        )}
        {page === "settings" && (
          <Settings company={company} setCompany={setCompany} />
        )}
      </div>
    </div>
  );
}
