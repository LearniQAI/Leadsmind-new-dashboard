import React from "react";
import logo from "../../../../../public/assets/images/logo/logo.svg";
import logoWhite from "../../../../../public/assets/images/logo/logo-white.svg";
import Image from "next/image";
const PayslipAndBillingAddress = () => {
  return (
    <>
      <div className="mb-[20px] text-center">
        <h5 className="card__heading-title">Employee Payslip</h5>
      </div>
      <div className="flex flex-col sm:flex-row xl:flex-row justify-between">
        <div className="payslip__office-address">
          <div className="payslip__logo mb-[20px]">
            <Image className="light-logo" src={logo} alt="payslip logo" />
            <Image className="dark-logo" src={logoWhite} alt="payslip logo" />
          </div>
          <p>100 Terminal, Fort Lauderdale,</p>
          <p>Miami 33315, United States</p>
          <p>name@manez.com</p>
          <p>+1(800) 642 7676</p>
        </div>
        <div className="payslip__serial-number">
          <div className="mb-[10px]">
            <h5 className="card__heading-title">PAYSLIP #MZ-00114</h5>
          </div>
          <div className="mb-[5px]">
            <span>Date:</span>
            <span>2024-01-08</span>
          </div>
          <div className="mb-[5px]">
            <span>Date Due:</span>
            <span>2024-01-08</span>
          </div>
        </div>
      </div>
      <div className="payslip-line"></div>
      <div className="row g-60 gy-20">
        <div className="col-xl-6 col-lg-6 col-sm-6">
          <div className="mb-[20px]">
            <h4>Billing Address</h4>
          </div>
          <div className="payslip__employee-address">
            <h5 className="mb-[10px] font-semibold">Ethan Mitchell</h5>
            <p className="text-muted">
              Position: <span>Business Intelligence Analyst</span>{" "}
            </p>
            <p className="text-muted">
              Department: <span> Information Technology Department</span>
            </p>
            <p className="text-muted">
              Email: <span>ethanmitchell@manez.com</span>
            </p>
            <p className="text-muted">
              Phone: <span> +1(800) 642 7676</span>
            </p>
          </div>
        </div>
      </div>
      <div className="payslip-line"></div>
    </>
  );
};

export default PayslipAndBillingAddress;
