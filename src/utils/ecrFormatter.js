
import { PF_CONSTANTS } from "../constants/pfConstants";

/**
 * Format PF data to EPFO-compliant ECR line (10-field format)
 * Format: UAN#~#NAME#~#GROSS_WAGES#~#EPF_WAGES#~#EPS_WAGES#~#EDLI_WAGES#~#EPF_EE#~#EPS#~#EPF_ER#~#NCP_DAYS
 * This is the actual EPFO format - only 10 fields
 */
export function formatToECRLine(pfRecord) {
  const {
    uan = "",
    name = "",
    grossWages = 0,
    epfWages = 0,
    epsWages = 0,
    edliWages = 0,
    epfEe = 0,
    eps = 0,
    epfEr = 0,
    ncpDays = 0,
  } = pfRecord;

  return [
    uan.toString().trim(),
    name.toString().trim().toUpperCase(),
    formatECRNumber(grossWages),
    formatECRNumber(epfWages),
    formatECRNumber(epsWages),
    formatECRNumber(edliWages),
    formatECRNumber(epfEe),
    formatECRNumber(eps),
    formatECRNumber(epfEr),
    formatECRNumber(ncpDays),
  ].join(PF_CONSTANTS.ECR_SEPARATOR);
}

/**
 * Generate EPFO-compliant ECR file content (NO headers, NO comments)
 * This matches the format of APKP2204098000_ECR_Dec25.txt
 * @param {Array} pfDataArray - Array of PF records
 * @returns {string} ECR file content
 */
export function generateECRFileContent(pfDataArray) {
  if (!Array.isArray(pfDataArray) || pfDataArray.length === 0) {
    return "";
  }

  // Generate lines in EPFO format (no headers, no comments)
  const lines = pfDataArray.map(record => formatToECRLine(record));
  
  // Join with newline and ensure proper line ending
  return lines.join("\n") + "\n";
}

/**
 * Generate ECR file name in EPFO format
 * Format: ESTABCODE_ECR_MmmYY.txt (e.g., APKP2204098000_ECR_Dec25.txt)
 */
export function generateECRFilename(establishmentCode, month, year) {
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  
  const monthIndex = month - 1;
  const monthName = monthIndex >= 0 && monthIndex < 12 ? monthNames[monthIndex] : monthNames[0];
  const shortYear = year.toString().slice(-2);
  
  return `${establishmentCode}_ECR_${monthName}${shortYear}.txt`;
}

/**
 * Parse EPFO ECR line (10-field format)
 */
export function parseECRLine(ecrLine) {
  const parts = ecrLine.split(PF_CONSTANTS.ECR_SEPARATOR);
  
  if (parts.length < 10) {
    console.warn("EPFO ECR line has less than 10 fields:", ecrLine);
    // Try to parse what we can
    return {
      uan: parts[0]?.trim() || "",
      name: parts[1]?.trim() || "",
      grossWages: parseFloat(parts[2]) || 0,
      epfWages: parseFloat(parts[3]) || 0,
      epsWages: parseFloat(parts[4]) || 0,
      edliWages: parseFloat(parts[5]) || 0,
      epfEe: parseFloat(parts[6]) || 0,
      eps: parseFloat(parts[7]) || 0,
      epfEr: parseFloat(parts[8]) || 0,
      ncpDays: parseInt(parts[9]) || 0,
      edli: 0,
      adminCharge: 0,
      edliAdminCharge: 0,
      refundAdvances: 0
    };
  }
  
  return {
    uan: parts[0].trim(),
    name: parts[1].trim(),
    grossWages: parseFloat(parts[2]) || 0,
    epfWages: parseFloat(parts[3]) || 0,
    epsWages: parseFloat(parts[4]) || 0,
    edliWages: parseFloat(parts[5]) || 0,
    epfEe: parseFloat(parts[6]) || 0,
    eps: parseFloat(parts[7]) || 0,
    epfEr: parseFloat(parts[8]) || 0,
    ncpDays: parseInt(parts[9]) || 0,
    edli: 0,
    adminCharge: 0,
    edliAdminCharge: 0,
    refundAdvances: 0
  };
}

/**
 * Format number for ECR (no decimals, integer only)
 */
export function formatECRNumber(value) {
  const num = parseFloat(value) || 0;
  return Math.round(num).toString();
}

/**
 * Parse EPFO ECR file content
 */
export function parseECRContent(ecrContent) {
  const records = [];
  const lines = ecrContent.split("\n");
  
  for (let line of lines) {
    line = line.trim();
    
    // Skip empty lines and comment lines
    if (!line || line.startsWith("#")) continue;
    
    try {
      const record = parseECRLine(line);
      record.id = `${record.uan}_${Date.now()}_${Math.random()}`;
      records.push(record);
    } catch (error) {
      console.warn("Failed to parse ECR line:", line, error);
    }
  }
  
  return records;
}

/**
 * Enhanced ECR formatter that can handle both EPFO format and detailed format
 */
export function generateDetailedECRContent(pfDataArray, companyInfo = {}) {
  if (!Array.isArray(pfDataArray) || pfDataArray.length === 0) {
    return "# No PF data to export\n";
  }

  const lines = [];

  // Add company header if provided
  if (companyInfo && companyInfo.companyName) {
    lines.push(`# Company: ${companyInfo.companyName}`);
    if (companyInfo.address) {
      lines.push(`# Address: ${companyInfo.address}`);
    }
    if (companyInfo.panNumber) {
      lines.push(`# PAN: ${companyInfo.panNumber}`);
    }
    lines.push("# " + "=".repeat(80));
    lines.push(""); // blank line
  }

  // Add header
  const headers = ["Sl.No", "UAN", "Name", "Gross Wages", "EPF Wages", "EPS Wages", "EDLI Wages", 
                   "EPF EE", "EPS", "EPF ER", "EDLI", "Admin Charge", "EDLI Admin", "NCP Days", "Refund Advances"];
  lines.push("# " + headers.join(" | "));
  lines.push("# " + "=".repeat(80));
  lines.push("");

  // Add each record
  pfDataArray.forEach((record, index) => {
    const detailedRecord = {
      ...record,
      slNo: index + 1,
      // Include all components for detailed view
      edli: record.edli || 0,
      adminCharge: record.adminCharge || 0,
      edliAdminCharge: record.edliAdminCharge || 0,
      refundAdvances: record.refundAdvances || 0
    };
    
    // For detailed view, we need to reconstruct the full line
    const detailedLine = [
      detailedRecord.uan,
      detailedRecord.name.toUpperCase(),
      formatECRNumber(detailedRecord.grossWages),
      formatECRNumber(detailedRecord.epfWages),
      formatECRNumber(detailedRecord.epsWages),
      formatECRNumber(detailedRecord.edliWages),
      formatECRNumber(detailedRecord.epfEe),
      formatECRNumber(detailedRecord.eps),
      formatECRNumber(detailedRecord.epfEr),
      formatECRNumber(detailedRecord.edli),
      formatECRNumber(detailedRecord.adminCharge),
      formatECRNumber(detailedRecord.edliAdminCharge),
      formatECRNumber(detailedRecord.ncpDays),
      formatECRNumber(detailedRecord.refundAdvances),
    ].join(PF_CONSTANTS.ECR_SEPARATOR);
    
    lines.push(detailedLine);
  });

  return lines.join("\n");
}

/**
 * Parse CSV content to PF records
 */
export function parseCSVContent(csvContent) {
  const lines = csvContent.split("\n");
  const records = [];
  let dataStartIndex = 0;

  // Find where actual data starts (skip company headers)
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("Sl.No") || lines[i].includes("Sl No") || lines[i].includes("UAN")) {
      dataStartIndex = i + 1;
      break;
    }
  }

  // Parse data rows
  for (let i = dataStartIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cells = line.split(",").map((cell) => cell.replace(/^"|"$/g, "").trim());

    if (cells.length >= 12) {
      records.push({
        uan: cells[1] || cells[0] || "",
        name: cells[2] || cells[1] || "",
        grossWages: parseFloat(cells[3]) || 0,
        epfWages: parseFloat(cells[4]) || 0,
        epsWages: parseFloat(cells[5]) || 0,
        edliWages: parseFloat(cells[6]) || 0,
        epfEe: parseFloat(cells[7]) || 0,
        eps: parseFloat(cells[8]) || 0,
        epfEr: parseFloat(cells[9]) || 0,
        edli: parseFloat(cells[10]) || 0,
        adminCharge: parseFloat(cells[11]) || 0,
        edliAdminCharge: parseFloat(cells[12]) || 0,
        ncpDays: parseFloat(cells[13]) || 0,
        refundAdvances: parseFloat(cells[14]) || 0,
      });
    } else if (cells.length >= 10) {
      // EPFO 10-field format
      records.push({
        uan: cells[0] || "",
        name: cells[1] || "",
        grossWages: parseFloat(cells[2]) || 0,
        epfWages: parseFloat(cells[3]) || 0,
        epsWages: parseFloat(cells[4]) || 0,
        edliWages: parseFloat(cells[5]) || 0,
        epfEe: parseFloat(cells[6]) || 0,
        eps: parseFloat(cells[7]) || 0,
        epfEr: parseFloat(cells[8]) || 0,
        ncpDays: parseFloat(cells[9]) || 0,
        edli: 0,
        adminCharge: 0,
        edliAdminCharge: 0,
        refundAdvances: 0
      });
    }
  }

  return records;
}

/**
 * Create CSV content for Excel export
 */
export function generateCSVContent(pfDataArray, companyInfo = {}) {
  const lines = [];

  // Add company header
  if (companyInfo && companyInfo.companyName) {
    lines.push(`Company,${companyInfo.companyName}`);
    if (companyInfo.address) {
      lines.push(`Address,${companyInfo.address}`);
    }
    if (companyInfo.panNumber) {
      lines.push(`PAN,${companyInfo.panNumber}`);
    }
    if (companyInfo.estCode) {
      lines.push(`Establishment Code,${companyInfo.estCode}`);
    }
    lines.push(""); // blank line
  }

  // Add header row
  const headers = ["Sl.No", "UAN", "Name", "Gross Wages", "EPF Wages", "EPS Wages", "EDLI Wages", 
                   "EPF EE", "EPS", "EPF ER", "EDLI", "Admin Charge", "EDLI Admin", "NCP Days", "Refund Advances"];
  lines.push(headers.join(","));

  // Add data rows
  if (Array.isArray(pfDataArray)) {
    pfDataArray.forEach((record, index) => {
      const row = [
        index + 1,
        record.uan || "",
        `"${record.name || ""}"`,
        record.grossWages || 0,
        record.epfWages || 0,
        record.epsWages || 0,
        record.edliWages || 0,
        record.epfEe || 0,
        record.eps || 0,
        record.epfEr || 0,
        record.edli || 0,
        record.adminCharge || 0,
        record.edliAdminCharge || 0,
        record.ncpDays || 0,
        record.refundAdvances || 0,
      ];
      lines.push(row.join(","));
    });
  }

  return lines.join("\n");
}
