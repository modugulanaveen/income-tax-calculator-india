import { useState, useCallback } from "react";
import { calculatePF, validatePFEntry, calculatePFTotals } from "../utils/pfCalculator";
import { parseCSVContent, parseECRContent } from "../utils/ecrFormatter";

/**
 * Custom hook for managing PF data
 * @returns {Object} PF data and methods
 */
export function usePFData() {
  const [pfData, setPFData] = useState([]);
  const [importedFileName, setImportedFileName] = useState("");
  const [errors, setErrors] = useState([]);
  const [success, setSuccess] = useState("");

  // Add or update a PF record
  const addPFRecord = useCallback(
    (record) => {
      const validation = validatePFEntry(record);
      if (!validation.valid) {
        return { success: false, errors: validation.errors };
      }

      const calculatedRecord = {
        ...record,
        ...calculatePF(record.grossWages),
      };

      // Check if UAN already exists (update) or add new
      const existingIndex = pfData.findIndex((r) => r.uan === record.uan);
      if (existingIndex >= 0) {
        const updated = [...pfData];
        updated[existingIndex] = calculatedRecord;
        setPFData(updated);
      } else {
        setPFData([...pfData, calculatedRecord]);
      }

      return { success: true };
    },
    [pfData]
  );

  // Delete a PF record by UAN
  const deletePFRecord = useCallback((uan) => {
    setPFData((prevData) => prevData.filter((record) => record.uan !== uan));
  }, []);

  // Import PF data from file content (CSV/TXT)
  const importPFData = useCallback((fileContent, fileName = "") => {
    try {
      setImportedFileName(fileName);

      // Try to parse as CSV
      const records = parseCSVContent(fileContent);

      if (records.length === 0) {
        return { success: false, error: "No valid records found in file" };
      }

      // Validate and calculate all records
      const validRecords = records
        .map((record) => {
          const validation = validatePFEntry(record);
          if (!validation.valid) {
            console.warn(`Skipping record due to errors: ${JSON.stringify(validation.errors)}`);
            return null;
          }

          return {
            ...record,
            ...calculatePF(record.grossWages),
          };
        })
        .filter((r) => r !== null);

      if (validRecords.length === 0) {
        return { success: false, error: "No valid records after validation" };
      }

      setPFData(validRecords);
      return {
        success: true,
        recordsCount: validRecords.length,
        message: `Imported ${validRecords.length} PF records`,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, []);

  // Clear all PF data
  const clearPFData = useCallback(() => {
    setPFData([]);
    setImportedFileName("");
  }, []);

  // Get PF data totals
  const getTotals = useCallback(() => {
    return calculatePFTotals(pfData);
  }, [pfData]);

  // Bulk update PF wages (if needed)
  const updateAllGrossWages = useCallback(
    (factor = 1) => {
      const updated = pfData.map((record) => {
        const newGross = record.grossWages * factor;
        return {
          ...record,
          grossWages: newGross,
          ...calculatePF(newGross),
        };
      });
      setPFData(updated);
    },
    [pfData]
  );

  return {
    pfData,
    setPFData,
    addPFRecord,
    deletePFRecord,
    importPFData,
    clearPFData,
    getTotals,
    updateAllGrossWages,
    importedFileName,
    errors,
    setErrors,
    success,
    setSuccess,
  };
}
