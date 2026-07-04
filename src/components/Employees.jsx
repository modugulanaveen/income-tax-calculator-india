import React, { useState } from "react";
import { Edit, Trash2, Search, Banknote, Save, X } from "lucide-react";
import { computeSalary } from "../utils/salary";

export default function Employees({ employees = [], setEmployees }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [selectedIds, setSelectedIds] = useState([]);

  const handleDelete = (id) => {
    if (window.confirm("Delete this employee?")) {
      setEmployees(employees.filter(emp => emp.id !== id));
    }
  };

  const handleDeleteAll = () => {
    if (employees.length === 0) {
      alert("No employees to delete");
      return;
    }
    if (window.confirm(`Delete all ${employees.length} employees? This cannot be undone.`)) {
      setEmployees([]);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) {
      alert('No employees selected');
      return;
    }
    if (window.confirm(`Delete ${selectedIds.length} selected employee(s)? This cannot be undone.`)) {
      setEmployees(employees.filter(emp => !selectedIds.includes(emp.id)));
      setSelectedIds([]);
    }
  };

  // Edit helpers
  const bankNames = [
    "State Bank of India", "HDFC Bank", "ICICI Bank", "Axis Bank",
    "Kotak Mahindra Bank", "Punjab National Bank", "Bank of Baroda",
    "Canara Bank", "Union Bank of India", "Indian Bank"
  ];

  const startEdit = (employee) => {
    setEditingEmployee(employee.id);
    // Convert earnings/deductions to editable format
    const editableEmployee = {
      ...employee,
      earnings: employee.earnings?.map(e => ({ ...e, amount: String(e.amount) })) || [],
      deductions: employee.deductions?.map(d => ({ ...d, amount: String(d.amount) })) || []
    };
    setEditForm(editableEmployee);
  };

  const cancelEdit = () => {
    setEditingEmployee(null);
    setEditForm({});
  };

  const saveEdit = () => {
    // Convert string amounts back to numbers
    const updatedEmployee = {
      ...editForm,
      earnings: editForm.earnings?.map(e => ({ 
        ...e, 
        amount: parseFloat(e.amount) || 0 
      })) || [],
      deductions: editForm.deductions?.map(d => ({ 
        ...d, 
        amount: parseFloat(d.amount) || 0 
      })) || []
    };

    // Recompute totals
    const gross = updatedEmployee.earnings.reduce((sum, e) => sum + (e.amount || 0), 0);
    const totalDeductions = updatedEmployee.deductions.reduce((sum, d) => sum + (d.amount || 0), 0);
    const net = gross - totalDeductions;

    const finalEmployee = {
      ...updatedEmployee,
      gross,
      totalDeductions,
      net
    };

    setEmployees(employees.map(emp => 
      emp.id === editingEmployee ? finalEmployee : emp
    ));
    setEditingEmployee(null);
    setEditForm({});
    alert('Employee updated successfully.');
  };

  const handleEditChange = (field, value) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const handleEarningChange = (index, field, value) => {
    const updatedEarnings = [...(editForm.earnings || [])];
    updatedEarnings[index] = { ...updatedEarnings[index], [field]: value };
    setEditForm(prev => ({ ...prev, earnings: updatedEarnings }));
  };

  const handleDeductionChange = (index, field, value) => {
    const updatedDeductions = [...(editForm.deductions || [])];
    updatedDeductions[index] = { ...updatedDeductions[index], [field]: value };
    setEditForm(prev => ({ ...prev, deductions: updatedDeductions }));
  };

  const addEarning = () => {
    setEditForm(prev => ({
      ...prev,
      earnings: [...(prev.earnings || []), { label: "", amount: "0" }]
    }));
  };

  const addDeduction = () => {
    setEditForm(prev => ({
      ...prev,
      deductions: [...(prev.deductions || []), { label: "", amount: "0" }]
    }));
  };

  const removeEarning = (index) => {
    const updatedEarnings = [...(editForm.earnings || [])];
    updatedEarnings.splice(index, 1);
    setEditForm(prev => ({ ...prev, earnings: updatedEarnings }));
  };

  const removeDeduction = (index) => {
    const updatedDeductions = [...(editForm.deductions || [])];
    updatedDeductions.splice(index, 1);
    setEditForm(prev => ({ ...prev, deductions: updatedDeductions }));
  };

  // Calculate preview totals for edit form
  const editPreview = {
    gross: (editForm.earnings || []).reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0),
    deductions: (editForm.deductions || []).reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0)
  };
  editPreview.net = editPreview.gross - editPreview.deductions;

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.employeeId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.bankAccount?.includes(searchTerm)
  );

  // Render edit form
  const renderEditForm = () => (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: '800px' }}>
        <div className="modal-header">
          <h3>Edit Employee: {editForm.name}</h3>
          <button className="close-btn" onClick={cancelEdit}>×</button>
        </div>
        <div className="modal-body">
          <div className="form-section">
            <h3>Basic Information</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  value={editForm.name || ''}
                  onChange={(e) => handleEditChange('name', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Employee ID</label>
                <input
                  type="text"
                  value={editForm.employeeId || ''}
                  onChange={(e) => handleEditChange('employeeId', e.target.value)}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Department</label>
                <input
                  type="text"
                  value={editForm.department || ''}
                  onChange={(e) => handleEditChange('department', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Designation</label>
                <input
                  type="text"
                  value={editForm.designation || ''}
                  onChange={(e) => handleEditChange('designation', e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Salary Details</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Basic Salary</label>
                <input
                  type="number"
                  value={editForm.earnings?.[0]?.amount || '0'}
                  onChange={(e) => handleEarningChange(0, 'amount', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Pay Period</label>
                <input
                  type="month"
                  value={editForm.payPeriod || ''}
                  onChange={(e) => handleEditChange('payPeriod', e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Earnings</h3>
            {(editForm.earnings || []).map((earning, index) => (
              <div key={index} className="form-row" style={{ alignItems: 'center' }}>
                <div className="form-group">
                  <input
                    type="text"
                    placeholder="Earning label"
                    value={earning.label}
                    onChange={(e) => handleEarningChange(index, 'label', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <input
                    type="number"
                    placeholder="Amount"
                    value={earning.amount}
                    onChange={(e) => handleEarningChange(index, 'amount', e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  className="icon-btn danger"
                  onClick={() => removeEarning(index)}
                  disabled={(editForm.earnings || []).length <= 2}
                >
                  ×
                </button>
              </div>
            ))}
            <button type="button" className="btn btn-secondary" onClick={addEarning}>
              + Add Earning
            </button>
          </div>

          <div className="form-section">
            <h3>Deductions</h3>
            {(editForm.deductions || []).map((deduction, index) => (
              <div key={index} className="form-row" style={{ alignItems: 'center' }}>
                <div className="form-group">
                  <input
                    type="text"
                    placeholder="Deduction label"
                    value={deduction.label}
                    onChange={(e) => handleDeductionChange(index, 'label', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <input
                    type="number"
                    placeholder="Amount"
                    value={deduction.amount}
                    onChange={(e) => handleDeductionChange(index, 'amount', e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  className="icon-btn danger"
                  onClick={() => removeDeduction(index)}
                  disabled={(editForm.deductions || []).length <= 2}
                >
                  ×
                </button>
              </div>
            ))}
            <button type="button" className="btn btn-secondary" onClick={addDeduction}>
              + Add Deduction
            </button>
          </div>

          <div className="form-section">
            <h3>Bank Details</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Bank Name</label>
                <select
                  value={editForm.bankName || ''}
                  onChange={(e) => handleEditChange('bankName', e.target.value)}
                >
                  <option value="">Select Bank</option>
                  {bankNames.map(bank => (
                    <option key={bank} value={bank}>{bank}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Account Number</label>
                <input
                  type="text"
                  value={editForm.bankAccount || ''}
                  onChange={(e) => handleEditChange('bankAccount', e.target.value)}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>IFSC Code</label>
                <input
                  type="text"
                  value={editForm.bankIfsc || ''}
                  onChange={(e) => handleEditChange('bankIfsc', e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="summary-card">
            <h4>Salary Summary</h4>
            <div className="summary-row">
              <span>Gross Earnings:</span>
              <strong>₹{editPreview.gross.toLocaleString()}</strong>
            </div>
            <div className="summary-row">
              <span>Total Deductions:</span>
              <strong>₹{editPreview.deductions.toLocaleString()}</strong>
            </div>
            <div className="summary-row total">
              <span>Net Salary:</span>
              <strong>₹{editPreview.net.toLocaleString()}</strong>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={cancelEdit}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={saveEdit}>
            <Save size={16} />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="employees-page">
      <div className="page-header">
        <div>
          <h1>Employee Management</h1>
          <p>Total Employees: {employees.length}</p>
        </div>
        <div className="header-actions">
          <button 
            className="btn btn-danger" 
            onClick={handleDeleteSelected}
            disabled={selectedIds.length === 0}
          >
            <Trash2 size={16} />
            Delete Selected ({selectedIds.length})
          </button>
          <button 
            className="btn btn-danger" 
            onClick={handleDeleteAll}
            disabled={employees.length === 0}
            style={{ marginLeft: 8 }}
          >
            <Trash2 size={16} />
            Delete All
          </button>
          <button 
            className="btn btn-primary" 
            onClick={() => window.location.hash = "#addEmployee"}
            style={{ marginLeft: 12 }}
          >
            + Add Employee
          </button>
        </div>
      </div>

      <div className="controls-bar">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search by name, ID, department, or account..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '50px' }}>
                <input
                  type="checkbox"
                  checked={selectedIds.length === employees.length && employees.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedIds(employees.map(emp => emp.id));
                    } else {
                      setSelectedIds([]);
                    }
                  }}
                />
              </th>
              <th>Name</th>
              <th>Employee ID</th>
              <th>Gross Earnings</th>
              <th>Total Deductions</th>
              <th>Net Salary</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>
                  No employees found. <a href="#addEmployee">Add your first employee</a>
                </td>
              </tr>
            ) : (
              filteredEmployees.map((employee) => {
                
                return (
                  <tr key={employee.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(employee.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds([...selectedIds, employee.id]);
                          } else {
                            setSelectedIds(selectedIds.filter(id => id !== employee.id));
                          }
                        }}
                      />
                    </td>
                    <td>
                      <div className="employee-cell">
                        <div className="avatar">{employee.name?.charAt(0) || 'E'}</div>
                        <div>
                          <strong>{employee.name || 'Unnamed'}</strong>
                          <small>{employee.designation || "Employee"}</small>
                        </div>
                      </div>
                    </td>
                    <td>{employee.employeeId || "N/A"}</td>
                    <td>
                      <strong>₹{(employee.gross || 0).toLocaleString()}</strong>
                    </td>
                    <td>
                      <strong>₹{(() => {
                        let deductionAmount = 0;
                        if (employee.deductions) {
                          if (Array.isArray(employee.deductions)) {
                            deductionAmount = employee.deductions.reduce((s, d) => s + (parseFloat(d.amount) || 0), 0);
                          } else if (typeof employee.deductions === 'number') {
                            deductionAmount = employee.deductions;
                          }
                        }
                        return deductionAmount.toLocaleString();
                      })()}</strong>
                    </td>
                    <td>
                      <strong>₹{(employee.net || 0).toLocaleString()}</strong>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button 
                          className="icon-btn" 
                          onClick={() => startEdit(employee)}
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          className="icon-btn danger" 
                          onClick={() => handleDelete(employee.id)}
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editingEmployee && renderEditForm()}
    </div>
  );
}