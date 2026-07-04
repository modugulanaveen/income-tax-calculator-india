// PF Wage Ceiling and Rates as per EPFO guidelines
export const PF_CONSTANTS = {
  // Maximum wage ceiling (only 1st ₹15,000 of gross salary is considered)
  WAGE_CEILING: 15000,

  // PF Rates - Employee and Employer Contribution
  EPF_RATE_EMPLOYEE: 0.12, // 12% of EPF wages
  EPF_RATE_EMPLOYER: 0.12, // 12% of EPF wages
  EPS_RATE_EMPLOYER: 0.0833, // 8.33% of EPF wages (part of employer's 12%)
  EPS_CAP: 1250, // Maximum EPS component on PF wages cap
  EDLI_RATE_EMPLOYER: 0.005,
  ADMIN_CHARGE_RATE: 0.0017,
  EDLI_ADMIN_RATE: 0.0001, // 0.43% of EDLI wages

  // Default values
  NCP_DAYS: 0, // No-Credit Period Days
  REFUND_ADVANCES: 0,

  // ECR Format Separator
  ECR_SEPARATOR: "#~#",
};

// PF Data Status Options
export const PF_STATUS = {
  ACTIVE: "Active",
  TERMINATED: "Terminated",
  LEFT: "Left Service",
};

// ECR File Columns (in order) - 14 fields for EPFO compliance
export const ECR_COLUMNS = [
  "Sl.No",
  "Employee No",
  "Name",
  "UAN",
  "Gross Wages",
  "EPF Wages",
  "EPS Wages",
  "EDLI Wages",
  "EPF EE",
  "EPS",
  "EPF ER",
  "EDLI",
  "Admin Charge",
  "EDLI Admin",
  "NCP Days",
  "Refund Advances",
];
