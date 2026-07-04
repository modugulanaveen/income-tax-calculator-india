import { PF_CONSTANTS } from "../constants/pfConstants";

/**
 * Calculate PF contributions based on gross salary
 * EPFO Compliant Calculation with all 6 components
 * @param {number} grossSalary - Total gross salary
 * @returns {Object} PF calculation details
 */
export function calculatePF(grossSalary) {
  const gross = parseFloat(grossSalary) || 0;

  // Gross wages capped at ceiling
  const pfWages = Math.min(gross, PF_CONSTANTS.WAGE_CEILING);
  const epfWages = pfWages;
  const epsWages = pfWages;
  const edliWages = pfWages;

  // Employee contribution (12% of PF wages)
  const epfEE = Math.round(pfWages * PF_CONSTANTS.EPF_RATE_EMPLOYEE);

  // Employer contributions (all 6 components):
  // - EPS (8.33% of PF wages, capped naturally by PF wages and rounded)
  // - EPF ER = total 12% employer contribution minus EPS for exact balance
  // - EDLI (0.5% of EDLI wages)
  // - Admin Charge (0.17% of PF wages)
  // - EDLI Admin (0.01% of EDLI wages)
  const eps = Math.min(
    Math.round(epsWages * PF_CONSTANTS.EPS_RATE_EMPLOYER),
    PF_CONSTANTS.EPS_CAP
  );
  const totalEmployerPF = Math.round(epfWages * PF_CONSTANTS.EPF_RATE_EMPLOYER);
  const epfER = Math.max(0, totalEmployerPF - eps);
  const edli = Math.round(edliWages * PF_CONSTANTS.EDLI_RATE_EMPLOYER);
  const adminCharge = Math.round(pfWages * PF_CONSTANTS.ADMIN_CHARGE_RATE);
  const edliAdminCharge = Math.round(edliWages * PF_CONSTANTS.EDLI_ADMIN_RATE);

  // Total employer contribution
  const totalEmployerContribution = eps + epfER + edli + adminCharge + edliAdminCharge;
  const totalContribution = epfEE + totalEmployerContribution;

  return {
    grossWages: gross,
    pfWages: pfWages,
    epfWages: epfWages,
    epsWages: epsWages,
    edliWages: edliWages,
    epfEe: epfEE,
    eps: eps,
    epfEr: epfER,
    edli: edli,
    adminCharge: adminCharge,
    edliAdminCharge: edliAdminCharge,
    totalEmployerContribution: totalEmployerContribution,
    totalContribution: totalContribution,
    ncpDays: PF_CONSTANTS.NCP_DAYS,
    refundAdvances: PF_CONSTANTS.REFUND_ADVANCES,
    wagesCapped: gross > PF_CONSTANTS.WAGE_CEILING,
    isEligible: true,
  };
}

/**
 * Validate PF data entry
 * @param {Object} pfEntry - PF data entry
 * @returns {Object} Validation result { valid: boolean, errors: Array }
 */
export function validatePFEntry(pfEntry) {
  const errors = [];

  if (!pfEntry.uan || pfEntry.uan.toString().trim() === "") {
    errors.push("UAN is required");
  } else if (!/^\d{12}$/.test(pfEntry.uan.toString().replace(/\D/g, ""))) {
    errors.push("UAN must be 12 digits");
  }

  if (!pfEntry.name || pfEntry.name.toString().trim() === "") {
    errors.push("Employee name is required");
  }

  if (!pfEntry.grossWages || isNaN(parseFloat(pfEntry.grossWages))) {
    errors.push("Valid gross wages required");
  } else if (parseFloat(pfEntry.grossWages) < 0) {
    errors.push("Gross wages cannot be negative");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Format number for ECR (Indian format)
 * @param {number} value - Value to format
 * @returns {string} Formatted value
 */
export function formatECRNumber(value) {
  const num = parseFloat(value) || 0;
  return num.toFixed(0); // No decimals in ECR format
}

/**
 * Calculate totals from PF data array
 * @param {Array} pfDataArray - Array of PF records
 * @returns {Object} Totals object
 */
export function calculatePFTotals(pfDataArray) {
  if (!Array.isArray(pfDataArray) || pfDataArray.length === 0) {
    return {
      employeeCount: 0,
      totalGrossWages: 0,
      totalEPFWages: 0,
      totalEpsWages: 0,
      totalEdliWages: 0,
      totalEPFEE: 0,
      totalEPS: 0,
      totalEPFER: 0,
      totalEDLI: 0,
      totalAdminCharge: 0,
      totalEDLIAdmin: 0,
      totalEmployerContribution: 0,
      totalContribution: 0,
    };
  }

  const totals = pfDataArray.reduce(
    (acc, record) => {
      acc.employeeCount += 1;
      acc.totalGrossWages += parseFloat(record.grossWages) || 0;
      acc.totalEPFWages += parseFloat(record.epfWages) || 0;
      acc.totalEpsWages += parseFloat(record.epsWages) || 0;
      acc.totalEdliWages += parseFloat(record.edliWages) || 0;
      acc.totalEPFEE += parseFloat(record.epfEe) || 0;
      acc.totalEPS += parseFloat(record.eps) || 0;
      acc.totalEPFER += parseFloat(record.epfEr) || 0;
      acc.totalEDLI += parseFloat(record.edli) || 0;
      acc.totalAdminCharge += parseFloat(record.adminCharge) || 0;
      acc.totalEDLIAdmin += parseFloat(record.edliAdminCharge) || 0;
      return acc;
    },
    {
      employeeCount: 0,
      totalGrossWages: 0,
      totalEPFWages: 0,
      totalEpsWages: 0,
      totalEdliWages: 0,
      totalEPFEE: 0,
      totalEPS: 0,
      totalEPFER: 0,
      totalEDLI: 0,
      totalAdminCharge: 0,
      totalEDLIAdmin: 0,
    }
  );

  // Calculate totals
  totals.totalEmployerContribution = totals.totalEPS + totals.totalEPFER + totals.totalEDLI + totals.totalAdminCharge + totals.totalEDLIAdmin;
  totals.totalContribution = totals.totalEPFEE + totals.totalEmployerContribution;

  // Round all totals
  Object.keys(totals).forEach((key) => {
    if (key !== "employeeCount") {
      totals[key] = Math.round(totals[key]);
    }
  });

  return totals;
}
