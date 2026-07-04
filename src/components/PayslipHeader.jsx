import React from "react";

export default function PayslipHeader({ company = {} }) {
  const name = company.companyName || company.name || "Company Name";
  const addressParts = [company.address, company.cityPincode || company.city, company.country].filter(Boolean);
  const address = addressParts.join(', ');

  return (
    <div className="payslip-header-center" role="banner" aria-label="Company Header">
      <h1 className="payslip-header-center__name">{name}</h1>
      {address ? (
        <p className="payslip-header-center__address">{address}</p>
      ) : null}
      <hr className="payslip-header-center__rule" />
    </div>
  );
}
