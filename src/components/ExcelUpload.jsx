import React, { useState } from "react";
import Papa from "papaparse";
import ExcelJS from "exceljs";
import {
  Upload,
  AlertCircle,
  FileSpreadsheet,
  Download,
  Check,
  X,
} from "lucide-react";
import Toast from "./Toast";

export default function ExcelUpload({ employees = [], setEmployees, company }) {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fileName, setFileName] = useState("");
  const [processing, setProcessing] = useState(false);
  const [parsedData, setParsedData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [headerMap, setHeaderMap] = useState([]);
  const [columnAnalysis, setColumnAnalysis] = useState({});
  const [validationWarnings, setValidationWarnings] = useState([]);
  const [previewData, setPreviewData] = useState([]);
  const [columnOverrides, setColumnOverrides] = useState({});
  const [draggedColumn, setDraggedColumn] = useState(null);
  const [dragOverCategory, setDragOverCategory] = useState(null);
  const [itemOrder, setItemOrder] = useState({}); // Track custom item order
  const [toast, setToast] = useState(null);

  // Clean and validate CSV data
  const cleanCSVData = (data) => {
    return data.filter((row) => {
      // Remove rows that are comments/instructions
      if (!row || typeof row !== "object") return false;

      // Get the first column value
      const firstCol = Object.values(row)[0];

      // Skip comment rows (starting with #)
      if (
        firstCol &&
        typeof firstCol === "string" &&
        firstCol.trim().startsWith("#")
      ) {
        return false;
      }

      // Skip instruction/header rows
      const rowStr = JSON.stringify(row).toLowerCase();
      if (
        rowStr.includes("instruction") ||
        rowStr.includes("template") ||
        rowStr.includes("required columns")
      ) {
        return false;
      }

      // Check if this row has any actual data (not just empty or placeholder)
      const hasData = Object.values(row).some((value) => {
        if (!value) return false;
        const strVal = value.toString().trim();
        // Skip placeholder values like "Not Provided"
        if (
          strVal === "" ||
          strVal === "Not Provided" ||
          strVal === "N/A" ||
          strVal === "-" ||
          strVal.includes("INSTRUCTION") ||
          strVal.includes("TEMPLATE")
        ) {
          return false;
        }
        return true;
      });

      return hasData;
    });
  };

  // Clean headers - split concatenated headers
  const cleanHeaders = (headers) => {
    if (!headers || headers.length === 0) return [];

    return headers.map((header) => {
      if (!header) return "";

      // Fix concatenated headers like "Basic Salary HRA" or "special al Gross Earn Income Tₑ"
      const commonSeparators = ["|", ";", "\\", "/", "&"];

      // Try to split by common separators
      for (const sep of commonSeparators) {
        if (header.includes(sep)) {
          return header.split(sep)[0].trim();
        }
      }

      // If header contains multiple words without separators, take first meaningful part
      const headerLower = header.toLowerCase();
      const knownPatterns = [
        "name",
        "employee",
        "id",
        "period",
        "date",
        "day",
        "basic",
        "salary",
        "hra",
        "gross",
        "earnings",
        "income",
        "tax",
        "provident",
        "fund",
        "professional",
        "total",
        "deductions",
        "net",
        "pay",
        "special",
        "allowance",
        "conveyance",
        "medical",
        "bonus",
        "overtime",
      ];

      for (const pattern of knownPatterns) {
        if (headerLower.includes(pattern)) {
          // Extract from start of header to the pattern + some buffer
          const patternIndex = headerLower.indexOf(pattern);
          if (patternIndex > 0) {
            // Check if there's another pattern before this one
            const beforePattern = headerLower.substring(0, patternIndex);
            const hasOtherPattern = knownPatterns.some(
              (p) => p !== pattern && beforePattern.includes(p),
            );

            if (!hasOtherPattern) {
              // Take everything up to and including this pattern
              const endIndex = Math.min(
                patternIndex + pattern.length + 10, // Include some buffer
                header.length,
              );
              return header.substring(0, endIndex).trim();
            }
          }
        }
      }

      return header.trim();
    });
  };

  // Enhanced patterns for Indian payroll
  const earningsPatterns = [
    "basic",
    "basic pay",
    "Basic Pay",
    "salary",
    "hra",
    "house",
    "rent",
    "allowance",
    "special",
    "conveyance",
    "medical",
    "education",
    "lta",
    "leave",
    "travel",
    "bonus",
    "incentive",
    "overtime",
    "shift",
    "night",
    "arrears",
    "commission",
    "performance",
    "allowences",
    "children",
    "gratuity",
    "reimbursement",
    "other",
    "miscellaneous",
    "dearness",
    "city",
    "project",
    "food",
    "uniform",
    "telephone",
    "internet",
    "transport",
    "car",
    "driver",
    "petrol",
    "entertainment",
    "newspaper",
    "gift",
  ];

  const deductionsPatterns = [
    "tax",
    "income",
    "tds",
    "provident",
    "fund",
    "professional",
    "pt",
    "esi",
    "insurance",
    "health",
    "loan",
    "advance",
    "recovery",
    "deduction",
    "labour",
    "welfare",
    "pension",
    "gratuity",
    "lic",
    "security",
    "canteen",
    "club",
    "union",
    "donation",
    "contribution",
    "Other Deduction",
  ];

  // Special total fields
  const totalFields = [
    "gross",
    "total earnings",
    "net",
    "payable",
    "total deductions",
  ];

  // Info fields (not part of calculations)
  const infoFields = [
    "name",
    "employee",
    "id",
    "code",
    "period",
    "date",
    "day",
    "days",
    "UAN",
    "year",
    "pay",
    "department",
    "designation",
    "location",
    "account",
    "bank",
    "ifsc",
    "pan",
    "uan",
    "esi number",
    "number",
    "phone",
    "phone number",
    "mobile",
    "pf number",
    "aadhar",
    "aadhar number",
    "email",
    "full name",
    "fname",
    "first name",
    "fullname",
    "employee name",
    "employeename",
    "emp name",
    "empname",
    "employee_name",
    "emp_name",
    "lop",
    "loss",
    "ncp",
    "non-calculated",
    "paid days",
  ];

  const detectColumnType = (columnName) => {
    if (!columnName) return "other";

    const col = columnName
      .toLowerCase()
      .replace(/[^a-z\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    // Check for LOP and NCP FIRST (before other checks) - these are critical fields
    if (
      col.includes("lop") ||
      col.includes("loss of pay") ||
      col.includes("loss of paid") ||
      col.includes("lossofpay") ||
      col.includes("unpaid") ||
      (col.includes("loss") && col.includes("day"))
    ) {
      return "info";
    }

    // Check for NCP days
    if (
      col.includes("ncp") ||
      col.includes("non calculated") ||
      col.includes("noncalculated") ||
      (col.includes("non") && col.includes("day"))
    ) {
      return "info";
    }

    // Check if it's a total field FIRST (before other checks)
    if (totalFields.some((pattern) => col.includes(pattern))) {
      return "total";
    }

    // Check for earnings patterns containing "basic" or "salary" BEFORE info fields
    if (
      (col.includes("basic") || col.includes("salary")) &&
      earningsPatterns.some((pattern) => col.includes(pattern))
    ) {
      return "earning";
    }

    // Check for deductions patterns containing "provident" or "fund" BEFORE info fields (to avoid confusion with info fields)
    if (
      (col.includes("provident") || col.includes("fund")) &&
      deductionsPatterns.some((pattern) => col.includes(pattern))
    ) {
      return "deduction";
    }

    // Check for specific deduction abbreviations (PF, TDS, PT, ESI) but NOT if they're part of info fields like "PF Number" or "ESI Number"
    if (
      (col === "pf" || col === "tds" || col === "pt" || col === "esi") &&
      !infoFields.some((pattern) => col.includes(pattern))
    ) {
      return "deduction";
    }

    // Check if it's an info field
    if (infoFields.some((pattern) => col.includes(pattern))) {
      return "info";
    }

    // Check for paid days
    if (
      (col.includes("paid") && col.includes("day")) ||
      col.includes("paiddays")
    ) {
      return "info";
    }

    // Check if it's a known deduction pattern
    if (deductionsPatterns.some((pattern) => col.includes(pattern))) {
      // Check if it's actually a total field in disguise (total + deductions)
      if (
        (col.includes("total") && col.includes("deduction")) ||
        col.includes("net")
      ) {
        return "total";
      }
      return "deduction";
    }

    // Check if it's a known earnings pattern
    if (earningsPatterns.some((pattern) => col.includes(pattern))) {
      // Check if it's actually a total field in disguise
      if (col.includes("total") || col.includes("gross")) {
        return "total";
      }
      return "earning";
    }

    // Default to other for unknown columns
    return "other";
  };

  // Get effective column type considering user overrides
  const getEffectiveColumnType = (header) => {
    return columnOverrides[header] || detectColumnType(header);
  };

  const analyzeHeaders = (csvHeaders) => {
    const analysis = {};
    const warnings = [];

    csvHeaders.forEach((header) => {
      analysis[header] = detectColumnType(header);
    });

    // Check for required fields
    const hasName = csvHeaders.some((h) => {
      const type = detectColumnType(h);
      return type === "info" && h.toLowerCase().includes("name");
    });

    const hasEarnings = csvHeaders.some(
      (h) => detectColumnType(h) === "earning",
    );

    if (!hasName) {
      warnings.push("No 'Name' column found. Using placeholder names.");
    }

    if (!hasEarnings) {
      warnings.push(
        "No earnings columns found. Check if Basic Salary column exists.",
      );
    }

    setColumnAnalysis(analysis);
    setValidationWarnings(warnings);
    return analysis;
  };

  // Drag and Drop Handlers
  const handleDragStart = (e, header) => {
    setDraggedColumn(header);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, category) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverCategory(category);
  };

  const handleDragLeave = () => {
    setDragOverCategory(null);
  };

  const handleDropOnCategory = (e, targetCategory) => {
    e.preventDefault();
    setDragOverCategory(null);

    if (!draggedColumn) return;

    // Update the column override
    setColumnOverrides((prev) => ({
      ...prev,
      [draggedColumn]: targetCategory,
    }));

    setDraggedColumn(null);
  };

  const resetColumnOverride = (header) => {
    setColumnOverrides((prev) => {
      const updated = { ...prev };
      delete updated[header];
      return updated;
    });
  };

  // Handle reordering items within a section
  const handleReorderItem = (sourceIndex, targetIndex, category) => {
    setItemOrder((prev) => {
      const key = category;
      const order = prev[key] || [];

      // Create a new order array
      const newOrder = [...order];
      const item = newOrder.splice(sourceIndex, 1)[0];
      newOrder.splice(targetIndex, 0, item);

      return {
        ...prev,
        [key]: newOrder,
      };
    });
  };

  const extractLabelFromHeader = (header) => {
    if (!header) return "";

    // Clean the header first
    const cleanHeader = header
      .replace(/[^\w\s]/g, " ") // Remove special characters
      .replace(/\s+/g, " ") // Replace multiple spaces with single
      .trim();

    // Convert to proper label format
    const words = cleanHeader.split(/\s+/);
    return words
      .map((word) => {
        if (word.length <= 2) return word.toUpperCase(); // Keep ID, PF, etc uppercase
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(" ");
  };

  const parseNumber = (val) => {
    if (!val || val === "" || val === undefined || val === null) return 0;

    // Clean the value
    const cleaned = val
      .toString()
      .replace(/[₹,$,]/g, "") // Remove currency symbols and commas
      .replace(/\s+/g, "")
      .replace(/[^\d.-]/g, "") // Keep only numbers, dots, and minus
      .trim();

    // Handle empty result
    if (cleaned === "" || cleaned === "-") return 0;

    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  const normalizeHeaderKey = (header) => {
    return header
      ?.toString()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .trim();
  };

  const getRowValueByHeader = (row, rawHeader, cleanHeader) => {
    if (rawHeader && row.hasOwnProperty(rawHeader)) {
      return row[rawHeader];
    }
    if (cleanHeader && row.hasOwnProperty(cleanHeader)) {
      return row[cleanHeader];
    }

    const normalizedTarget = normalizeHeaderKey(cleanHeader || rawHeader);
    const matchingKey = Object.keys(row).find(
      (key) => normalizeHeaderKey(key) === normalizedTarget,
    );
    return matchingKey ? row[matchingKey] : "";
  };

  const processCSVColumns = (headers, row, overrides = {}) => {
    const categories = {
      info: {},
      earnings: [],
      deductions: [],
      totals: {},
    };

    let headerIndex = 0;

    headers.forEach((headerObj, index) => {
      if (!headerObj) return;
      const rawHeader = headerObj.raw;
      const header = headerObj.clean || rawHeader;
      if (!header) return;

      // Detect original type and effective type
      const originalType = detectColumnType(header);
      const colType = overrides[header] || originalType;
      const isOverridden = overrides[header] !== undefined;
      const value = getRowValueByHeader(row, rawHeader, header) || "";

      // Skip if value is clearly not data (instructions, etc)
      const strValue = value.toString().toLowerCase();
      if (
        strValue.includes("instruction") ||
        strValue.includes("template") ||
        strValue === "not provided" ||
        strValue === "n/a" ||
        strValue === "-"
      ) {
        return;
      }

      const amount = parseNumber(value);
      const label = extractLabelFromHeader(header);

      // Whitelist items that should show even with ₹0.00
      const isWhitelistedEarning = (lbl) => {
        const lower = lbl.toLowerCase();
        return (
          lower.includes("house rent") ||
          lower.includes("hra") ||
          lower.includes("dearness") ||
          lower.includes("da")
        );
      };

      const isWhitelistedDeduction = (lbl) => {
        const lower = lbl.toLowerCase();
        return (
          lower.includes("income tax") ||
          lower.includes("provident fund") ||
          lower.includes("pf")
        );
      };

      const showZeroEarning = isWhitelistedEarning(label);
      const showZeroDeduction = isWhitelistedDeduction(label);

      switch (colType) {
        case "info":
          // Always capture info fields, even if empty or zero
          // Special handling for numeric days fields - store as numeric
          if (
            header.toLowerCase().includes("lop") ||
            header.toLowerCase().includes("loss") ||
            header.toLowerCase().includes("ncp") ||
            header.toLowerCase().includes("non calculated") ||
            header.toLowerCase().includes("paid days") ||
            header.toLowerCase().includes("paiddays") ||
            (header.toLowerCase().includes("paid") &&
              header.toLowerCase().includes("day"))
          ) {
            // For days fields, always store even if 0
            categories.info[header.toLowerCase()] = parseNumber(value);
          } else if (value && value.toString().trim() !== "") {
            // For other info fields, only store if not empty
            categories.info[header.toLowerCase()] = value.toString().trim();
          }
          break;

        case "earning":
          if (amount > 0 || showZeroEarning) {
            categories.earnings.push({
              label: label,
              amount: amount,
              originalHeader: header,
              isOverridden: isOverridden,
              originalType: originalType,
              columnIndex: index,
            });
          }
          break;

        case "deduction":
          if (amount > 0 || showZeroDeduction) {
            categories.deductions.push({
              label: label,
              amount: amount,
              originalHeader: header,
              isOverridden: isOverridden,
              originalType: originalType,
              columnIndex: index,
            });
          }
          break;

        case "total":
          if (amount > 0) {
            categories.totals[header.toLowerCase()] = amount;
          }
          break;

        default:
          // For unknown columns with positive amounts, assume they're earnings
          if (amount > 0) {
            categories.earnings.push({
              label: label,
              amount: amount,
              originalHeader: header,
              isUnknown: true,
              columnIndex: index,
            });
          }
      }
    });

    // Sort earnings: non-overridden first (by column order), then overridden at bottom
    categories.earnings.sort((a, b) => {
      if (a.isOverridden !== b.isOverridden) {
        return a.isOverridden ? 1 : -1; // Non-overridden first
      }
      return (a.columnIndex || 0) - (b.columnIndex || 0); // Maintain column order
    });

    // Sort deductions: non-overridden first (by column order), then overridden at bottom
    categories.deductions.sort((a, b) => {
      if (a.isOverridden !== b.isOverridden) {
        return a.isOverridden ? 1 : -1; // Non-overridden first
      }
      return (a.columnIndex || 0) - (b.columnIndex || 0); // Maintain column order
    });

    return categories;
  };

  const calculatePayrollTotals = (categories) => {
    // Calculate from individual items
    const calculatedGross = categories.earnings.reduce(
      (sum, e) => sum + e.amount,
      0,
    );
    const calculatedDeductions = categories.deductions.reduce(
      (sum, d) => sum + d.amount,
      0,
    );
    const calculatedNet = calculatedGross - calculatedDeductions;

    // Get provided totals from CSV
    const providedGross =
      categories.totals["gross"] ||
      categories.totals["gross earnings"] ||
      categories.totals["total earnings"] ||
      0;

    const providedDeductions =
      categories.totals["total deductions"] ||
      categories.totals["deductions"] ||
      categories.totals["total deduction"] ||
      0;

    const providedNet =
      categories.totals["net"] ||
      categories.totals["net pay"] ||
      categories.totals["take home"] ||
      0;

    // Validate calculations (allow 1 rupee difference for rounding)
    const validation = {
      gross: {
        calculated: calculatedGross,
        provided: providedGross,
        difference: Math.abs(calculatedGross - providedGross),
        isValid:
          providedGross === 0 || Math.abs(calculatedGross - providedGross) < 1,
      },
      deductions: {
        calculated: calculatedDeductions,
        provided: providedDeductions,
        difference: Math.abs(calculatedDeductions - providedDeductions),
        isValid:
          providedDeductions === 0 ||
          Math.abs(calculatedDeductions - providedDeductions) < 1,
      },
      net: {
        calculated: calculatedNet,
        provided: providedNet,
        difference: Math.abs(calculatedNet - providedNet),
        isValid: providedNet === 0 || Math.abs(calculatedNet - providedNet) < 1,
      },
    };

    // Use provided totals if available and close to calculated, otherwise use calculated
    const finalGross =
      validation.gross.isValid && providedGross > 0
        ? providedGross
        : calculatedGross;
    const finalDeductions =
      validation.deductions.isValid && providedDeductions > 0
        ? providedDeductions
        : calculatedDeductions;
    const finalNet =
      validation.net.isValid && providedNet > 0 ? providedNet : calculatedNet;

    return {
      gross: finalGross,
      totalDeductions: finalDeductions,
      net: finalNet,
      validation: validation,
    };
  };

  const parseDate = (dateStr) => {
    if (!dateStr) return new Date().toISOString().slice(0, 10);

    // Clean the date string
    const cleanDate = dateStr.toString().trim();

    // Try common Indian date formats
    const formats = [
      {
        regex: /(\d{2})[-/](\d{2})[-/](\d{4})/,
        handler: (match) => `${match[3]}-${match[2]}-${match[1]}`,
      }, // DD-MM-YYYY
      {
        regex: /(\d{4})[-/](\d{2})[-/](\d{2})/,
        handler: (match) => `${match[1]}-${match[2]}-${match[3]}`,
      }, // YYYY-MM-DD
      {
        regex: /(\d{1,2})\s+(\w+)\s+(\d{4})/,
        handler: (match) => {
          const months = {
            jan: "01",
            feb: "02",
            mar: "03",
            apr: "04",
            may: "05",
            jun: "06",
            jul: "07",
            aug: "08",
            sep: "09",
            oct: "10",
            nov: "11",
            dec: "12",
          };
          const month = months[match[2].toLowerCase().slice(0, 3)];
          return month
            ? `${match[3]}-${month}-${match[1].padStart(2, "0")}`
            : null;
        },
      },
    ];

    for (const format of formats) {
      const match = cleanDate.match(format.regex);
      if (match) {
        const result = format.handler(match);
        if (result) {
          const date = new Date(result);
          if (!isNaN(date.getTime())) {
            return date.toISOString().slice(0, 10);
          }
        }
      }
    }

    return dateStr;
  };

  const parsePayPeriod = (periodStr) => {
    if (!periodStr) return "";

    const cleanPeriod = periodStr.toString().trim();

    const months = {
      jan: "01",
      feb: "02",
      mar: "03",
      apr: "04",
      may: "05",
      jun: "06",
      jul: "07",
      aug: "08",
      sep: "09",
      oct: "10",
      nov: "11",
      dec: "12",
      january: "01",
      february: "02",
      march: "03",
      april: "04",
      june: "06",
      july: "07",
      august: "08",
      september: "09",
      october: "10",
      november: "11",
      december: "12",
    };

    // Try to extract month and year
    let match = cleanPeriod.toLowerCase().match(/([a-z]+)[-\/\s]?(\d{2,4})/);
    if (match) {
      const monthKey = match[1].toLowerCase();
      const month = months[monthKey];
      let year = match[2];
      if (month && year) {
        if (year.length === 2) {
          year = `20${year}`;
        }
        return `${year}-${month}`;
      }
    }

    // Try MM-YYYY format
    let mmYYYY = cleanPeriod.match(/(\d{2})[-/](\d{4})/);
    if (mmYYYY) {
      return `${mmYYYY[2]}-${mmYYYY[1]}`;
    }

    // Try YYYY-MM format
    let yyyyMM = cleanPeriod.match(/(\d{4})[-/](\d{2})/);
    if (yyyyMM) {
      return `${yyyyMM[1]}-${yyyyMM[2]}`;
    }

    return cleanPeriod;
  };

  const createEmployeeFromCSV = (row, headers, index) => {
    // Process columns - pass columnOverrides
    const categories = processCSVColumns(headers, row, columnOverrides);

    // Calculate totals
    const totals = calculatePayrollTotals(categories);

    // Extract employee info - Try multiple name field variations
    const employeeName =
      categories.info["employee name"] ||
      categories.info["name"] ||
      categories.info["employee"] ||
      categories.info["full name"] ||
      categories.info["fname"] ||
      categories.info["first name"] ||
      categories.info["fullname"] ||
      categories.info["employeename"] ||
      categories.info["employee_name"] ||
      categories.info["emp_name"] ||
      categories.info["empl name"] ||
      `Employee ${index + 1}`;

    const employeeId =
      categories.info["employee id"] ||
      categories.info["employee_id"] ||
      categories.info["employee"] ||
      categories.info["id"] ||
      categories.info["code"] ||
      categories.info["employeeid"] ||
      categories.info["emp id"] ||
      categories.info["empid"] ||
      `EMP${String(employees.length + index + 1).padStart(4, "0")}`;

    // Get UAN (Universal Account Number)
    const uan =
      categories.info["uan"] ||
      categories.info["uancertificate"] ||
      categories.info["universal account number"] ||
      "";

    // Get paid days and LOP days - check multiple variations
    const paidDays = parseFloat(
      categories.info["paid days"] ||
        categories.info["paiddays"] ||
        categories.info["paid"] ||
        categories.info["days"] ||
        0,
    );

    const lossOfPayDays = parseFloat(
      categories.info["lop days"] ||
        categories.info["lopdays"] ||
        categories.info["lop"] ||
        categories.info["loss of paid days"] ||
        categories.info["loss of pay days"] ||
        categories.info["lossofpaiddays"] ||
        categories.info["lossofpay"] ||
        categories.info["loss"] ||
        categories.info["unpaid days"] ||
        categories.info["unpaid"] ||
        categories.info["ncp days"] ||
        categories.info["ncpdays"] ||
        categories.info["ncp"] ||
        categories.info["non calculated days"] ||
        categories.info["non calculated period"] ||
        categories.info["noncalculated"] ||
        0,
    );

    // Get raw pay date and pay period values from the imported file
    const rawPayDateValue =
      categories.info["pay date"] ||
      categories.info["date"] ||
      categories.info["paydate"] ||
      "";
    const rawPayPeriodValue =
      categories.info["pay period"] ||
      categories.info["period"] ||
      categories.info["month"] ||
      "";

    // Parse values for internal use while preserving raw input for display
    const payDate = parseDate(rawPayDateValue);
    const payPeriod = parsePayPeriod(rawPayPeriodValue);

    return {
      id: `EMP-${Date.now()}-${index}`,
      employeeId: employeeId,
      name: employeeName,
      uan: uan,

      // Salary details
      rawPayDate: rawPayDateValue,
      rawPayPeriod: rawPayPeriodValue,
      payPeriod: payPeriod,
      paidDays: paidDays || 0,
      lossOfPayDays: lossOfPayDays || 0,
      payDate: payDate,

      // Dynamic earnings and deductions
      earnings: categories.earnings,
      deductions: categories.deductions,

      // Calculated totals
      gross: totals.gross,
      totalDeductions: totals.totalDeductions,
      net: totals.net,

      // Additional info
      department: categories.info["department"] || "General",
      designation: categories.info["designation"] || "Employee",
      email: categories.info["email"] || "",
      phone: categories.info["phone"] || categories.info["mobile"] || "",

      // Bank details
      bankName: categories.info["bank"] || categories.info["bank name"] || "",
      bankAccount:
        categories.info["account"] || categories.info["account number"] || "",
      bankIfsc: categories.info["ifsc"] || categories.info["ifsc code"] || "",
      panNumber: categories.info["pan"] || "",

      // Company details
      company: {
        name: company?.companyName || "Company",
        address: company?.address || "",
        cityPincode: company?.cityPincode || "",
        country: company?.country || "India",
        logoDataUrl: company?.logoDataUrl || "",
        panNumber: company?.panNumber || "",
        tanNumber: company?.tanNumber || "",
      },

      // Store validation info for debugging
      _validation: totals.validation,
    };
  };

  const handleFile = (file) => {
    setError("");
    setSuccess("");
    setFileName(file.name);
    setProcessing(true);
    setParsedData([]);
    setHeaders([]);
    setValidationWarnings([]);
    setPreviewData([]);

    // Check if it's an Excel file or CSV
    const isExcel =
      file.name.toLowerCase().endsWith(".xlsx") ||
      file.name.toLowerCase().endsWith(".xls") ||
      file.type ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.type === "application/vnd.ms-excel";

    if (isExcel) {
      // Handle Excel file
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = new ExcelJS.Workbook();
          await workbook.xlsx.load(data);
          const firstSheet = workbook.worksheets[0];

          // Convert worksheet to CSV format
          let csv = "";
          firstSheet.eachRow((row, rowNumber) => {
            const values = row.values.slice(1); // Remove first empty index
            csv +=
              values
                .map((v) => {
                  if (v === null || v === undefined) return "";
                  if (
                    typeof v === "string" &&
                    (v.includes(",") || v.includes('"'))
                  ) {
                    return '"' + v.replace(/"/g, '""') + '"';
                  }
                  return v;
                })
                .join(",") + "\n";
          });

          // Parse the CSV
          Papa.parse(csv, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: false,
            complete: (results) => {
              processFileResults(results);
            },
            error: (err) => {
              setProcessing(false);
              setError(`Parse error: ${err.message}`);
            },
          });
        } catch (err) {
          setProcessing(false);
          setError(`Failed to read Excel file: ${err.message}`);
        }
      };
      reader.onerror = () => {
        setProcessing(false);
        setError("Failed to read file");
      };
      reader.readAsArrayBuffer(file);
    } else {
      // Handle CSV file
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false,
        complete: (results) => {
          processFileResults(results);
        },
        error: (err) => {
          setProcessing(false);
          setError(`CSV parse error: ${err.message}`);
        },
      });
    }
  };

  const processFileResults = (results) => {
    setProcessing(false);

    if (results.errors.length > 0) {
      console.warn("Parse warnings:", results.errors);
    }

    if (!results.data || results.data.length === 0) {
      setError("File is empty or no data found");
      return;
    }

    // Clean the data first
    const cleanData = cleanCSVData(results.data);

    if (cleanData.length === 0) {
      setError(
        "No valid employee data found after cleaning. Check if file contains actual data rows.",
      );
      return;
    }

    // Get all headers and clean them
    const rawHeaders =
      results.meta.fields ||
      (cleanData.length > 0 ? Object.keys(cleanData[0]) : []);

    const cleanedHeaders = cleanHeaders(rawHeaders);

    if (cleanedHeaders.length === 0) {
      setError("No valid headers found in file");
      return;
    }

    const headerMap = rawHeaders.map((rawHeader, index) => ({
      raw: rawHeader,
      clean: cleanedHeaders[index] || rawHeader,
    }));

    setHeaders(cleanedHeaders);
    setHeaderMap(headerMap);

    // Analyze column types
    analyzeHeaders(cleanedHeaders);

    // Store parsed data for preview
    setParsedData(cleanData);

    // Create preview data
    const previewEmployees = cleanData.slice(0, 5).map((row, index) => {
      return createEmployeeFromCSV(row, headerMap, index);
    });

    setPreviewData(previewEmployees);

    // Log validation results for debugging
    const warnings = [];
    previewEmployees.forEach((emp, idx) => {
      if (emp._validation) {
        if (
          !emp._validation.gross.isValid &&
          emp._validation.gross.provided > 0
        ) {
          warnings.push(
            `Row ${idx + 1}: Gross mismatch (Provided: ${emp._validation.gross.provided}, Calculated: ${emp._validation.gross.calculated})`,
          );
        }
        if (
          !emp._validation.deductions.isValid &&
          emp._validation.deductions.provided > 0
        ) {
          warnings.push(
            `Row ${idx + 1}: Deductions mismatch (Provided: ${emp._validation.deductions.provided}, Calculated: ${emp._validation.deductions.calculated})`,
          );
        }
      }
    });

    if (warnings.length > 0) {
      setValidationWarnings(warnings);
    }

    // Show success message
    setSuccess(
      `Found ${cleanData.length} valid employee records after cleaning. Ready to import.`,
    );
  };

  const downloadTemplate = () => {
    // SIMPLE TEMPLATE - Only actual data columns
    const templateHeaders = [
      "UAN Number",
      "Employee ID",
      "Employee Name",
      "Designation",
      "Pay Period",
      "Pay Date",
      "Paid Days",
      "LOP Days",
      "Basic Pay",
      "House Rent Allowance",
      "Special Allowance",
      "Gross Earnings",
      "Income Tax",
      "Provident Fund",
      "Professional Tax",
      "Insurance",
      "Total Deductions",
    ];

    const sampleData = [
      "101411733970",
      "G20",
      "John Doe",
      "Software Engineer",
      "Jan-26",
      "31-01-2026",
      "22",
      "0",
      "50000",
      "20000",
      "3000",
      "73000",
      "5000",
      "1800",
      "200",
      "500",
      "7500",
    ];

    setToast({
      message: "Downloading CSV template...",
      type: "loading",
      duration: 0,
    });

    const csvContent = [
      templateHeaders.join(","),
      sampleData.join(","),
      "",
      "# SIMPLE PAYROLL TEMPLATE",
      "# Just fill in the data rows, no instructions in data columns",
      "# Delete any columns you don't need",
      "# LOP Days = Loss of Pay Days (reflects in both payslip AND PF ECR)",
      "# Paid Days = Days worked/paid (for payslip display)",
      "# Save as CSV and upload",
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "payroll_template.csv";
    a.click();
    window.URL.revokeObjectURL(url);

    setToast({
      message: "CSV template downloaded successfully!",
      type: "success",
      duration: 3000,
    });
  };

  const downloadExcelTemplate = async () => {
    setToast({
      message: "Downloading Excel template...",
      type: "loading",
      duration: 0,
    });

    // Create template data for Excel
    const templateHeaders = [
      "UAN Number",
      "Employee ID",
      "Employee Name",
      "Designation",
      "Pay Period",
      "Pay Date",
      "Paid Days",
      "LOP Days",
      "Basic Pay",
      "House Rent Allowance",
      "Special Allowance",
      "Gross Earnings",
      "Income Tax",
      "Provident Fund",
      "Professional Tax",
      "Insurance",
      "Total Deductions",
    ];

    const sampleData = [
      {
        "UAN Number": "101411733970",
        "Employee ID": "G20",
        "Employee Name": "John Doe",
        Designation: "Software Engineer",
        "Pay Period": "Jan-26",
        "Pay Date": "31-01-2026",
        "Paid Days": 22,
        "LOP Days": 0,
        "Basic Pay": 50000,
        "House Rent Allowance": 20000,
        "Special Allowance": 3000,
        "Gross Earnings": 73000,
        "Income Tax": 5000,
        "Provident Fund": 1800,
        "Professional Tax": 200,
        Insurance: 500,
        "Total Deductions": 7500,
      },
      {
        "UAN Number": "",
        "Employee ID": "EMP001",
        "Employee Name": "Jane Smith",
        Designation: "Associate",
        "Pay Period": "Feb-26",
        "Pay Date": "28-02-2026",
        "Paid Days": 22,
        "LOP Days": 0,
        "Basic Pay": 50000,
        "House Rent Allowance": 20000,
        "Special Allowance": 0,
        "Gross Earnings": 70000,
        "Income Tax": 4000,
        "Provident Fund": 1800,
        "Professional Tax": 200,
        Insurance: 500,
        "Total Deductions": 6500,
      },
    ];

    // Create workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Payroll");

    // Add headers
    worksheet.addRow(templateHeaders);

    // Style header row
    worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1e40af" },
    };
    worksheet.getRow(1).alignment = {
      horizontal: "center",
      vertical: "center",
    };

    // Add sample data rows
    sampleData.forEach((row) => {
      worksheet.addRow(Object.values(row));
    });

    // Set column widths
    const colWidths = [
      15, 15, 18, 16, 12, 12, 12, 12, 12, 12, 18, 15, 12, 15, 15, 12, 15,
    ];
    worksheet.columns = worksheet.columns.map((col, idx) => ({
      width: colWidths[idx] || 12,
    }));

    // Add instructions sheet
    const instructionsSheet = workbook.addWorksheet("Instructions");
    instructionsSheet.addRow(["PAYROLL TEMPLATE - INSTRUCTIONS"]);
    instructionsSheet.addRow([]);
    instructionsSheet.addRow(["How to use this template:"]);
    instructionsSheet.addRow([
      "1. Fill in employee data in the rows below the sample",
    ]);
    instructionsSheet.addRow(["2. Keep all column headers exactly as shown"]);
    instructionsSheet.addRow(["3. Use DD-MM-YYYY format for Pay Date"]);
    instructionsSheet.addRow([
      "4. Use Month-YY format for Pay Period (e.g., Jan-26, Feb-26)",
    ]);
    instructionsSheet.addRow(["5. Leave UAN Number blank if not available"]);
    instructionsSheet.addRow(["6. Delete sample rows before uploading"]);
    instructionsSheet.addRow(["7. Save as .xlsx and upload to the system"]);
    instructionsSheet.addRow([]);
    instructionsSheet.addRow(["IMPORTANT FIELDS:"]);
    instructionsSheet.addRow([
      "- Paid Days = Days worked/paid (shown in payslip)",
    ]);
    instructionsSheet.addRow([
      "- LOP Days = Loss of Pay Days (shown in payslip AND used as NCP Days in PF ECR file)",
    ]);
    instructionsSheet.addRow([]);
    instructionsSheet.addRow(["COLUMN DESCRIPTIONS:"]);
    instructionsSheet.addRow(["- UAN Number: Universal Account Number for PF"]);
    instructionsSheet.addRow(["- Employee ID: Unique employee identifier"]);
    instructionsSheet.addRow(["- Employee Name: Full name of employee"]);
    instructionsSheet.addRow([
      "- Pay Period: Month and year (Jan-26, Feb-26, etc.)",
    ]);
    instructionsSheet.addRow(["- Pay Date: Payment date (DD-MM-YYYY format)"]);
    instructionsSheet.addRow([
      "- Paid Days: Number of days worked/paid (shown in payslip)",
    ]);
    instructionsSheet.addRow([
      "- LOP Days: Loss of Pay Days (shown in payslip AND as NCP in ECR)",
    ]);
    instructionsSheet.addRow(["- Basic Pay: Base salary amount"]);
    instructionsSheet.addRow(["- HRA: House Rent Allowance"]);
    instructionsSheet.addRow([
      "- Designation: Employee job title / designation",
    ]);
    instructionsSheet.addRow([
      "- Special Allowance: Any additional allowances",
    ]);
    instructionsSheet.addRow(["- Gross Earnings: Total of all earnings"]);
    instructionsSheet.addRow(["- Income Tax: Tax deduction"]);
    instructionsSheet.addRow(["- Provident Fund: PF contribution"]);
    instructionsSheet.addRow(["- Professional Tax: PT deduction"]);
    instructionsSheet.addRow(["- Insurance: Insurance premium deduction"]);
    instructionsSheet.addRow(["- Total Deductions: Sum of all deductions"]);

    instructionsSheet.columns = [{ width: 80 }];

    // Generate file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "payroll_template.xlsx";
    link.click();
    URL.revokeObjectURL(url);

    setToast({
      message: "Excel template downloaded successfully!",
      type: "success",
      duration: 3000,
    });
  };

  const handleImport = () => {
    if (parsedData.length === 0) {
      setError("Please upload a CSV file first");
      return;
    }

    const processedEmployees = parsedData.map((row, index) => {
      return createEmployeeFromCSV(
        row,
        headerMap.length > 0
          ? headerMap
          : headers.map((h) => ({ raw: h, clean: h })),
        index,
      );
    });

    const validEmployees = processedEmployees.filter(
      (emp) => emp.name && emp.earnings.length > 0,
    );

    if (validEmployees.length > 0) {
      setEmployees((prev) => [...prev, ...validEmployees]);
      setSuccess(`Successfully imported ${validEmployees.length} employees`);
      setParsedData([]);
      setFileName("");
      setHeaders([]);
      setValidationWarnings([]);
      setPreviewData([]);
    } else {
      setError("No valid employees found to import");
    }
  };

  const handleClear = () => {
    setFileName("");
    setParsedData([]);
    setHeaders([]);
    setValidationWarnings([]);
    setPreviewData([]);
    setError("");
    setSuccess("");
  };

  return (
    <div className="csv-upload-page">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <div className="page-header">
        <div>
          <h1>CSV & Excel Import</h1>
          <p>Upload CSV or Excel files with employee payroll data</p>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <button className="btn btn-primary" onClick={downloadExcelTemplate}>
            <Download size={16} />
            Download Excel Template
          </button>
          <button className="btn btn-secondary" onClick={downloadTemplate}>
            <Download size={16} />
            Download CSV Template
          </button>
        </div>
      </div>

      <div className="upload-section">
        <div className="upload-card">
          <div className="upload-header">
            <FileSpreadsheet size={48} />
            <h3>CSV & Excel Import</h3>
            <p>
              Upload CSV or Excel files with payroll data (only data rows, no
              instructions)
            </p>
          </div>

          {error && (
            <div className="error-message">
              <AlertCircle size={16} />
              <span>{error}</span>
              <button onClick={handleClear} className="close-btn">
                <X size={16} />
              </button>
            </div>
          )}

          {success && (
            <div className="success-message">
              <Check size={16} />
              <span>{success}</span>
            </div>
          )}

          {validationWarnings.length > 0 && (
            <div className="warning-message">
              <AlertCircle size={16} />
              <div>
                <strong>Validation Notes:</strong>
                <ul className="validation-list">
                  {validationWarnings.map((warning, idx) => (
                    <li key={idx}>{warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <div className="upload-area">
            <div className="file-upload-container">
              {fileName ? (
                <div className="file-selected">
                  <FileSpreadsheet size={24} />
                  <div>
                    <p>
                      <strong>Selected file:</strong> {fileName}
                    </p>
                    <p>
                      <strong>Valid records:</strong> {parsedData.length}
                    </p>
                    {headers.length > 0 && (
                      <p>
                        <strong>Columns detected:</strong> {headers.length}
                      </p>
                    )}
                    <div className="action-buttons">
                      <button className="btn-text" onClick={handleClear}>
                        Clear & Upload New
                      </button>
                      <button
                        className="btn btn-primary"
                        onClick={handleImport}
                        disabled={processing}
                        style={{ marginLeft: "12px" }}
                      >
                        {processing
                          ? "Processing..."
                          : `Import ${parsedData.length} Employees`}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <label className="upload-zone">
                  <Upload size={32} />
                  <span className="upload-title">Upload CSV or Excel File</span>
                  <span className="file-hint">
                    CSV (.csv) or Excel (.xlsx, .xls) - only data rows, no
                    instructions
                  </span>

                  <div className="upload-button-wrapper">
                    <span className="btn btn-primary">
                      <Upload size={16} />
                      Choose File
                    </span>
                    <input
                      type="file"
                      id="csv-upload-input"
                      accept=".csv,.xlsx,.xls"
                      onChange={(e) => {
                        const f = e.target.files && e.target.files[0];
                        if (!f) return;

                        if (f.size > 10 * 1024 * 1024) {
                          setError("File size should be less than 10MB");
                          return;
                        }

                        handleFile(f);
                      }}
                      style={{ display: "none" }}
                    />
                  </div>
                </label>
              )}
            </div>
          </div>

          {headers.length > 0 && (
            <div className="template-section">
              <h4>Detected Columns ({headers.length})</h4>
              <div
                style={{
                  fontSize: "13px",
                  color: "var(--text-light)",
                  marginBottom: "16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span>
                  💡 Tip: Drag columns between sections to reclassify them
                </span>
              </div>

              {/* Three Column Layout for Info, Earnings, and Deductions */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "20px",
                  marginBottom: "20px",
                }}
              >
                {/* Info & Other Fields Section */}
                <div
                  className="columns-group columns-section"
                  onDragOver={(e) => handleDragOver(e, "info")}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDropOnCategory(e, "info")}
                  style={{
                    borderRadius: "12px",
                    padding: "16px",
                    background:
                      dragOverCategory === "info"
                        ? "rgba(251, 191, 36, 0.15)"
                        : "var(--background)",
                    border:
                      dragOverCategory === "info"
                        ? "2px dashed #f59e0b"
                        : "1px solid var(--border)",
                    transition: "all 0.2s ease",
                    minHeight: "400px",
                  }}
                >
                  <div className="group-title">👤 Info & Other Fields</div>
                  <div className="columns-grid-vertical">
                    {headers.map((header, idx) => {
                      const effectiveType = getEffectiveColumnType(header);
                      if (effectiveType !== "info" && effectiveType !== "other")
                        return null;

                      let bgColor = "#fef3c7";
                      let color = "#92400e";
                      let icon = "👤";

                      if (effectiveType === "other") {
                        bgColor = "#f3f4f6";
                        color = "#666";
                        icon = "📄";
                      }

                      const isOverridden =
                        columnOverrides[header] !== undefined;

                      return (
                        <div
                          key={idx}
                          draggable
                          onDragStart={(e) => handleDragStart(e, header)}
                          style={{
                            padding: "12px",
                            background: bgColor,
                            borderRadius: "8px",
                            fontSize: "13px",
                            border: `2px solid ${color}40`,
                            transition: "all 0.2s ease",
                            cursor: "grab",
                            opacity: draggedColumn === header ? 0.5 : 1,
                            transform:
                              draggedColumn === header
                                ? "scale(0.95)"
                                : "scale(1)",
                            position: "relative",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.boxShadow =
                              "0 4px 12px rgba(0,0,0,0.15)")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.boxShadow = "none")
                          }
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                            }}
                          >
                            <span style={{ fontSize: "16px" }}>{icon}</span>
                            <div style={{ flex: 1 }}>
                              <strong style={{ color: color }}>{header}</strong>
                              <div
                                style={{
                                  fontSize: "11px",
                                  color: color,
                                  fontWeight: "bold",
                                }}
                              >
                                {effectiveType === "info" ? "Info" : "Other"}{" "}
                                {isOverridden && (
                                  <span style={{ color: "#f59e0b" }}>
                                    (moved)
                                  </span>
                                )}
                              </div>
                            </div>
                            {isOverridden && (
                              <button
                                onClick={() => resetColumnOverride(header)}
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: color,
                                  cursor: "pointer",
                                  padding: "4px",
                                  fontSize: "16px",
                                }}
                                title="Reset to auto-detected type"
                              >
                                ↩️
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Earnings Section */}
                <div
                  className="columns-group"
                  onDragOver={(e) => handleDragOver(e, "earning")}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDropOnCategory(e, "earning")}
                  style={{
                    borderRadius: "12px",
                    padding: "16px",
                    background:
                      dragOverCategory === "earning"
                        ? "rgba(34, 197, 94, 0.15)"
                        : "transparent",
                    border:
                      dragOverCategory === "earning"
                        ? "2px dashed #22c55e"
                        : "transparent",
                    transition: "all 0.2s ease",
                  }}
                >
                  <div className="group-title">💰 Earnings Columns</div>
                  <div className="columns-grid">
                    {headers.map((header, idx) => {
                      const effectiveType = getEffectiveColumnType(header);
                      if (effectiveType !== "earning") return null;

                      const isOverridden =
                        columnOverrides[header] !== undefined;

                      return (
                        <div
                          key={idx}
                          draggable
                          onDragStart={(e) => handleDragStart(e, header)}
                          style={{
                            padding: "12px",
                            background: "#d1fae5",
                            borderRadius: "8px",
                            fontSize: "13px",
                            border: "2px solid #6ee7b740",
                            transition: "all 0.2s ease",
                            cursor: "grab",
                            opacity: draggedColumn === header ? 0.5 : 1,
                            transform:
                              draggedColumn === header
                                ? "scale(0.95)"
                                : "scale(1)",
                            position: "relative",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.boxShadow =
                              "0 4px 12px rgba(0,0,0,0.15)")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.boxShadow = "none")
                          }
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                            }}
                          >
                            <span style={{ fontSize: "16px" }}>💰</span>
                            <div style={{ flex: 1 }}>
                              <strong style={{ color: "#065f46" }}>
                                {header}
                              </strong>
                              <div
                                style={{
                                  fontSize: "11px",
                                  color: "#065f46",
                                  fontWeight: "bold",
                                }}
                              >
                                Earning{" "}
                                {isOverridden && (
                                  <span style={{ color: "#f59e0b" }}>
                                    (moved)
                                  </span>
                                )}
                              </div>
                            </div>
                            {isOverridden && (
                              <button
                                onClick={() => resetColumnOverride(header)}
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "#065f46",
                                  cursor: "pointer",
                                  padding: "4px",
                                  fontSize: "16px",
                                }}
                                title="Reset to auto-detected type"
                              >
                                ↩️
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Deductions Section */}
                <div
                  className="columns-group"
                  onDragOver={(e) => handleDragOver(e, "deduction")}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDropOnCategory(e, "deduction")}
                  style={{
                    borderRadius: "12px",
                    padding: "16px",
                    background:
                      dragOverCategory === "deduction"
                        ? "rgba(239, 68, 68, 0.15)"
                        : "transparent",
                    border:
                      dragOverCategory === "deduction"
                        ? "2px dashed #ef4444"
                        : "transparent",
                    transition: "all 0.2s ease",
                  }}
                >
                  <div className="group-title">📉 Deductions Columns</div>
                  <div className="columns-grid">
                    {headers.map((header, idx) => {
                      const effectiveType = getEffectiveColumnType(header);
                      if (effectiveType !== "deduction") return null;

                      const isOverridden =
                        columnOverrides[header] !== undefined;

                      return (
                        <div
                          key={idx}
                          draggable
                          onDragStart={(e) => handleDragStart(e, header)}
                          style={{
                            padding: "12px",
                            background: "#fee2e2",
                            borderRadius: "8px",
                            fontSize: "13px",
                            border: "2px solid #fca5a540",
                            transition: "all 0.2s ease",
                            cursor: "grab",
                            opacity: draggedColumn === header ? 0.5 : 1,
                            transform:
                              draggedColumn === header
                                ? "scale(0.95)"
                                : "scale(1)",
                            position: "relative",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.boxShadow =
                              "0 4px 12px rgba(0,0,0,0.15)")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.boxShadow = "none")
                          }
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                            }}
                          >
                            <span style={{ fontSize: "16px" }}>📉</span>
                            <div style={{ flex: 1 }}>
                              <strong style={{ color: "#991b1b" }}>
                                {header}
                              </strong>
                              <div
                                style={{
                                  fontSize: "11px",
                                  color: "#991b1b",
                                  fontWeight: "bold",
                                }}
                              >
                                Deduction{" "}
                                {isOverridden && (
                                  <span style={{ color: "#f59e0b" }}>
                                    (moved)
                                  </span>
                                )}
                              </div>
                            </div>
                            {isOverridden && (
                              <button
                                onClick={() => resetColumnOverride(header)}
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "#991b1b",
                                  cursor: "pointer",
                                  padding: "4px",
                                  fontSize: "16px",
                                }}
                                title="Reset to auto-detected type"
                              >
                                ↩️
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {previewData.length > 0 && (
            <div className="data-preview">
              <h4>Preview (First {Math.min(previewData.length, 3)} records)</h4>

              {/* Validation Summary */}
              {(() => {
                const validationIssues = [];
                previewData.forEach((emp, idx) => {
                  const earningsTotal = emp.earnings.reduce(
                    (sum, e) => sum + e.amount,
                    0,
                  );
                  const deductionsTotal = emp.deductions.reduce(
                    (sum, d) => sum + d.amount,
                    0,
                  );
                  const calculatedNet = earningsTotal - deductionsTotal;

                  if (emp.gross && emp.gross !== earningsTotal) {
                    validationIssues.push(
                      `Row ${idx + 1} (${emp.name}): Gross mismatch - CSV shows ₹${emp.gross.toLocaleString()}, but earnings sum to ₹${earningsTotal.toLocaleString()}`,
                    );
                  }
                  if (emp.net && emp.net !== calculatedNet) {
                    validationIssues.push(
                      `Row ${idx + 1} (${emp.name}): Net mismatch - CSV shows ₹${emp.net.toLocaleString()}, but should be ₹${calculatedNet.toLocaleString()}`,
                    );
                  }
                });

                return (
                  validationIssues.length > 0 && (
                    <div
                      style={{
                        background:
                          "linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)",
                        border: "2px solid #fca5a5",
                        borderRadius: "8px",
                        padding: "12px",
                        marginBottom: "16px",
                        color: "#991b1b",
                      }}
                    >
                      <div
                        style={{
                          fontWeight: "bold",
                          marginBottom: "8px",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <span>⚠️ Validation Issues Found</span>
                      </div>
                      <ul
                        style={{
                          margin: "0",
                          paddingLeft: "20px",
                          fontSize: "13px",
                          lineHeight: "1.6",
                        }}
                      >
                        {validationIssues.map((issue, idx) => (
                          <li key={idx}>{issue}</li>
                        ))}
                      </ul>
                    </div>
                  )
                );
              })()}

              <div className="preview-table">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>ID</th>
                      <th>Paid Days</th>
                      <th>LOP Days</th>
                      <th>Earnings</th>
                      <th>Deductions</th>
                      <th>Gross</th>
                      <th>Net</th>
                      <th>Validation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.slice(0, 3).map((emp, index) => {
                      const earningsTotal = emp.earnings.reduce(
                        (sum, e) => sum + e.amount,
                        0,
                      );
                      const deductionsTotal = emp.deductions.reduce(
                        (sum, d) => sum + d.amount,
                        0,
                      );
                      const calculatedNet = earningsTotal - deductionsTotal;

                      // Validation checks
                      const grossMismatch =
                        emp.gross && emp.gross !== earningsTotal;
                      const deductionsMismatch =
                        emp.deductions &&
                        emp.deductions.length > 0 &&
                        emp.totalDeductions !== deductionsTotal;
                      const netMismatch = emp.net && emp.net !== calculatedNet;

                      const hasIssue =
                        grossMismatch || deductionsMismatch || netMismatch;

                      return (
                        <tr
                          key={index}
                          style={{
                            background: hasIssue
                              ? "rgba(239, 68, 68, 0.08)"
                              : "transparent",
                          }}
                        >
                          <td>
                            <strong>{emp.name}</strong>
                          </td>
                          <td>{emp.employeeId}</td>
                          <td>{emp.paidDays}</td>
                          <td>{emp.lossOfPayDays}</td>
                          <td>
                            <div style={{ fontSize: "12px", color: "#065f46" }}>
                              {emp.earnings.length} items
                              <div style={{ fontSize: "11px", color: "#666" }}>
                                Basic: ₹
                                {emp.earnings.find((e) =>
                                  e.label.toLowerCase().includes("basic"),
                                )?.amount || 0}
                              </div>
                            </div>
                          </td>
                          <td>
                            <div style={{ fontSize: "12px", color: "#991b1b" }}>
                              {emp.deductions.length} items
                            </div>
                          </td>
                          <td>
                            <div>₹{emp.gross.toLocaleString()}</div>
                            {grossMismatch && (
                              <div
                                style={{
                                  fontSize: "11px",
                                  color: "#dc2626",
                                  marginTop: "4px",
                                  fontWeight: "bold",
                                }}
                              >
                                📌 Calculated: ₹{earningsTotal.toLocaleString()}
                              </div>
                            )}
                          </td>
                          <td>
                            <div>
                              <strong>₹{emp.net.toLocaleString()}</strong>
                            </div>
                            {netMismatch && (
                              <div
                                style={{
                                  fontSize: "11px",
                                  color: "#dc2626",
                                  marginTop: "4px",
                                  fontWeight: "bold",
                                }}
                              >
                                📌 Should be: ₹{calculatedNet.toLocaleString()}
                              </div>
                            )}
                          </td>
                          <td>
                            {!hasIssue ? (
                              <div
                                style={{
                                  color: "#059669",
                                  fontWeight: "bold",
                                  fontSize: "12px",
                                }}
                              >
                                ✅ OK
                              </div>
                            ) : (
                              <div
                                style={{
                                  color: "#dc2626",
                                  fontWeight: "bold",
                                  fontSize: "12px",
                                }}
                              >
                                <div>⚠️ Mismatch</div>
                                {grossMismatch && (
                                  <div
                                    style={{
                                      fontSize: "10px",
                                      marginTop: "4px",
                                      color: "#dc2626",
                                    }}
                                  >
                                    Gross mismatch
                                  </div>
                                )}
                                {netMismatch && (
                                  <div
                                    style={{
                                      fontSize: "10px",
                                      marginTop: "4px",
                                      color: "#dc2626",
                                    }}
                                  >
                                    Net mismatch
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="instructions">
            <h4>📋 IMPORTANT: How to Prepare Your File</h4>
            <div className="instructions-card">
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                  gap: "15px",
                }}
              >
                <div>
                  <strong style={{ color: "#0369a1" }}>
                    ✅ Things to Know:
                  </strong>
                  <ul style={{ margin: "8px 0 8px 20px", color: "#0369a1" }}>
                    <li>
                      <strong>CSV Files</strong> (.csv) - Excel or Google Sheets
                      format
                    </li>
                    <li>Upload only data rows, no instructions</li>
                    <li>
                      {" "}
                      Go to last payslip to verify All data imported in preview
                      page{" "}
                    </li>
                    <li>
                      We drag and drop the fields data from gross to deductions
                      information vise versa
                    </li>
                    <li>Call 7671939740 to get assistance</li>
                  </ul>
                </div>

                <div>
                  <strong style={{ color: "#dc2626" }}>
                    ❌ WHAT TO AVOID:
                  </strong>
                  <ul style={{ margin: "8px 0 8px 20px", color: "#dc2626" }}>
                    <li>Don't mix template text with data</li>
                    <li>Don't leave empty rows with placeholders</li>
                    <li>Don't use merged cells</li>
                    <li>Dont download without Going to see last Payslip</li>
                  </ul>
                </div>
              </div>

              <div
                style={{
                  marginTop: "15px",
                  padding: "12px",
                  background: "#fef3c7",
                  borderRadius: "6px",
                  borderLeft: "4px solid #f59e0b",
                }}
              >
                <strong>🛠️ Quick Preparation Steps:</strong>
                <ol style={{ margin: "8px 0 0 20px" }}>
                  <li>Open your CSV or Excel file</li>
                  <li>Delete ALL rows with instructions or placeholder data</li>
                  <li>Keep ONLY rows with actual employee data</li>
                  <li>
                    Save the file (no need to convert Excel to CSV - we handle
                    both!)
                  </li>
                  <li>Upload and we'll auto-detect the format</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
