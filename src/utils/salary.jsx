export function computeSalary(employee) {
  // Information fields (not used in salary calculations)
  const pfNumber = employee.pfNumber || employee.uan || ""; // PF/UAN number (informational)
  const phoneNumber = employee.phoneNumber || employee.phone || ""; // Phone number (informational)
  
  // Parse all monetary amounts
  const basic = parseFloat(employee.basic) || 0;
  const hra = parseFloat(employee.hra) || 0;
  const conveyance = parseFloat(employee.conveyance) || 0;
  const other = parseFloat(employee.other) || 0;
  const pfContribution = parseFloat(employee.pfContribution) || parseFloat(employee.pf) || 0; // PF contribution (deduction amount)
  const tax = parseFloat(employee.tax) || 0;
  // Professional tax should only apply when explicitly set; default to 0
  const professionalTax = parseFloat(employee.professionalTax) || 0;
  const otherDeductions = parseFloat(employee.otherDeductions) || 0;

  // If earnings/deductions are provided as arrays, sum them first
  const earningsArrayTotal = Array.isArray(employee.earnings)
    ? employee.earnings.reduce((s, it) => s + (parseFloat(it?.amount) || 0), 0)
    : 0;

  const deductionsArrayTotal = Array.isArray(employee.deductions)
    ? employee.deductions.reduce((s, it) => s + (parseFloat(it?.amount) || 0), 0)
    : 0;

  // Calculate gross salary: prefer earnings array when present, otherwise use individual fields
  const gross = earningsArrayTotal > 0 ? earningsArrayTotal : (basic + hra + conveyance + other);

  // Calculate total deductions: prefer deductions array when present, otherwise use deduction fields
  const totalDeductions = deductionsArrayTotal > 0 ? deductionsArrayTotal : (pfContribution + tax + professionalTax + otherDeductions);

  // Calculate net salary
  const net = gross - totalDeductions;

  return {
    ...employee,
    // Information fields
    pfNumber,
    phoneNumber,
    // Earnings fields
    basic,
    hra,
    conveyance,
    other,
    // Deductions fields
    pfContribution,
    tax,
    professionalTax,
    otherDeductions,
    // Totals
    gross,
    deductions: totalDeductions, // unified total deductions
    net,
    // convenience fields when arrays were used
    earningsTotal: earningsArrayTotal,
    deductionsTotal: deductionsArrayTotal
  };
}

// Example calculation:
// Basic: 50,000
// HRA: 20,000
// Conveyance: 1,600
// Other: 0
// Gross = 50,000 + 20,000 + 1,600 + 0 = 71,600
// 
// Deductions:
// PF: 1,800
// Professional Tax: 200
// Income Tax: 12,000
// Other: 0
// Total Deductions = 1,800 + 200 + 12,000 + 0 = 14,000
// 
// Net = Gross - Total Deductions = 71,600 - 14,000 = 57,600