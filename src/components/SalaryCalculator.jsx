import React, { useMemo, useState } from "react";
import { PF_CONSTANTS } from "../constants/pfConstants";

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function formatRupee(value) {
  return currencyFormatter.format(value);
}

export default function SalaryCalculator() {
  const [ctc, setCtc] = useState(1200000);

  const {
    monthlyBasic,
    monthlyHra,
    monthlySpecial,
    monthlyGross,
    annualGross,
    employeePf,
    annualEmployeePf,
    employerEpf,
    employerEps,
    incomeTax,
    annualIncomeTax,
    pt,
    annualPt,
    totalDeductions,
    annualTotalDeductions,
    netSalary,
    annualNetSalary,
    annualEmployerPf,
  } = useMemo(() => {
    const annualCtc = Number(ctc) || 0;
    const annualBasic = annualCtc * 0.5;
    const annualHra = annualBasic * 0.5;
    const monthlyBasic = annualBasic / 12;
    const monthlyHra = annualHra / 12;

    // PF Wage Ceiling: ₹15,000/month
    const monthlyPfWage = Math.min(monthlyBasic, PF_CONSTANTS.WAGE_CEILING);
    const monthlyEmployeePf = Math.round(
      monthlyPfWage * PF_CONSTANTS.EPF_RATE_EMPLOYEE,
    );
    const annualEmployeePf = monthlyEmployeePf * 12;
    const annualEmployerPfContribution =
      Math.round(monthlyPfWage * PF_CONSTANTS.EPF_RATE_EMPLOYER) * 12;

    // Gross salary is computed as CTC minus employer PF contribution
    const annualGross = Math.max(annualCtc - annualEmployerPfContribution, 0);
    const monthlyGross = annualGross / 12;
    const annualSpecial = Math.max(annualGross - annualBasic - annualHra, 0);
    const monthlySpecial = annualSpecial / 12;

    const employerEps = Math.min(
      Math.round(monthlyPfWage * PF_CONSTANTS.EPS_RATE_EMPLOYER),
      PF_CONSTANTS.EPS_CAP,
    );
    const employerEpf = Math.max(
      0,
      Math.round(monthlyPfWage * PF_CONSTANTS.EPF_RATE_EMPLOYER) - employerEps,
    );

    const calculateIncomeTax = (taxableIncome) => {
      if (taxableIncome <= 1200000) {
        return 0;
      }

      let tax = 0;
      let remaining = taxableIncome;
      const slabs = [
        { limit: 400000, rate: 0 }, // Up to ₹4,00,000: 0%
        { limit: 400000, rate: 0.05 }, // ₹4,00,001 to ₹8,00,000: 5%
        { limit: 400000, rate: 0.1 }, // ₹8,00,001 to ₹12,00,000: 10%
        { limit: 400000, rate: 0.15 }, // ₹12,00,001 to ₹16,00,000: 15%
        { limit: 400000, rate: 0.2 }, // ₹16,00,001 to ₹20,00,000: 20%
        { limit: 400000, rate: 0.25 }, // ₹20,00,001 to ₹24,00,000: 25%
        { limit: Infinity, rate: 0.3 }, // Above ₹24,00,000: 30%
      ];

      for (const slab of slabs) {
        const taxable = Math.min(remaining, slab.limit);
        tax += taxable * slab.rate;
        remaining -= taxable;
        if (remaining <= 0) break;
      }

      return tax;
    };

    const standardDeduction = 75000;
    const annualTaxableIncome = Math.max(annualGross - standardDeduction, 0);
    const annualIncomeTaxBeforeRelief = calculateIncomeTax(annualTaxableIncome);
    const marginalReliefThreshold = 1200000;
    let annualTaxAfterRelief = annualIncomeTaxBeforeRelief;
    let annualMarginalRelief = 0;

    if (annualTaxableIncome > marginalReliefThreshold) {
      const excessIncome = annualTaxableIncome - marginalReliefThreshold;
      if (annualIncomeTaxBeforeRelief > excessIncome) {
        annualTaxAfterRelief = excessIncome;
        annualMarginalRelief =
          annualIncomeTaxBeforeRelief - annualTaxAfterRelief;
      }
    }

    const annualHealthEducationCess = annualTaxAfterRelief * 0.04;
    const annualIncomeTax = Math.ceil(
      annualTaxAfterRelief + annualHealthEducationCess,
    );
    const incomeTax = annualIncomeTax / 12;
    const pt = monthlyGross < 15000 ? 0 : monthlyGross <= 20000 ? 150 : 200;
    const annualPt = pt * 12;
    const totalDeductions = monthlyEmployeePf + pt + incomeTax;
    const annualTotalDeductions = annualEmployeePf + annualPt + annualIncomeTax;
    const netSalary = monthlyGross - totalDeductions;
    const annualNetSalary = netSalary * 12;

    return {
      monthlyBasic,
      monthlyHra,
      monthlySpecial,
      monthlyGross,
      annualGross,
      employeePf: monthlyEmployeePf,
      annualEmployeePf,
      employerEpf,
      employerEps,
      incomeTax,
      annualIncomeTax,
      pt,
      annualPt,
      totalDeductions,
      annualTotalDeductions,
      netSalary,
      annualNetSalary,
      annualEmployerPf: annualEmployerPfContribution,
    };
  }, [ctc]);

  return (
    <section
      style={{
        background: "#ffffff",
        border: "1px solid rgba(15, 23, 42, 0.08)",
        borderRadius: 20,
        boxShadow: "0 16px 40px rgba(15, 23, 42, 0.08)",
        padding: 24,
        marginBottom: 24,
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 18,
          marginBottom: 20,
        }}
      >
        <div style={{ minWidth: 260, flex: "1 1 320px" }}>
          <h2 style={{ margin: 0, fontSize: 24, lineHeight: 1.2 }}>
            Salary Calculator
          </h2>
          <p
            style={{
              margin: "10px 0 0",
              color: "#2563eb",
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            Enter your CTC here and quickly view basic, HRA, PF, tax, and net
            pay.
          </p>
          <p
            style={{
              margin: "10px 0 0",
              color: "#dc2626",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            Note: Employer PF does not appear in payslip.
          </p>
          <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 12 }}>
            Income tax (TDS u/s 192) on annual taxable income after ₹75,000
            standard deduction. Rebate u/s 87A applies if taxable ≤ ₹12L, and
            marginal relief is applied above ₹12L.
          </p>
        </div>

        <div style={{ minWidth: 220, flex: "1 1 220px" }}>
          <label
            htmlFor="ctc-input"
            style={{
              display: "block",
              marginBottom: 8,
              fontSize: 14,
              fontWeight: 600,
              color: "#0f172a",
            }}
          >
            Annual CTC
          </label>
          <input
            id="ctc-input"
            type="number"
            min="0"
            step="1000"
            value={ctc}
            onChange={(event) => setCtc(event.target.value)}
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: 12,
              border: "2px solid #2563eb",
              background: "#eff6ff",
              color: "#0f172a",
              fontSize: 16,
              outline: "none",
            }}
          />
        </div>
      </div>

      <div style={{ overflowX: "auto", marginTop: 16 }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            minWidth: 780,
            background: "#ffffff",
          }}
        >
          <thead>
            <tr style={{ background: "#fef3c7" }}>
              <th
                style={{
                  textAlign: "left",
                  padding: "14px 16px",
                  border: "1px solid #e2e8f0",
                  color: "#92400e",
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                Component
              </th>
              <th
                style={{
                  textAlign: "right",
                  padding: "14px 16px",
                  border: "1px solid #e2e8f0",
                  color: "#92400e",
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                Per month
              </th>
              <th
                style={{
                  textAlign: "right",
                  padding: "14px 16px",
                  border: "1px solid #e2e8f0",
                  color: "#92400e",
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                Per annum
              </th>
            </tr>
          </thead>
          <tbody>
            {[
              ["Basic Salary (50% of CTC)", monthlyBasic, monthlyBasic * 12],
              ["HRA (50% of Basic Pay)", monthlyHra, monthlyHra * 12],
              ["Special Allowances", monthlySpecial, monthlySpecial * 12],
              ["Gross Salary", monthlyGross, annualGross],
            ].map(([label, monthValue, yearValue], index) => (
              <tr
                key={label}
                style={{ background: index % 2 === 0 ? "#f8fafc" : "#ffffff" }}
              >
                <td
                  style={{
                    padding: "12px 16px",
                    border: "1px solid #e2e8f0",
                    color: "#0f172a",
                  }}
                >
                  {label}
                </td>
                <td
                  style={{
                    padding: "12px 16px",
                    border: "1px solid #e2e8f0",
                    textAlign: "right",
                    color: "#0f172a",
                    fontWeight: 700,
                  }}
                >
                  {formatRupee(monthValue)}
                </td>
                <td
                  style={{
                    padding: "12px 16px",
                    border: "1px solid #e2e8f0",
                    textAlign: "right",
                    color: "#0f172a",
                    fontWeight: 700,
                  }}
                >
                  {formatRupee(yearValue)}
                </td>
              </tr>
            ))}
            <tr>
              <td
                colSpan={3}
                style={{
                  padding: "14px 16px",
                  background: "#d1fae5",
                  color: "#065f46",
                  fontSize: 12,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  border: "1px solid #e2e8f0",
                }}
              >
                Statutory Deductions
              </td>
            </tr>
            {[
              [
                "PF contribution by employee (12%)",
                employeePf,
                annualEmployeePf,
              ],
              ["Professional Tax (PT)", pt, annualPt],
              ["Income Tax", incomeTax, annualIncomeTax],
            ].map(([label, monthValue, yearValue], index) => (
              <tr
                key={label}
                style={{ background: index % 2 === 0 ? "#ffffff" : "#f8fafc" }}
              >
                <td
                  style={{
                    padding: "12px 16px",
                    border: "1px solid #e2e8f0",
                    color: "#0f172a",
                  }}
                >
                  {label}
                </td>
                <td
                  style={{
                    padding: "12px 16px",
                    border: "1px solid #e2e8f0",
                    textAlign: "right",
                    color: "#0f172a",
                    fontWeight: 700,
                  }}
                >
                  {formatRupee(monthValue)}
                </td>
                <td
                  style={{
                    padding: "12px 16px",
                    border: "1px solid #e2e8f0",
                    textAlign: "right",
                    color: "#0f172a",
                    fontWeight: 700,
                  }}
                >
                  {formatRupee(yearValue)}
                </td>
              </tr>
            ))}
            <tr style={{ background: "#fef3c7" }}>
              <td
                style={{
                  padding: "14px 16px",
                  border: "1px solid #e2e8f0",
                  color: "#92400e",
                  fontWeight: 800,
                }}
              >
                Total deductions (PF+PT+Income Tax)
              </td>
              <td
                style={{
                  padding: "14px 16px",
                  border: "1px solid #e2e8f0",
                  textAlign: "right",
                  color: "#92400e",
                  fontWeight: 800,
                }}
              >
                {formatRupee(totalDeductions)}
              </td>
              <td
                style={{
                  padding: "14px 16px",
                  border: "1px solid #e2e8f0",
                  textAlign: "right",
                  color: "#92400e",
                  fontWeight: 800,
                }}
              >
                {formatRupee(annualTotalDeductions)}
              </td>
            </tr>
            <tr style={{ background: "#ecfdf5" }}>
              <td
                style={{
                  padding: "14px 16px",
                  border: "1px solid #e2e8f0",
                  color: "#0f5132",
                  fontWeight: 800,
                }}
              >
                Net Salary (Gross - Total deductions)
              </td>
              <td
                style={{
                  padding: "14px 16px",
                  border: "1px solid #e2e8f0",
                  textAlign: "right",
                  color: "#0f5132",
                  fontWeight: 800,
                }}
              >
                {formatRupee(netSalary)}
              </td>
              <td
                style={{
                  padding: "14px 16px",
                  border: "1px solid #e2e8f0",
                  textAlign: "right",
                  color: "#0f5132",
                  fontWeight: 800,
                }}
              >
                {formatRupee(annualNetSalary)}
              </td>
            </tr>
            <tr style={{ background: "#fef2f2" }}>
              <td
                style={{
                  padding: "14px 16px",
                  border: "1px solid #e2e8f0",
                  color: "#991b1b",
                  fontWeight: 700,
                }}
              >
                Employer PF contribution (12%)
              </td>
              <td
                style={{
                  padding: "14px 16px",
                  border: "1px solid #e2e8f0",
                  textAlign: "right",
                  color: "#991b1b",
                  fontWeight: 700,
                }}
              >
                {formatRupee(annualEmployerPf / 12)}
              </td>
              <td
                style={{
                  padding: "14px 16px",
                  border: "1px solid #e2e8f0",
                  textAlign: "right",
                  color: "#991b1b",
                  fontWeight: 700,
                }}
              >
                {formatRupee(annualEmployerPf)}
              </td>
            </tr>
            <tr style={{ background: "#e0f2fe" }}>
              <td
                style={{
                  padding: "14px 16px",
                  border: "1px solid #e2e8f0",
                  color: "#0c4a6e",
                  fontWeight: 800,
                }}
              >
                CTC = Gross salary + (Employer PF)
              </td>
              <td
                style={{
                  padding: "14px 16px",
                  border: "1px solid #e2e8f0",
                  textAlign: "right",
                  color: "#0c4a6e",
                  fontWeight: 800,
                }}
              >
                {formatRupee(monthlyGross + annualEmployerPf / 12)}
              </td>
              <td
                style={{
                  padding: "14px 16px",
                  border: "1px solid #e2e8f0",
                  textAlign: "right",
                  color: "#0c4a6e",
                  fontWeight: 800,
                }}
              >
                {formatRupee(annualGross + annualEmployerPf)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
