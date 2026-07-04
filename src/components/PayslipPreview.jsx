import React, { useRef, useState, useEffect } from "react";
import "../payslip.css";
import { computeSalary } from "../utils/salary";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import Toast from "./Toast";

/*
  WYSIWYG PDF export using html2canvas -> jsPDF
  - Captures each on-screen payslip element to a high-res image
  - Inserts that image into an A4 PDF page
  - Supports single PDF download and bulk ZIP of PDFs
*/

function formatINR(n) {
  const num = Number(n);
  if (Number.isNaN(num)) return "₹0.00";
  return (
    "₹" +
    num.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function formatDate(d) {
  if (!d) return "-";
  const value = typeof d === "string" ? d.trim() : String(d);

  let dt;
  const ymdMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const dmyMatch = value.match(/^(\d{2})-(\d{2})-(\d{4})$/);

  if (dmyMatch) {
    dt = new Date(
      Number(dmyMatch[3]),
      Number(dmyMatch[2]) - 1,
      Number(dmyMatch[1]),
    );
  } else if (ymdMatch) {
    dt = new Date(
      Number(ymdMatch[1]),
      Number(ymdMatch[2]) - 1,
      Number(ymdMatch[3]),
    );
  } else {
    dt = new Date(value);
  }

  if (Number.isNaN(dt.getTime())) return value;
  return dt.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/* Create a jsPDF doc from a DOM element (returns blob)
   options: { format: 'a4'|'a3'|'letter', orientation: 'portrait'|'landscape', scale: number }
*/
async function elementToPdfBlob(element, options = {}) {
  const { format = "a4", orientation = "portrait", scale = 2 } = options;

  // Clone the element so we can strip UI controls before capturing
  const cloned = element.cloneNode(true);

  // Remove/hide elements not intended for export
  if (cloned.querySelectorAll) {
    cloned.querySelectorAll(".no-export").forEach((el) => {
      el.style.display = "none";
    });
  }

  // Place clone offscreen so computed styles still apply when html2canvas renders it
  const wrapper = document.createElement("div");
  wrapper.style.position = "fixed";
  wrapper.style.left = "-9999px";
  wrapper.style.top = "0";
  // make the wrapper wide enough for high-res capture
  wrapper.style.width = element.offsetWidth + "px";
  wrapper.style.height = element.offsetHeight + "px";
  wrapper.appendChild(cloned);
  document.body.appendChild(wrapper);

  try {
    // use requested scale for better quality/size
    const canvas = await html2canvas(cloned, {
      scale: Math.max(2, scale),
      useCORS: true,
      backgroundColor: null,
    });
    const imgData = canvas.toDataURL("image/png");

    // Create PDF with requested page format and orientation
    const pdf = new jsPDF({ unit: "pt", format, orientation });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Image dimensions (scale to fit within page margins)
    const imgProps = pdf.getImageProperties(imgData);
    const imgWidth = pageWidth - 80; // leave margins
    const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

    // If content height is taller than page, scale to fit height instead
    let finalWidth = imgWidth;
    let finalHeight = imgHeight;
    if (imgHeight > pageHeight - 80) {
      finalHeight = pageHeight - 80;
      finalWidth = (imgProps.width * finalHeight) / imgProps.height;
    }

    const x = (pageWidth - finalWidth) / 2;
    const y = 40;

    pdf.addImage(
      imgData,
      "PNG",
      x,
      y,
      finalWidth,
      finalHeight,
      undefined,
      "FAST",
    );

    // return blob for zipping or further processing
    return pdf.output("blob");
  } finally {
    // always remove helper wrapper
    document.body.removeChild(wrapper);
  }
}

export default function PayslipPreview({
  // Backwards-compatible props: pass `employees` (array) OR a single `employee` + explicit `earnings`, `deductions`, `payPeriod`
  employees = [],
  employee = null,
  earnings: propEarnings = [],
  deductions: propDeductions = [],
  payPeriod: propPayPeriod = null,
  company = {},

  // PDF export options (defaults increased to produce larger PDF pages)
  pdfFormat = "a3",
  pdfOrientation = "portrait",
  pdfScale = 3,
}) {
  // Helper to normalize/display earning/deduction labels
  const displayLabel = (label) => {
    if (!label && label !== 0) return "";
    const str = String(label).trim();
    if (/^hra$/i.test(str) || /house\s*rent/i.test(str))
      return "House Rent Allowance";
    return label;
  };
  // decide the list of items to render. Prefer explicit `employee` when provided, otherwise render `employees` array
  const items = employee
    ? [
        {
          ...employee,
          earnings: propEarnings.length
            ? propEarnings
            : employee.earnings || [],
          deductions: propDeductions.length
            ? propDeductions
            : employee.deductions || [],
          payPeriod: propPayPeriod || employee.payPeriod || employee.month,
        },
      ]
    : employees;

  // refs for each payslip element so we can capture them
  const refs = useRef([]);

  // Toast notification state
  const [toast, setToast] = useState(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showDownloadPopup, setShowDownloadPopup] = useState(false);

  useEffect(() => {
    const container = document.querySelector(".main-content");
    const handleScroll = () => {
      if (container) {
        setShowScrollTop(container.scrollTop > 300);
      } else {
        setShowScrollTop(window.pageYOffset > 300);
      }
    };

    if (container) {
      container.addEventListener("scroll", handleScroll, { passive: true });
      handleScroll();
      return () => container.removeEventListener("scroll", handleScroll);
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // ensure refs array length matches items
  refs.current = items.map((_, i) => refs.current[i] ?? React.createRef());

  const downloadSingle = async (index) => {
    const el = refs.current[index]?.current;
    if (!el) {
      setToast({ message: "Payslip element not found", type: "error" });
      return;
    }

    setToast({
      message: "Downloading payslip...",
      type: "loading",
      duration: 0,
    });
    try {
      const blob = await elementToPdfBlob(el, {
        format: pdfFormat,
        orientation: pdfOrientation,
        scale: pdfScale,
      });
      const name = (
        items[index].name ||
        items[index].employeeName ||
        "payslip"
      ).toString();
      saveAs(blob, `${name.replace(/\s+/g, "_")}.pdf`);
      setToast({
        message: `Payslip downloaded successfully!`,
        type: "success",
        duration: 3000,
      });
    } catch (err) {
      console.error(err);
      setToast({
        message: `Failed to generate PDF: ${err.message}`,
        type: "error",
        duration: 4000,
      });
    }
  };

  const downloadAllZip = async () => {
    if (!items.length) {
      setToast({ message: "No employees to export", type: "error" });
      return;
    }

    setToast({
      message: "Downloading payslips... This may take a moment",
      type: "loading",
      duration: 0,
    });
    const zip = new JSZip();

    // generate sequentially to avoid heavy parallel memory use
    for (let i = 0; i < items.length; i++) {
      const el = refs.current[i]?.current;
      if (!el) continue;
      try {
        const blob = await elementToPdfBlob(el, {
          format: pdfFormat,
          orientation: pdfOrientation,
          scale: pdfScale,
        });
        const name = (
          items[i].name ||
          items[i].employeeName ||
          "payslip"
        ).toString();
        const fileName = `${name.replace(/\s+/g, "_")}.pdf`;
        zip.file(fileName, blob);
      } catch (err) {
        console.error("Error generating for", items[i], err);
      }
    }

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, "payslips.zip");
    setToast({
      message: "All payslips downloaded successfully!",
      type: "success",
      duration: 3000,
    });
  };

  const scrollToTop = () => {
    const container = document.querySelector(".main-content");
    if (container) {
      container.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const scrollToBottom = () => {
    const container = document.querySelector(".main-content");
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
    } else {
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    }
  };

  return (
    <div>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <div className="header">
        <div className="h-title">Payslip Preview</div>
        <div className="h-actions">
          <button
            className="btn btn-ghost"
            onClick={() => setShowDownloadPopup(true)}
          >
            Download All (ZIP)
          </button>
        </div>
      </div>

      {items.length === 0 && <div className="card">No employees found</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {items.map((raw, i) => {
          // merge provided earnings/deductions into the object so downstream code can treat it consistently
          const normalized = {
            ...raw,
            earnings: raw.earnings || [],
            deductions: raw.deductions || [],
            payPeriod: raw.payPeriod || raw.month,
          };

          const e = computeSalary(normalized);

          // Use global company info for payslips (employee-specific company data is not relevant for payslip display)
          const headerCompany = company;

          // compute friendly month display from pay period only (do not derive pay period from pay date)
          const monthDisplay =
            normalized.month ||
            (normalized.payPeriod
              ? normalized.payPeriod.match(/^\d{4}-\d{2}$/)
                ? new Date(`${normalized.payPeriod}-01`).toLocaleString(
                    "default",
                    { month: "long", year: "numeric" },
                  )
                : normalized.payPeriod
              : "Month not set");

          // tiny helper to convert net to words
          function numberToWords(amount) {
            const n = Number(amount);
            if (Number.isNaN(n)) return "-";

            const abs = Math.abs(Math.floor(n));
            if (abs === 0) return "Indian Rupee Zero Only";

            const units = [
              "",
              "One",
              "Two",
              "Three",
              "Four",
              "Five",
              "Six",
              "Seven",
              "Eight",
              "Nine",
              "Ten",
              "Eleven",
              "Twelve",
              "Thirteen",
              "Fourteen",
              "Fifteen",
              "Sixteen",
              "Seventeen",
              "Eighteen",
              "Nineteen",
            ];
            const tens = [
              "",
              "",
              "Twenty",
              "Thirty",
              "Forty",
              "Fifty",
              "Sixty",
              "Seventy",
              "Eighty",
              "Ninety",
            ];

            function inWords(num) {
              if (num < 20) return units[num];
              if (num < 100)
                return (
                  tens[Math.floor(num / 10)] +
                  (num % 10 ? " " + units[num % 10] : "")
                );
              if (num < 1000)
                return (
                  inWords(Math.floor(num / 100)) +
                  " Hundred" +
                  (num % 100 ? " " + inWords(num % 100) : "")
                );
              if (num < 100000)
                return (
                  inWords(Math.floor(num / 1000)) +
                  " Thousand" +
                  (num % 1000 ? " " + inWords(num % 1000) : "")
                );
              if (num < 10000000)
                return (
                  inWords(Math.floor(num / 100000)) +
                  " Lakh" +
                  (num % 100000 ? " " + inWords(num % 100000) : "")
                );
              return (
                inWords(Math.floor(num / 10000000)) +
                " Crore" +
                (num % 10000000 ? " " + inWords(num % 10000000) : "")
              );
            }

            const words = inWords(abs);
            const paise = Math.round(
              (Math.abs(n) - Math.floor(Math.abs(n))) * 100,
            );
            const paiseText = paise ? ` and ${paise}/100 Paise` : "";
            const prefix = n < 0 ? "Minus " : "";
            return `${prefix}Indian Rupee ${words}${paiseText} Only`;
          }

          // helper to render amounts and visually mute zeros
          const renderAmount = (amt) => {
            if (amt === 0 || Number(amt) === 0) {
              return <span className="muted-zero">{formatINR(amt)}</span>;
            }
            return formatINR(amt);
          };

          // Filter earnings and deductions: hide zero amounts except for whitelisted items
          const isWhitelistedEarning = (label) => {
            const lower = label.toLowerCase();
            return (
              lower.includes("house rent") ||
              lower.includes("hra") ||
              lower.includes("dearness") ||
              lower.includes("da")
            );
          };

          const isWhitelistedDeduction = (label) => {
            const lower = label.toLowerCase();
            return (
              lower.includes("income tax") ||
              lower.includes("provident fund") ||
              lower.includes("pf")
            );
          };

          const filteredEarnings = (normalized.earnings || []).filter(
            (item) => {
              if (item.amount > 0) return true;
              // Show zero amounts only if item label matches whitelist
              return isWhitelistedEarning(item.label);
            },
          );

          const filteredDeductions = (normalized.deductions || []).filter(
            (item) => {
              if (item.amount > 0) return true;
              // Show zero amounts only if item label matches whitelist
              return isWhitelistedDeduction(item.label);
            },
          );

          // render the on-screen payslip — this is what html2canvas will capture
          return (
            <div
              key={i}
              ref={(el) => (refs.current[i].current = el)}
              className="payslip"
              role="region"
              aria-labelledby={`payslip-${i}`}
            >
              <div className="payslip-header payslip-header-grid">
                {headerCompany?.logoDataUrl ? (
                  <div className="header-logo" aria-hidden="true">
                    <img
                      src={headerCompany.logoDataUrl}
                      alt="company logo"
                      className="logo-square"
                    />
                  </div>
                ) : (
                  <div className="header-logo" />
                )}

                <div className="header-center">
                  <div className="company-name single-line">
                    {headerCompany?.companyName ||
                      headerCompany?.name ||
                      "Company Name"}
                  </div>
                  <div className="company-address">
                    {[
                      headerCompany?.address,
                      headerCompany?.cityPincode || headerCompany?.city,
                      headerCompany?.country,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </div>
                </div>

                <div className="header-right">
                  <div className="month-block small-align">
                    <div className="month-label">Payslip For the Month</div>
                    <div className="month month-strong">{monthDisplay}</div>
                  </div>
                  {headerCompany?.logoSecondaryUrl ? (
                    <div className="brand-right no-print">
                      <img
                        src={headerCompany.logoSecondaryUrl}
                        alt="secondary logo"
                        className="logo-square-right"
                      />
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="header-hr" />

              <div className="summary-title">EMPLOYEE SUMMARY</div>

              <div className="summary-row">
                <div className="summary-left">
                  <div className="summary-item">
                    <div className="label">Employee Name</div>
                    <div className="value">{e.name || "-"}</div>
                  </div>
                  <div className="summary-item">
                    <div className="label">Employee ID</div>
                    <div className="value">{e.employeeId || e.id || "-"}</div>
                  </div>
                  {(() => {
                    const periodRaw =
                      e.rawPayPeriod ||
                      e.payPeriod ||
                      normalized.payPeriod ||
                      normalized.month ||
                      "";
                    let periodDisplay = "-";
                    if (periodRaw) {
                      if (/^\d{4}-\d{2}$/.test(periodRaw)) {
                        const d = new Date(`${periodRaw}-01`);
                        periodDisplay = d.toLocaleString("default", {
                          month: "long",
                          year: "numeric",
                        });
                      } else {
                        periodDisplay = periodRaw;
                      }
                    }
                    return (
                      <div className="summary-item">
                        <div className="label">Pay Period</div>
                        <div className="value">{periodDisplay}</div>
                      </div>
                    );
                  })()}
                  <div className="summary-item">
                    <div className="label">Pay Date</div>
                    <div className="value">
                      {formatDate(
                        e.rawPayDate || e.payDate || normalized.payDate || "",
                      )}
                    </div>
                  </div>
                  <div className="summary-item">
                    <div className="label">Designation</div>
                    <div className="value">
                      {e.designation || e.jobTitle || "-"}
                    </div>
                  </div>
                </div>

                <div className="summary-right">
                  <div className="small">Total Net Pay</div>
                  <div className="net-amount">
                    {formatINR(e.net || raw.net)}
                  </div>
                  <div className="meta-group">
                    <div className="meta-row">
                      <div className="meta-label">Paid Days</div>
                      <div className="meta-colon">:</div>
                      <div className="meta-value">
                        {normalized.paidDays ?? e.paidDays ?? "-"}
                      </div>
                    </div>
                    <div className="meta-row lop-row">
                      <div className="meta-label">LOP Days</div>
                      <div className="meta-colon">:</div>
                      <div className="meta-value">
                        {normalized.lossOfPayDays ?? e.lossOfPayDays ?? "-"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="earnings-deductions">
                <div className="ed-header">
                  <div>EARNINGS</div>
                  <div>AMOUNT</div>
                  <div>DEDUCTIONS</div>
                  <div>AMOUNT</div>
                </div>

                <div className="ed-body">
                  {Array.from({
                    length: Math.max(
                      filteredEarnings.length,
                      filteredDeductions.length,
                    ),
                  }).map((_, idx) => {
                    const earn = filteredEarnings[idx];
                    const ded = filteredDeductions[idx];
                    return (
                      <div className="ed-row" key={idx}>
                        <div>{earn ? displayLabel(earn.label) : ""}</div>
                        <div className="ed-amt">
                          {earn ? renderAmount(earn.amount) : ""}
                        </div>
                        <div>{ded ? displayLabel(ded.label) : ""}</div>
                        <div className="ed-amt">
                          {ded ? renderAmount(ded.amount) : ""}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="ed-foot ed-foot-grid">
                  <div className="gross-label">Gross Earnings</div>
                  <div className="gross-amount">
                    {renderAmount(normalized.gross ?? e.gross)}
                  </div>
                  <div className="deductions-label">Total Deductions</div>
                  <div className="deductions-amount">
                    {renderAmount(normalized.totalDeductions ?? e.deductions)}
                  </div>
                </div>
              </div>

              <div className="net-bar">
                <div className="desc">
                  Total Net Payable
                  <br />
                  <small className="muted">
                    Gross Earnings - Total Deductions
                  </small>
                </div>
                <div className="payable">
                  {formatINR(e.net ?? normalized.net)}
                </div>
              </div>

              <div className="amount-words">
                <span className="amount-words-label">Amount In Words:</span>
                <span className="amount-words-value">
                  {numberToWords(e.net ?? normalized.net)}
                </span>
              </div>

              <div className="footer-note">
                -- This is a system-generated document. --
              </div>

              <div className="payslip-actions no-export">
                <button
                  className="btn btn-primary no-export"
                  onClick={() => downloadSingle(i)}
                >
                  Download PDF
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {showScrollTop && (
        <button
          className="scroll-top-btn btn btn-secondary"
          onClick={scrollToTop}
        >
          Back to Top
        </button>
      )}
      {showDownloadPopup && (
        <div
          className="modal-overlay"
          onClick={() => setShowDownloadPopup(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Prepare for Download</h3>
            <p>
              To ensure all payslips are included in the ZIP, click "Go Down" to
              scroll to the bottom first.
            </p>
            <button
              className="btn btn-primary"
              onClick={() => {
                scrollToBottom();
                setTimeout(() => {
                  setShowDownloadPopup(false);
                  downloadAllZip();
                }, 2000);
              }}
            >
              Go Down and Download
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => setShowDownloadPopup(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
