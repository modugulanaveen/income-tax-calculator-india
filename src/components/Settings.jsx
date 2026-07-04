
import React, { useState, useEffect } from "react";
import { Save, Upload, Building, MapPin, Globe, Phone, Mail, AlertCircle } from "lucide-react";

export default function Settings({ company, setCompany }) {
  const [formData, setFormData] = useState({
    companyName: company.companyName || "",
    address: company.address || "",
    cityPincode: company.cityPincode || "",
    country: company.country || "India",
    email: company.email || "",
    phone: company.phone || "",
    website: company.website || "",
    panNumber: company.panNumber || "",
    tanNumber: company.tanNumber || "",
    logoDataUrl: company.logoDataUrl || ""
  });

  const [logoPreview, setLogoPreview] = useState(company.logoDataUrl || null);
  const [saved, setSaved] = useState(false);

  // Sync form data when company prop changes
  useEffect(() => {
    setFormData({
      companyName: company.companyName || "",
      address: company.address || "",
      cityPincode: company.cityPincode || "",
      country: company.country || "India",
      email: company.email || "",
      phone: company.phone || "",
      website: company.website || "",
      panNumber: company.panNumber || "",
      tanNumber: company.tanNumber || "",
      logoDataUrl: company.logoDataUrl || ""
    });
    setLogoPreview(company.logoDataUrl || null);
  }, [company]);

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert("Logo size should be less than 2MB");
      return;
    }

    // Check file type
    if (!file.type.match("image.*")) {
      alert("Please upload an image file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      setLogoPreview(ev.target.result);
      setFormData(prev => ({ ...prev, logoDataUrl: ev.target.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Update company settings
    setCompany({
      companyName: formData.companyName,
      address: formData.address,
      cityPincode: formData.cityPincode,
      country: formData.country,
      email: formData.email,
      phone: formData.phone,
      website: formData.website,
      panNumber: formData.panNumber,
      tanNumber: formData.tanNumber,
      logoDataUrl: formData.logoDataUrl
    });

    // Save to localStorage
    const payrollData = JSON.parse(localStorage.getItem("payrollData") || "{}");
    payrollData.company = {
      companyName: formData.companyName,
      address: formData.address,
      cityPincode: formData.cityPincode,
      country: formData.country,
      email: formData.email,
      phone: formData.phone,
      website: formData.website,
      panNumber: formData.panNumber,
      tanNumber: formData.tanNumber,
      logoDataUrl: formData.logoDataUrl
    };
    localStorage.setItem("payrollData", JSON.stringify(payrollData));

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleReset = () => {
    setFormData({
      companyName: "",
      address: "",
      cityPincode: "",
      country: "India",
      email: "",
      phone: "",
      website: "",
      panNumber: "",
      tanNumber: "",
      logoDataUrl: ""
    });
    setLogoPreview(null);
  };

  return (
    <div className="settings-page">
      <div className="page-header">
        <div>
          <h1>Company Settings</h1>
          <p>Configure your company details for payroll system</p>
        </div>
      </div>

      {saved && (
        <div className="success-message">
          <AlertCircle size={16} />
          <span>Settings saved successfully!</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="settings-form">
        <div className="settings-grid">
          {/* Left Column - Logo & Basic Info */}
          <div className="settings-column">
            <div className="settings-card">
              <div className="card-header">
                <Building size={20} />
                <h3>Company Logo & Basic Information</h3>
              </div>

              <div className="logo-upload-section">
                <div className="logo-preview-container">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Company Logo" className="logo-preview-large" />
                  ) : (
                    <div className="logo-placeholder">
                      <Building size={48} />
                      <span>Upload Company Logo</span>
                    </div>
                  )}
                </div>

                <div className="upload-controls">
                  <input
                    type="file"
                    id="logo-upload"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="logo-upload" className="btn btn-secondary">
                    <Upload size={16} />
                    {logoPreview ? "Change Logo" : "Upload Logo"}
                  </label>
                  {logoPreview && (
                    <button
                      type="button"
                      className="btn btn-text"
                      onClick={() => {
                        setLogoPreview(null);
                        setFormData(prev => ({ ...prev, logoDataUrl: "" }));
                      }}
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="logo-guidelines">
                  <small>Recommended: 240×240 pixels @ 72 DPI, Max 2MB</small>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="companyName">
                  <Building size={16} />
                  Company Name *
                </label>
                <input
                  type="text"
                  id="companyName"
                  value={formData.companyName}
                  onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                  placeholder="Enter company name"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="address">
                  <MapPin size={16} />
                  Address
                </label>
                <textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  placeholder="Full company address"
                  rows="3"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="cityPincode">City & Pincode</label>
                  <input
                    type="text"
                    id="cityPincode"
                    value={formData.cityPincode}
                    onChange={(e) => setFormData({...formData, cityPincode: e.target.value})}
                    placeholder="e.g., Mumbai, 400001"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="country">Country</label>
                  <select
                    id="country"
                    value={formData.country}
                    onChange={(e) => setFormData({...formData, country: e.target.value})}
                  >
                    <option value="India">India</option>
                    <option value="USA">United States</option>
                    <option value="UK">United Kingdom</option>
                    <option value="Canada">Canada</option>
                    <option value="Australia">Australia</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Contact & Tax Details */}
          <div className="settings-column">
            <div className="settings-card">
              <div className="card-header">
                <Phone size={20} />
                <h3>Contact Information</h3>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="email">
                    <Mail size={16} />
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="company@example.com"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="phone">
                    <Phone size={16} />
                    Phone
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="+91 9876543210"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="website">
                  <Globe size={16} />
                  Website
                </label>
                <input
                  type="url"
                  id="website"
                  value={formData.website}
                  onChange={(e) => setFormData({...formData, website: e.target.value})}
                  placeholder="https://www.company.com"
                />
              </div>
            </div>

            <div className="settings-card">
              <div className="card-header">
                <Building size={20} />
                <h3>Tax & Compliance Details</h3>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="panNumber">PAN Number</label>
                  <input
                    type="text"
                    id="panNumber"
                    value={formData.panNumber}
                    onChange={(e) => setFormData({...formData, panNumber: e.target.value.toUpperCase()})}
                    placeholder="ABCDE1234F"
                    maxLength="10"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="tanNumber">TAN Number</label>
                  <input
                    type="text"
                    id="tanNumber"
                    value={formData.tanNumber}
                    onChange={(e) => setFormData({...formData, tanNumber: e.target.value.toUpperCase()})}
                    placeholder="BLRA12345F"
                  />
                </div>
              </div>
            </div>

            <div className="settings-card">
              <div className="card-header">
                <AlertCircle size={20} />
                <h3>How Settings Work</h3>
              </div>
              <div className="info-box">
                <p><strong>Automatic Data Combination:</strong></p>
                <ul>
                  <li>These company details will automatically appear on all payslips</li>
                  <li>When importing Excel, company details will be merged with employee data</li>
                  <li>Excel company data will override these settings if provided</li>
                  <li>Logo will appear on all generated payslips</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="settings-actions">
          <button type="submit" className="btn btn-primary">
            <Save size={16} />
            Save Settings
          </button>
          <button type="button" className="btn btn-secondary" onClick={handleReset}>
            Reset Form
          </button>
        </div>
      </form>
    </div>
  );
}