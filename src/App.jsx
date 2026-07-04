
import React, { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import Employees from "./components/Employees";
import AddEmployee from "./components/AddEmployee";
import PayslipPreview from "./components/PayslipPreview";
import ExcelUpload from "./components/ExcelUpload";
import Settings from "./components/Settings";
import EPFECRGenerator from "./components/EPFECRGenerator";

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
  logoDataUrl: null
};

export default function App() {
  const [page, setPage] = useState("dashboard");
  const [employees, setEmployees] = useState([]);
  const [company, setCompany] = useState(initialCompany);

  // Load from localStorage
  useEffect(() => {
    const savedData = localStorage.getItem("payrollData");
    if (savedData) {
      try {
        const data = JSON.parse(savedData);
        setEmployees(data.employees || []);
        setCompany(data.company || initialCompany);
      } catch (error) {
        console.warn("Failed to parse saved payrollData from localStorage.", error);
      }
    }
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

  // Save to localStorage
  useEffect(() => {
    const data = { employees, company };
    try {
      const json = JSON.stringify(data);
      localStorage.setItem("payrollData", json);
    } catch (error) {
      if (error instanceof DOMException && (error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED")) {
        console.warn("Unable to save payrollData to localStorage: quota exceeded.", error);
      } else {
        console.error("Unable to save payrollData to localStorage:", error);
      }
    }
  }, [employees, company]);

  return (
    <div className={`app-container`}>
      <Sidebar 
        setPage={setPage} 
        page={page} 
      />
      
      <div className="main-content">
        {page === "dashboard" && (
          <Dashboard employees={employees} company={company} />
        )}
        {page === "employees" && (
          <Employees employees={employees} setEmployees={setEmployees} />
        )}
        {page === "addEmployee" && (
          <AddEmployee employees={employees} setEmployees={setEmployees} setPage={setPage} setCompany={setCompany} />
        )}
        {page === "payslips" && (
          <PayslipPreview employees={employees} company={company} />
        )}
        {page === "upload" && (
          <ExcelUpload employees={employees} setEmployees={setEmployees} company={company} />
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
