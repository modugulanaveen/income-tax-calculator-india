
import React, { useState, useEffect } from 'react';
import {
  Upload, Download, Plus, Trash2, Calculator,
  Eye, Settings, Percent, FileText, Table, AlertCircle
} from 'lucide-react';
import ExcelJS from 'exceljs';
import { usePFData } from '../hooks/usePFData';
import { calculatePF } from '../utils/pfCalculator';
import Toast from './Toast';
import {
  formatToECRLine,
  generateECRFileContent,
  generateCSVContent,
  generateECRFilename,
  parseECRContent,
  parseCSVContent,
} from '../utils/ecrFormatter';
import '../styles/epf-ecr.css';

export default function EPFECRGenerator({ company = {}, employees = [] }) {
  const { pfData, errors, success, setErrors, setSuccess, setPFData, getTotals } = usePFData();
  const [activeTab, setActiveTab] = useState('calculator');
  const [showDetailed, setShowDetailed] = useState(false);
  const [toast, setToast] = useState(null);

  // Initialize pfData from employees when component mounts or employees change
  useEffect(() => {
    if (employees && employees.length > 0) {
      // Convert employees to PF data format
      const pfRecords = employees.map((emp) => {
        // Calculate PF wages: Basic + DA only (as per EPFO rules)
        let basicWage = 0;
        let daWage = 0;
        
        if (emp.earnings && Array.isArray(emp.earnings)) {
          emp.earnings.forEach(earning => {
            const label = earning.label ? earning.label.toLowerCase() : '';
            if (label.includes('basic') || label.includes('salary')) {
              basicWage += earning.amount || 0;
            }
            if (label.includes('dearness') || label.includes('da')) {
              daWage += earning.amount || 0;
            }
          });
        }
        
        // If no basic wage found, use 0 and let user enter it manually
        const pfWageAmount = basicWage + daWage;
        const gross = emp.gross || 0;
        const pfCalc = calculatePF(pfWageAmount || gross);
        
        return {
          id: emp.id || `EMP-${Date.now()}-${Math.random()}`,
          uan: emp.uan || "",
          name: emp.name || "",
          grossWages: gross,
          epfWages: pfWageAmount || gross,
          epsWages: pfWageAmount || gross,
          edliWages: pfWageAmount || gross,
          ncpDays: emp.lossOfPayDays || 0,
          refundAdvances: 0,
          ...pfCalc
        };
      });
      setPFData(pfRecords);
    }
  }, [employees, setPFData]);

  // Calculator states
  const [calcBasic, setCalcBasic] = useState('');
  const [calcDA, setCalcDA] = useState('');
  const [calcNcp, setCalcNcp] = useState('0');
  const [calcResult, setCalcResult] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    uan: '',
    name: '',
    grossWages: '',
    epfWages: '',
    epsWages: '',
    edliWages: '',
    epfEe: '',
    eps: '',
    epfEr: '',
    edli: '',
    adminCharge: '',
    edliAdminCharge: '',
    ncpDays: '0',
    refundAdvances: '0'
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [estCode, setEstCode] = useState('');

  // ========== CALCULATOR HANDLERS ==========
  const handleCalculate = () => {
    if (!calcBasic || !calcDA) {
      setErrors(['Please enter both Basic and DA wages']);
      return;
    }

    const pfWage = parseFloat(calcBasic) + parseFloat(calcDA);
    const calc = calculatePF(pfWage);
    setCalcResult({
      ...calc,
      ncpDays: parseInt(calcNcp) || 0,
    });
    setErrors([]);
  };

  const handleApplyCalculation = () => {
    if (!calcResult || !formData.uan) {
      setErrors(['Please enter UAN and perform calculation first']);
      return;
    }

    const updated = {
      ...formData,
      grossWages: calcResult.grossWages,
      epfWages: calcResult.epfWages,
      epsWages: calcResult.epsWages,
      edliWages: calcResult.edliWages,
      epfEe: calcResult.epfEe,
      eps: calcResult.eps,
      epfEr: calcResult.epfEr,
      edli: calcResult.edli,
      adminCharge: calcResult.adminCharge,
      edliAdminCharge: calcResult.edliAdminCharge,
      ncpDays: calcResult.ncpDays
    };

    setFormData(updated);
    setSuccess('Calculation applied to form');
    setErrors([]);
  };

  // ========== FORM HANDLERS ==========
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddRecord = (e) => {
    e.preventDefault();

    if (!formData.uan || !formData.name) {
      setErrors(['UAN and Name are required']);
      return;
    }

    const record = {
      uan: formData.uan.trim(),
      name: formData.name.trim(),
      grossWages: parseFloat(formData.grossWages) || 0,
      epfWages: parseFloat(formData.epfWages) || 0,
      epsWages: parseFloat(formData.epsWages) || 0,
      edliWages: parseFloat(formData.edliWages) || 0,
      epfEe: parseFloat(formData.epfEe) || 0,
      eps: parseFloat(formData.eps) || 0,
      epfEr: parseFloat(formData.epfEr) || 0,
      edli: parseFloat(formData.edli) || 0,
      adminCharge: parseFloat(formData.adminCharge) || 0,
      edliAdminCharge: parseFloat(formData.edliAdminCharge) || 0,
      ncpDays: parseInt(formData.ncpDays) || 0,
      refundAdvances: parseFloat(formData.refundAdvances) || 0,
      id: Date.now()
    };

    setPFData(prev => {
      const existing = prev.findIndex(r => r.uan === record.uan);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = record;
        setSuccess('Record updated successfully');
        return updated;
      }
      setSuccess('Record added successfully');
      return [...prev, record];
    });

    setFormData({
      uan: '', name: '', grossWages: '', epfWages: '', epsWages: '',
      edliWages: '', epfEe: '', eps: '', epfEr: '', edli: '', adminCharge: '', edliAdminCharge: '', ncpDays: '0', refundAdvances: '0'
    });
    setErrors([]);
  };

  // ========== DATA MANIPULATION HANDLERS ==========
  const handleDeleteRecord = (uan) => {
    if (!uan) {
      setErrors(['Cannot delete record without UAN']);
      return;
    }
    setPFData(prev => prev.filter(r => r.uan !== uan));
    setErrors([]);
    setSuccess('Record deleted successfully');
    // Clear success message after 3 seconds
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all records?')) {
      setPFData([]);
      setErrors([]);
      setSuccess('All records cleared successfully');
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  // ========== ECR IMPORT HANDLERS ==========
  const handleECRImport = (file) => {
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        const records = parseECRContent(content);
        
        if (records.length === 0) {
          setErrors(['No valid ECR records found in file']);
          return;
        }
        
        setPFData(records);
        setSuccess(`Imported ${records.length} records from ECR file`);
        setErrors([]);
      } catch (error) {
        setErrors([`Failed to import ECR file: ${error.message}`]);
      }
    };
    reader.readAsText(file);
  };

  const handleCSVImport = (file) => {
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        const records = parseCSVContent(content);
        
        if (records.length === 0) {
          setErrors(['No valid records found in CSV file']);
          return;
        }
        
        setPFData(records);
        setSuccess(`Imported ${records.length} records from CSV file`);
        setErrors([]);
      } catch (error) {
        setErrors([`Failed to import CSV file: ${error.message}`]);
      }
    };
    reader.readAsText(file);
  };

  // ========== EXPORT HANDLERS ==========
  const downloadECRFile = () => {
    if (pfData.length === 0) {
      setToast({ message: 'No data to export', type: 'error' });
      return;
    }

    if (!estCode.trim()) {
      setToast({ message: 'Please enter establishment code', type: 'error' });
      return;
    }

    setToast({ message: 'Downloading ECR file...', type: 'loading', duration: 0 });

    // Generate filename in EPFO format
    const fileName = generateECRFilename(estCode, month, year);
    
    // Generate EPFO-compliant content (NO headers, NO comments)
    const content = generateECRFileContent(pfData);
    
    // Create and download file
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setToast({ message: `ECR file downloaded: ${fileName}`, type: 'success', duration: 3000 });
  };

  const downloadCSVFile = () => {
    if (pfData.length === 0) {
      setToast({ message: 'No data to export', type: 'error' });
      return;
    }

    setToast({ message: 'Downloading CSV file...', type: 'loading', duration: 0 });

    const csvContent = generateCSVContent(pfData, company);
    const monthName = new Date(2024, month - 1).toLocaleString('default', { month: 'long' });
    const fileName = `PF_Data_${monthName}_${year}.csv`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setToast({ message: `CSV file downloaded: ${fileName}`, type: 'success', duration: 3000 });
  };

  // ========== PREVIEW HANDLERS ==========
  const previewECRContent = () => {
    if (pfData.length === 0) {
      setErrors(['No data to preview']);
      return;
    }
    
    const content = generateECRFileContent(pfData);
    
    // Create preview window
    const previewWindow = window.open();
    previewWindow.document.write(`
      <html>
        <head>
          <title>ECR Preview</title>
          <style>
            body { font-family: monospace; white-space: pre; padding: 20px; }
            .header { background: #f0f0f0; padding: 10px; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h3>EPFO ECR File Preview (${pfData.length} records)</h3>
            <p>Format: UAN#~#NAME#~#GROSS_WAGES#~#EPF_WAGES#~#EPS_WAGES#~#EDLI_WAGES#~#EPF_EE#~#EPS#~#EPF_ER#~#NCP_DAYS</p>
          </div>
          <div>${content.replace(/\n/g, '<br>')}</div>
        </body>
      </html>
    `);
  };

  // ========== UTILITIES ==========
  const filteredData = pfData.filter(r =>
    r.uan.includes(searchQuery) || r.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totals = getTotals();

  const formatINR = (num) => {
    return '₹' + (num || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  // ========== RENDER ==========
  return (
    <div className="epf-container">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      {/* Header */}
      <div style={{ marginBottom: '16px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '6px' }}>
          EPF/ECR Generator
        </h1>
        <p style={{ color: 'var(--text-light)', fontSize: '14px' }}>
          Generate EPFO-compliant ECR files (Format: UAN#~#NAME#~#GROSS_WAGES#~#EPF_WAGES#~#EPS_WAGES#~#EDLI_WAGES#~#EPF_EE#~#EPS#~#EPF_ER#~#NCP_DAYS)
        </p>
      </div>

      {/* Messages */}
      {errors.length > 0 && (
        <div className="epf-alert epf-alert-error">
          <div className="epf-alert-icon">⚠️</div>
          <div className="epf-alert-content">
            {errors.map((err, i) => (
              <p key={i}>{err}</p>
            ))}
          </div>
        </div>
      )}

      {success && (
        <div className="epf-alert epf-alert-success">
          <div className="epf-alert-icon">✓</div>
          <div className="epf-alert-content">{success}</div>
        </div>
      )}

      {/* Instruction Message */}
      <div style={{
        background: 'var(--info-bg)',
        border: '1px solid var(--info-border)',
        borderRadius: 'var(--radius)',
        padding: '12px 16px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        fontSize: '14px',
        color: 'var(--text)'
      }}>
        <span style={{ fontSize: '18px' }}>ℹ️</span>
        <div>
          <strong>EPFO ECR Format:</strong> Generates 10-field format: <code>UAN#~#NAME#~#GROSS_WAGES#~#EPF_WAGES#~#EPS_WAGES#~#EDLI_WAGES#~#EPF_EE#~#EPS#~#EPF_ER#~#NCP_DAYS</code>
        </div>
      </div>

      {/* Tabs */}
      <div className="epf-tabs">
        <button
          className={`epf-tab-btn ${activeTab === 'instructions' ? 'active' : ''}`}
          onClick={() => setActiveTab('instructions')}
        >
          <FileText size={16} style={{ marginRight: '4px' }} />
          Instructions
        </button>
        <button
          className={`epf-tab-btn ${activeTab === 'calculator' ? 'active' : ''}`}
          onClick={() => setActiveTab('calculator')}
        >
          <Calculator size={16} style={{ marginRight: '4px' }} />
          PF Calculator
        </button>
        <button
          className={`epf-tab-btn ${activeTab === 'form' ? 'active' : ''}`}
          onClick={() => setActiveTab('form')}
        >
          <Plus size={16} style={{ marginRight: '4px' }} />
          Add Record
        </button>
        <button
          className={`epf-tab-btn ${activeTab === 'preview' ? 'active' : ''}`}
          onClick={() => setActiveTab('preview')}
        >
          <Eye size={16} style={{ marginRight: '4px' }} />
          Preview ({pfData.length})
        </button>
        <button
          className={`epf-tab-btn ${activeTab === 'export' ? 'active' : ''}`}
          onClick={() => setActiveTab('export')}
        >
          <Download size={16} style={{ marginRight: '4px' }} />
          Export
        </button>
      </div>

      {/* TAB: INSTRUCTIONS */}
      {activeTab === 'instructions' && (
        <div className="epf-section">
          <div className="epf-section-title">
            <FileText size={20} /> Getting Started - How to Use This Tool
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {/* Left Column - Steps 1-3 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Step 1 */}
              <div className="instruction-card">
                <h3>📊 Step 1: Import Employee Data</h3>
                <p>You can import employee data in two ways:</p>
                <ul>
                  <li><strong>CSV import :</strong> upload CSV formatted data in CSV UPLOAD PAGE by downloding template</li>
                  <li><strong>Manual Entry:</strong> Click "Add Record" tab to add employees one by one</li>
                </ul>
              </div>

              {/* Step 2 */}
              <div className="instruction-card">
                <h3>📁 Step 2: Review & Preview Data</h3>
                <p>In the <strong>Preview</strong> tab, you can:</p>
                <ul>
                  <li>View all imported/added employee records in a table</li>
                  <li>See calculated PF contributions for each employee</li>
                  <li>Preview the ECR file content before export</li>
                  <li>Search for specific employees by UAN or name</li>
                  <li>View totals for all contributions</li>
                </ul>
              </div>

              {/* Step 3 */}
              <div className="instruction-card">
                <h3>📤 Step 3: Export EPFO ECR File</h3>
                <p>In the <strong>Export</strong> tab, download:</p>
                <ul>
                  <li><strong>ECR File (TXT):</strong> EPFO-compliant format for ECR submission</li>
                  <li><strong>CSV File:</strong> For your records and further processing</li>
                  <li>Files are named: <code>[ESTCODE]_ECR_[Month][Year].txt</code></li>
                  <li>Example: <code>APKP2204098000_ECR_Dec25.txt</code></li>
                </ul>
              </div>
            </div>

            {/* Right Column - Remaining Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* File Format */}
              <div className="instruction-card">
                <h3>📋 File Format Requirements</h3>
                <div style={{ background: 'rgba(37, 99, 235, 0.05)', padding: '12px', borderRadius: '6px', fontSize: '13px', fontFamily: 'monospace' }}>
                  <p><strong>ECR Format (10 fields):</strong></p>
                  <code style={{ fontSize: '11px', wordBreak: 'break-all' }}>
                    UAN#~#NAME#~#GROSS#~#PF_WAGES#~#EPS_WAGES#~#EDLI_WAGES#~#EPF_EE#~#EPS#~#EPF_ER#~#NCP
                  </code>
                </div>
              </div>

              {/* Contribution */}
              <div className="instruction-card">
                <h3>⚙️ Contribution Breakdown</h3>
                <div style={{ background: 'rgba(37, 99, 235, 0.05)', padding: '12px', borderRadius: '6px', fontSize: '13px' }}>
                  <p><strong>Employee (EE):</strong> 12% of PF Wages</p>
                  <p><strong>Employer (ER):</strong> 3.67% (EPF) + 0.17% (Admin) = 3.84%</p>
                  <p><strong>EPS:</strong> Part of employer contribution</p>
                  <p><strong>EDLI:</strong> 0.5% + 0.01% admin charge</p>
                </div>
              </div>

              {/* Important Notes */}
              <div className="instruction-card" style={{ background: 'rgba(255, 193, 7, 0.1)', borderLeft: '4px solid #ffc107' }}>
                <h3>⚠️ Important Notes</h3>
                <ul>
                  <li>PF is calculated on Basic + DA only (not gross salary)</li>
                  <li>Configure Establishment Code in Company Settings first</li>
                  <li>NCP Days (No Contribution Period) reduce PF wages</li>
                  <li>Always verify data before submitting to EPFO</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: CALCULATOR */}
      {activeTab === 'calculator' && (
        <div className="epf-section">
          <div className="epf-section-title">
            <Calculator size={20} /> PF Contribution Calculator
          </div>
          
          <div style={{ background: 'var(--info-bg)', border: '1px solid var(--info-border)', borderRadius: 'var(--radius)', padding: '12px', marginBottom: '20px', fontSize: '13px' }}>
            <strong>Note:</strong> PF contributions are calculated on Basic Salary + Dearness Allowance (DA) only, not on Gross Salary (per EPFO guidelines).
          </div>

          <div className="epf-calculator">
            <div className="epf-calculator-inputs">
              <div className="epf-form-group">
                <label>Basic Salary (₹)</label>
                <input
                  type="number"
                  value={calcBasic}
                  onChange={(e) => setCalcBasic(e.target.value)}
                  placeholder="Enter basic salary"
                  min="0"
                />
              </div>

              <div className="epf-form-group">
                <label>Dearness Allowance / DA (₹)</label>
                <input
                  type="number"
                  value={calcDA}
                  onChange={(e) => setCalcDA(e.target.value)}
                  placeholder="Enter DA"
                  min="0"
                />
              </div>

              <div className="epf-form-group">
                <label>NCP Days (0-26)</label>
                <input
                  type="number"
                  value={calcNcp}
                  onChange={(e) => setCalcNcp(e.target.value)}
                  placeholder="0"
                  min="0"
                  max="26"
                />
              </div>

              <button className="epf-btn epf-btn-primary" onClick={handleCalculate}>
                <Calculator size={16} /> Calculate
              </button>

              {calcResult && (
                <button className="epf-btn epf-btn-success" onClick={handleApplyCalculation}>
                  Apply to Form
                </button>
              )}
            </div>

            {calcResult && (
              <div className="epf-calculator-outputs">
                <div className="epf-calc-output-row">
                  <span className="epf-calc-output-label">Gross Wages</span>
                  <span className="epf-calc-output-value">{formatINR(calcResult.grossWages)}</span>
                </div>
                <div className="epf-calc-output-row">
                  <span className="epf-calc-output-label">PF Wages (Capped)</span>
                  <span className="epf-calc-output-value">{formatINR(calcResult.epfWages)}</span>
                </div>
                <div style={{ padding: '12px 0', borderTop: '2px solid var(--border)', marginTop: '12px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '8px', textTransform: 'uppercase', color: 'var(--text-light)' }}>
                    Employee Deductions
                  </div>
                  <div className="epf-calc-output-row">
                    <span className="epf-calc-output-label">EPF Employee (12%)</span>
                    <span className="epf-calc-output-value">{formatINR(calcResult.epfEe)}</span>
                  </div>
                </div>
                <div style={{ padding: '12px 0', borderTop: '2px solid var(--border)' }}>
                  <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '8px', textTransform: 'uppercase', color: 'var(--text-light)' }}>
                    Employer Contributions
                  </div>
                  <div className="epf-calc-output-row">
                    <span className="epf-calc-output-label">EPS (8.33%)</span>
                    <span className="epf-calc-output-value">{formatINR(calcResult.eps)}</span>
                  </div>
                  <div className="epf-calc-output-row">
                    <span className="epf-calc-output-label">EPF ER (3.67%)</span>
                    <span className="epf-calc-output-value">{formatINR(calcResult.epfEr)}</span>
                  </div>
                  <div className="epf-calc-output-row">
                    <span className="epf-calc-output-label">EDLI (0.5%)</span>
                    <span className="epf-calc-output-value">{formatINR(calcResult.edli)}</span>
                  </div>
                  <div className="epf-calc-output-row">
                    <span className="epf-calc-output-label">Admin Charge (0.17%)</span>
                    <span className="epf-calc-output-value">{formatINR(calcResult.adminCharge)}</span>
                  </div>
                  <div className="epf-calc-output-row">
                    <span className="epf-calc-output-label">EDLI Admin (0.01%)</span>
                    <span className="epf-calc-output-value">{formatINR(calcResult.edliAdminCharge)}</span>
                  </div>
                  <div className="epf-calc-output-row" style={{ paddingTop: '8px', marginTop: '8px', borderTop: '1px solid var(--border)', fontWeight: '600' }}>
                    <span className="epf-calc-output-label">Total Employer</span>
                    <span className="epf-calc-output-value">{formatINR(calcResult.totalEmployerContribution)}</span>
                  </div>
                  <div className="epf-calc-output-row" style={{ paddingTop: '8px', marginTop: '8px', borderTop: '2px solid var(--border)', fontWeight: '700' }}>
                    <span className="epf-calc-output-label">Total Contribution</span>
                    <span className="epf-calc-output-value">{formatINR(calcResult.totalContribution)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: FORM */}
      {activeTab === 'form' && (
        <div className="epf-section">
          <div className="epf-section-title">
            <Plus size={20} /> Add/Edit PF Record
          </div>

          <form onSubmit={handleAddRecord}>
            <div className="epf-form-grid">
              <div className="epf-form-group">
                <label>UAN *</label>
                <input
                  type="text"
                  name="uan"
                  value={formData.uan}
                  onChange={handleFormChange}
                  placeholder="12-digit UAN"
                  maxLength="12"
                />
              </div>

              <div className="epf-form-group">
                <label>Employee Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleFormChange}
                  placeholder="Full name"
                />
              </div>

              <div className="epf-form-group">
                <label>Gross Wages (₹)</label>
                <input
                  type="number"
                  name="grossWages"
                  value={formData.grossWages}
                  onChange={handleFormChange}
                  placeholder="0"
                  min="0"
                />
              </div>

              <div className="epf-form-group">
                <label>EPF Wages (₹)</label>
                <input
                  type="number"
                  name="epfWages"
                  value={formData.epfWages}
                  onChange={handleFormChange}
                  placeholder="0"
                  min="0"
                />
              </div>

              <div className="epf-form-group">
                <label>EPS Wages (₹)</label>
                <input
                  type="number"
                  name="epsWages"
                  value={formData.epsWages}
                  onChange={handleFormChange}
                  placeholder="0"
                  min="0"
                />
              </div>

              <div className="epf-form-group">
                <label>EDLI Wages (₹)</label>
                <input
                  type="number"
                  name="edliWages"
                  value={formData.edliWages}
                  onChange={handleFormChange}
                  placeholder="0"
                  min="0"
                />
              </div>

              <div className="epf-form-group">
                <label>EPF Employee (₹)</label>
                <input
                  type="number"
                  name="epfEe"
                  value={formData.epfEe}
                  onChange={handleFormChange}
                  placeholder="0"
                  min="0"
                />
              </div>

              <div className="epf-form-group">
                <label>EPS (₹)</label>
                <input
                  type="number"
                  name="eps"
                  value={formData.eps}
                  onChange={handleFormChange}
                  placeholder="0"
                  min="0"
                />
              </div>

              <div className="epf-form-group">
                <label>EPF ER (₹)</label>
                <input
                  type="number"
                  name="epfEr"
                  value={formData.epfEr}
                  onChange={handleFormChange}
                  placeholder="0"
                  min="0"
                />
              </div>

              <div className="epf-form-group">
                <label>EDLI (₹)</label>
                <input
                  type="number"
                  name="edli"
                  value={formData.edli}
                  onChange={handleFormChange}
                  placeholder="0"
                  min="0"
                />
              </div>

              <div className="epf-form-group">
                <label>Admin Charge (₹)</label>
                <input
                  type="number"
                  name="adminCharge"
                  value={formData.adminCharge}
                  onChange={handleFormChange}
                  placeholder="0"
                  min="0"
                />
              </div>

              <div className="epf-form-group">
                <label>EDLI Admin (₹)</label>
                <input
                  type="number"
                  name="edliAdminCharge"
                  value={formData.edliAdminCharge}
                  onChange={handleFormChange}
                  placeholder="0"
                  min="0"
                />
              </div>

              <div className="epf-form-group">
                <label>NCP Days (0-26)</label>
                <input
                  type="number"
                  name="ncpDays"
                  value={formData.ncpDays}
                  onChange={handleFormChange}
                  placeholder="0"
                  min="0"
                  max="26"
                />
              </div>

              <div className="epf-form-group">
                <label>Refund Advances (₹)</label>
                <input
                  type="number"
                  name="refundAdvances"
                  value={formData.refundAdvances}
                  onChange={handleFormChange}
                  placeholder="0"
                  min="0"
                />
              </div>
            </div>

            <div className="epf-btn-group">
              <button type="submit" className="epf-btn epf-btn-primary">
                <Plus size={16} /> {pfData.some(r => r.uan === formData.uan) ? 'Update Record' : 'Add Record'}
              </button>
              <button
                type="button"
                className="epf-btn epf-btn-secondary"
                onClick={() => setFormData({
                  uan: '', name: '', grossWages: '', epfWages: '', epsWages: '',
                  edliWages: '', epfEe: '', eps: '', epfEr: '', edli: '', adminCharge: '', edliAdminCharge: '', ncpDays: '0', refundAdvances: '0'
                })}
              >
                Clear Form
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB: PREVIEW */}
      {activeTab === 'preview' && (
        <div className="epf-section">
          <div className="epf-section-title">
            <Eye size={20} /> Preview & Manage Data
          </div>

          {/* Import Section */}
          <div style={{ marginBottom: '20px', padding: '15px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <h4 style={{ marginBottom: '10px' }}>Import Existing ECR/CSV</h4>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <div>
                <input
                  type="file"
                  id="ecr-import"
                  accept=".txt"
                  onChange={(e) => handleECRImport(e.target.files[0])}
                  style={{ display: 'none' }}
                />
                <label htmlFor="ecr-import" className="epf-btn epf-btn-secondary">
                  <Upload size={16} /> Import ECR (.txt)
                </label>
              </div>
              <div>
                <input
                  type="file"
                  id="csv-import"
                  accept=".csv"
                  onChange={(e) => handleCSVImport(e.target.files[0])}
                  style={{ display: 'none' }}
                />
                <label htmlFor="csv-import" className="epf-btn epf-btn-secondary">
                  <Upload size={16} /> Import CSV (.csv)
                </label>
              </div>
            </div>
            <p style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }}>
              Supports EPFO ECR format (10 fields) and detailed CSV format
            </p>
          </div>

          {/* Stats */}
          {pfData.length > 0 && (
            <div className="epf-stats-grid">
              <div className="epf-stat-card">
                <div className="epf-stat-label">Total Employees</div>
                <div className="epf-stat-value">{totals.employeeCount}</div>
              </div>
              <div className="epf-stat-card secondary">
                <div className="epf-stat-label">Total Gross Wages</div>
                <div className="epf-stat-value">{formatINR(totals.totalGrossWages)}</div>
              </div>
              <div className="epf-stat-card success">
                <div className="epf-stat-label">Employee Contribution</div>
                <div className="epf-stat-value">{formatINR(totals.totalEPFEE)}</div>
              </div>
              <div className="epf-stat-card warning">
                <div className="epf-stat-label">Employer Contribution</div>
                <div className="epf-stat-value">{formatINR(totals.totalEmployerContribution || (totals.totalEPS + totals.totalEPFER + totals.totalEDLI + (totals.totalAdminCharge || 0) + (totals.totalEDLIAdmin || 0)))}</div>
              </div>
            </div>
          )}

          {/* Search */}
          {pfData.length > 0 && (
            <div className="epf-search">
              <input
                type="text"
                placeholder="Search by UAN or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button 
                className="epf-btn epf-btn-secondary" 
                onClick={previewECRContent}
                style={{ marginLeft: '10px' }}
              >
                <Eye size={16} /> Preview ECR Content
              </button>
            </div>
          )}

          {/* Table */}
          {filteredData.length > 0 ? (
            <div className="epf-table-container">
              <table className="epf-table">
                <thead>
                  <tr>
                    <th>UAN</th>
                    <th>Name</th>
                    <th>Gross</th>
                    <th>EPF Wages</th>
                    <th>EPF EE</th>
                    <th>EPS</th>
                    <th>EPF ER</th>
                    <th>EDLI</th>
                    <th>NCP Days</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map(record => (
                    <tr key={record.id || record.uan}>
                      <td>{record.uan}</td>
                      <td>{record.name}</td>
                      <td>{formatINR(record.grossWages)}</td>
                      <td>{formatINR(record.epfWages)}</td>
                      <td>{formatINR(record.epfEe)}</td>
                      <td>{formatINR(record.eps)}</td>
                      <td>{formatINR(record.epfEr)}</td>
                      <td>{formatINR(record.edli)}</td>
                      <td>{record.ncpDays}</td>
                      <td>
                        <button
                          type="button"
                          className="epf-btn epf-btn-danger"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDeleteRecord(record.uan);
                          }}
                          style={{ padding: '6px 12px', fontSize: '12px' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="epf-empty-state">
              <div className="epf-empty-state-icon">📊</div>
              <div className="epf-empty-state-title">No PF Records</div>
              <div className="epf-empty-state-text">
                Upload a file or add records manually to get started
              </div>
            </div>
          )}

          {pfData.length > 0 && (
            <div className="epf-btn-group" style={{ marginTop: '20px' }}>
              <button 
                type="button"
                className="epf-btn epf-btn-danger" 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleClearAll();
                }}
              >
                <Trash2 size={16} /> Clear All Data
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB: EXPORT */}
      {activeTab === 'export' && (
        <div className="epf-section">
          <div className="epf-section-title">
            <Download size={20} /> Export PF Data
          </div>

          <div className="epf-form-grid">
            <div className="epf-form-group">
              <label>Establishment Code *</label>
              <input
                type="text"
                value={estCode}
                onChange={(e) => setEstCode(e.target.value.toUpperCase())}
                placeholder="e.g., APKP2204098000"
                maxLength="14"
              />
              <small style={{ fontSize: '12px', color: '#64748b' }}>
                Required for ECR file naming. Format: [ESTCODE]_ECR_[Month][Year].txt
              </small>
            </div>

            <div className="epf-form-group">
              <label>Month</label>
              <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                  <option key={m} value={m}>
                    {new Date(2024, m - 1).toLocaleString('default', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>

            <div className="epf-form-group">
              <label>Year</label>
              <select value={year} onChange={(e) => setYear(parseInt(e.target.value))}>
                {[2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginTop: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>Export Formats</h3>

            <div className="epf-btn-group">
              <button className="epf-btn epf-btn-primary" onClick={downloadECRFile} disabled={pfData.length === 0}>
                <FileText size={16} /> ECR Text (.txt) - EPFO Format
              </button>
              <button className="epf-btn epf-btn-primary" onClick={downloadCSVFile} disabled={pfData.length === 0}>
                <Table size={16} /> CSV Format
              </button>
              <button className="epf-btn epf-btn-secondary" onClick={previewECRContent} disabled={pfData.length === 0}>
                <Eye size={16} /> Preview ECR
              </button>
            </div>
          </div>

          {pfData.length === 0 && (
            <div className="epf-alert epf-alert-info">
              <div className="epf-alert-icon">ℹ️</div>
              <div className="epf-alert-content">
                No data to export. Please upload or add PF records first.
              </div>
            </div>
          )}

          {pfData.length > 0 && (
            <div className="epf-alert epf-alert-success">
              <div className="epf-alert-icon">✓</div>
              <div className="epf-alert-content">
                <strong>{pfData.length} records</strong> ready to export for <strong>{new Date(2024, month - 1).toLocaleString('default', { month: 'long' })} {year}</strong>
                <div style={{ fontSize: '12px', marginTop: '8px', color: '#065f46' }}>
                  ECR format: <code>UAN#~#NAME#~#GROSS_WAGES#~#EPF_WAGES#~#EPS_WAGES#~#EDLI_WAGES#~#EPF_EE#~#EPS#~#EPF_ER#~#NCP_DAYS</code>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
