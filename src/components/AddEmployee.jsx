import React, { useState } from "react";

export default function AddEmployee({ employees, setEmployees, setPage, setCompany }) {
  const initial = {
    logo: null,
    logoDataUrl: "",
    companyName: "",
    companyAddress: "",
    cityPincode: "",
    country: "India",
    name: "",
    employeeId: "",
    payPeriod: new Date().toISOString().slice(0,7),
    paidDays: "",
    lossOfPayDays: "0",
    payDate: new Date().toISOString().slice(0,10),
    // Dynamic earnings and deductions arrays
    earnings: [
      { label: "Basic", amount: "0" },
      { label: "House Rent Allowance", amount: "0" }
    ],
    deductions: [
      { label: "Income Tax", amount: "0" },
      { label: "Provident Fund", amount: "0" }
    ]
  };

  const [formData, setFormData] = useState(initial);
  const [logoPreview, setLogoPreview] = useState(null);
  const [validationWarnings, setValidationWarnings] = useState([]);

  const handleLogo = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFormData({...formData, logo: file});

    const reader = new FileReader();
    reader.onload = (ev) => {
      setFormData(prev => ({ ...prev, logoDataUrl: ev.target.result }));
      setLogoPreview(ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  const calculate = () => {
    const gross = (formData.earnings || []).reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    const deductions = (formData.deductions || []).reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
    const net = gross - deductions;
    return { gross, deductions, net };
  };

  // Validate earnings and deductions
  const validateSalaryData = () => {
    const warnings = [];
    const { gross, deductions } = calculate();
    
    if (gross === 0) {
      warnings.push("⚠️ Gross earnings is 0. Please add earnings details.");
    }
    if (gross < 5000) {
      warnings.push("⚠️ Gross earnings is very low (less than ₹5,000).");
    }
    if (deductions > gross * 0.75) {
      warnings.push("⚠️ Deductions are too high (>75% of gross). Please verify.");
    }
    if (deductions > gross) {
      warnings.push("❌ ERROR: Deductions exceed gross earnings! This will result in negative net salary.");
    }
    if (gross > 5000000) {
      warnings.push("⚠️ Gross earnings is very high (>₹50 lakhs). Please verify.");
    }
    
    setValidationWarnings(warnings);
    return warnings.length === 0 || deductions <= gross;
  };

  // Helpers to manage dynamic rows
  const addEarning = () => setFormData(prev => ({ 
    ...prev, 
    earnings: [...(prev.earnings || []), { label: "", amount: "0" }] 
  }));
  
  const updateEarning = (idx, key, value) => setFormData(prev => ({ 
    ...prev, 
    earnings: (prev.earnings || []).map((it, i) => i === idx ? { ...it, [key]: value } : it) 
  }));
  
  const removeEarning = (idx) => setFormData(prev => ({ 
    ...prev, 
    earnings: (prev.earnings || []).filter((_, i) => i !== idx) 
  }));

  const addDeduction = () => setFormData(prev => ({ 
    ...prev, 
    deductions: [...(prev.deductions || []), { label: "", amount: "0" }] 
  }));
  
  const updateDeduction = (idx, key, value) => setFormData(prev => ({ 
    ...prev, 
    deductions: (prev.deductions || []).map((it, i) => i === idx ? { ...it, [key]: value } : it) 
  }));
  
  const removeDeduction = (idx) => setFormData(prev => ({ 
    ...prev, 
    deductions: (prev.deductions || []).filter((_, i) => i !== idx) 
  }));

  // Function to handle CSV data import from ExcelUpload component
  const handleImportFromCSV = (csvData) => {
    if (csvData && csvData.length > 0) {
      const firstEmployee = csvData[0];
      setFormData(prev => ({
        ...prev,
        name: firstEmployee.name || "",
        employeeId: firstEmployee.employeeId || "",
        payPeriod: firstEmployee.payPeriod || new Date().toISOString().slice(0,7),
        payDate: firstEmployee.payDate || new Date().toISOString().slice(0,10),
        paidDays: firstEmployee.paidDays || "",
        lossOfPayDays: firstEmployee.lossOfPayDays || "0",
        earnings: firstEmployee.earnings || [{ label: "Basic", amount: "0" }],
        deductions: firstEmployee.deductions || [{ label: "Income Tax", amount: "0" }]
      }));
    }
  };

  const preview = calculate();

  // Trigger validation whenever earnings or deductions change
  React.useEffect(() => {
    validateSalaryData();
  }, [formData.earnings, formData.deductions]);

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validate before submission
    const isValid = validateSalaryData();
    if (!isValid) {
      alert("❌ Please fix the salary calculation errors before saving!");
      return;
    }

    // Clean earnings and deductions - remove empty labels
    const cleanEarnings = (formData.earnings || [])
      .filter(e => e.label && e.label.trim() !== "")
      .map(e => ({ 
        label: e.label.trim() || "Earning", 
        amount: Number(e.amount) || 0 
      }));
    
    const cleanDeductions = (formData.deductions || [])
      .filter(d => d.label && d.label.trim() !== "")
      .map(d => ({ 
        label: d.label.trim() || "Deduction", 
        amount: Number(d.amount) || 0 
      }));

    // Ensure at least one earning exists
    if (cleanEarnings.length === 0) {
      cleanEarnings.push({ label: "Basic", amount: 0 });
    }

    const newEmp = {
      id: Date.now().toString(),
      name: formData.name || `Employee ${employees.length + 1}`,
      employeeId: formData.employeeId || `EMP${String(employees.length + 1).padStart(4,"0")}`,
      payPeriod: formData.payPeriod,
      // computed friendly month string used by PayslipPreview
      month: formData.payPeriod ? new Date(formData.payPeriod + "-01").toLocaleString('default', { month: 'long', year: 'numeric' }) : undefined,
      paidDays: formData.paidDays,
      lossOfPayDays: formData.lossOfPayDays,
      payDate: formData.payDate,
      
      // Use cleaned arrays
      earnings: cleanEarnings,
      deductions: cleanDeductions,
      
      gross: preview.gross,
      totalDeductions: preview.deductions,
      net: preview.net,
      
      company: {
        companyName: formData.companyName || formData.name || "Company Name",
        name: formData.companyName || formData.name || "Company Name",
        address: (formData.companyAddress || "").trim(),
        cityPincode: formData.cityPincode || "",
        city: formData.cityPincode || "",
        country: formData.country || "India",
        logoDataUrl: formData.logoDataUrl || ""
      }
    };

    setEmployees([...employees, newEmp]);

    if (typeof setCompany === "function") {
      setCompany(newEmp.company);
    }

    if (typeof setPage === "function") setPage("payslips");
    else window.location.hash = "#payslips";
    
    // Show success message
    alert(`Employee "${newEmp.name}" added successfully!`);
  };

  const handleReset = () => {
    setFormData(initial);
    setLogoPreview(null);
  };

  // Function to add multiple earnings/deductions at once (useful for CSV imports)
  const addMultipleEarnings = (earningsArray) => {
    setFormData(prev => ({
      ...prev,
      earnings: [...(prev.earnings || []), ...earningsArray]
    }));
  };

  const addMultipleDeductions = (deductionsArray) => {
    setFormData(prev => ({
      ...prev,
      deductions: [...(prev.deductions || []), ...deductionsArray]
    }));
  };

  return (
    <div className="add-employee-page">
      {/* Top Company Section */}
      <div className="top-section">
        <div className="top-upload-section">
          <input 
            type="file" 
            id="logo-upload" 
            accept="image/*" 
            onChange={handleLogo}
            style={{ display: 'none' }}
          />
          <label htmlFor="logo-upload" className="upload-button">
            {logoPreview ? (
              <img src={logoPreview} alt="logo preview" className="logo-preview" />
            ) : (
              <span className="upload-label">Upload</span>
            )}
          </label>
          <div className="file-info">
            <span>{formData.logo ? formData.logo.name : 'No file chosen'}</span>
          </div>
        </div>
        
        <div className="company-section">
          <div className="company-row">
            <label>Company Name*</label>
            <input 
              type="text" 
              value={formData.companyName}
              onChange={(e) => setFormData({...formData, companyName: e.target.value})}
              placeholder="Company Name"
              required
            />
          </div>
          <div className="company-row">
            <input 
              type="text" 
              value={formData.companyAddress}
              onChange={(e) => setFormData({...formData, companyAddress: e.target.value})}
              placeholder="Company Address"
            />
          </div>
          <div className="company-row">
            <input 
              type="text" 
              value={formData.cityPincode}
              onChange={(e) => setFormData({...formData, cityPincode: e.target.value})}
              placeholder="City, Pincode"
            />
          </div>
          <div className="company-row">
            <input 
              type="text" 
              value={formData.country}
              onChange={(e) => setFormData({...formData, country: e.target.value})}
            />
          </div>
        </div>
        
        <div className="pay-month-section">
          <div className="pay-month-title">
            Payslip For the Month
          </div>
          <div className="pay-month-date">
            {new Date(formData.payPeriod + "-01").toLocaleString('default', { 
              month: 'long', 
              year: 'numeric' 
            })}
          </div>
        </div>
      </div>

      {/* Employee Summary */}
      <div className="employee-summary-section">
        <div className="section-title">
          Employee Pay Summary <span className="required">*</span>
        </div>
        
        <div className="summary-grid">
          <div className="summary-column">
            <div className="summary-row">
              <label>Employee Name</label>
              <div className="input-field">
                <span>:</span>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Eg: Meera Krishnan"
                  required
                />
              </div>
            </div>
            
            <div className="summary-row">
              <label>Pay Period</label>
              <div className="input-field">
                <span>:</span>
                <input
                  type="month"
                  value={formData.payPeriod}
                  onChange={(e) => setFormData({...formData, payPeriod: e.target.value})}
                  aria-label="Select pay period"
                  required
                />
              </div>
            </div>
            
            <div className="summary-row">
              <label>Loss of Pay Days</label>
              <div className="input-field">
                <span>:</span>
                <input 
                  type="number" 
                  min="0"
                  value={formData.lossOfPayDays}
                  onChange={(e) => setFormData({...formData, lossOfPayDays: e.target.value})}
                />
              </div>
            </div>
          </div>
          
          <div className="summary-column">
            <div className="summary-row">
              <label>Employee ID</label>
              <div className="input-field">
                <span>:</span>
                <input 
                  type="text" 
                  value={formData.employeeId}
                  onChange={(e) => setFormData({...formData, employeeId: e.target.value})}
                  placeholder="Eg: 1234"
                />
              </div>
            </div>
            
            <div className="summary-row">
              <label>Paid Days</label>
              <div className="input-field">
                <span>:</span>
                <input 
                  type="number" 
                  min="0"
                  max="31"
                  value={formData.paidDays}
                  onChange={(e) => setFormData({...formData, paidDays: e.target.value})}
                  placeholder="Eg: 22"
                  required
                />
              </div>
            </div>
            
            <div className="summary-row">
              <label>Pay Date</label>
              <div className="input-field">
                <span>:</span>
                <input 
                  type="date" 
                  value={formData.payDate}
                  onChange={(e) => setFormData({...formData, payDate: e.target.value})}
                  required
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Income Details */}
      <div className="income-details-section">
        <div className="income-table">
          <div className="income-table-header">
            <div className="section-title">
              Income Details <span className="required">*</span>
              <small style={{ marginLeft: '10px', fontSize: '12px', color: 'var(--text-light)' }}>
                (Add as many earnings/deductions as needed)
              </small>
            </div>
          </div>

          <div className="table-header">
            <div className="header-cell">Earnings</div>
            <div className="header-cell">Amount</div>
            <div className="header-cell">Deductions</div>
            <div className="header-cell">Amount</div>
          </div> 

          <div className="table-body split">
            <div className="earnings-column">

              {(formData.earnings || []).map((earning, i) => (
                <div className="table-row" key={`e${i}`}>
                  <div className="cell">
                    <input
                      className="label-input"
                      value={earning.label}
                      onChange={(e) => updateEarning(i, 'label', e.target.value)}
                      placeholder="Earning name (e.g., Basic, HRA, Bonus)"
                    />
                    {((formData.earnings || []).length > 1) && (
                      <button 
                        type="button" 
                        className="remove-btn" 
                        onClick={() => removeEarning(i)}
                        title="Remove this earning"
                      >
                        ×
                      </button>
                    )}
                  </div>

                  <div className="cell amount-cell">
                    <input
                      className="dotted-input small"
                      type="number"
                      min="0"
                      step="0.01"
                      value={earning.amount}
                      onChange={(e) => updateEarning(i, 'amount', e.target.value)}
                      placeholder="0"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="deductions-column">

              {(formData.deductions || []).map((deduction, i) => (
                <div className="table-row" key={`d${i}`}>
                  <div className="cell">
                    <input
                      className="label-input"
                      value={deduction.label}
                      onChange={(e) => updateDeduction(i, 'label', e.target.value)}
                      placeholder="Deduction name (e.g., Tax, PF, Insurance)"
                    />
                    {((formData.deductions || []).length > 1) && (
                      <button 
                        type="button" 
                        className="remove-btn" 
                        onClick={() => removeDeduction(i)}
                        title="Remove this deduction"
                      >
                        ×
                      </button>
                    )}
                  </div>

                  <div className="cell amount-cell">
                    <input
                      className="dotted-input small"
                      type="number"
                      min="0"
                      step="0.01"
                      value={deduction.amount}
                      onChange={(e) => updateDeduction(i, 'amount', e.target.value)}
                      placeholder="0"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="table-actions">
            <div className="left-action">
              <button 
                type="button" 
                className="link-btn" 
                onClick={addEarning}
                title="Add new earnings field"
              >
                + Add Earnings
              </button>
            </div>
            
            <div className="right-action">
              <button 
                type="button" 
                className="link-btn" 
                onClick={addDeduction}
                title="Add new deductions field"
              >
                + Add Deductions
              </button>
            </div>
          </div>

          <div className="table-footer">
            <div className="footer-left">
              Gross Earnings <strong>₹{preview.gross.toLocaleString()}</strong>
            </div>
            <div className="footer-right">
              Total Deductions <strong>₹{preview.deductions.toLocaleString()}</strong>
            </div>
          </div>

          {/* Total net payable summary */}
          <div className="net-payable">
            <div>
              <div className="label">Total Net Payable</div>
              <div className="sub">Gross Earnings - Total Deductions</div>
            </div>
            <div className="amount">₹{preview.net.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="action-buttons">
        <button type="submit" className="generate-btn" onClick={handleSubmit}>
          Generate Payslip
        </button>
        <button type="button" className="reset-btn" onClick={handleReset}>
          Reset
        </button>
        
        {/* CSV Import Helper Button */}
        <button 
          type="button" 
          className="btn btn-secondary"
          onClick={() => window.location.hash = "#upload"}
          style={{ marginLeft: 'auto' }}
        >
          Import from Excel
        </button>
      </div>
      

    </div>
  );
}