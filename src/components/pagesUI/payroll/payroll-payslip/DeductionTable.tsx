import { deductionData } from "@/data/payroll/deduction-data";
import React from "react";

const DeductionTable = () => {
  const totalAmount = deductionData.reduce(
    (sum, item) => sum + item?.amount,
    0
  );
  return (
    <>
        <div className="table__wrapper meeting-table table-responsive">
          <table className="table mb-[20px] w-full">
            <thead>
              <tr className="table__title">
                <th>Deduction</th>
                <th>Title</th>
                <th>Type</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody className="table__body">
              {deductionData.map((deduction, index) => (
                <tr key={index}>
                  <td>{deduction.deduction}</td>
                  <td>{deduction.title}</td>
                  <td>{deduction.type}</td>
                  <td>{deduction.amount}</td>
                </tr>
              ))}
              <tr>
                <td></td>
                <td></td>
                <td>Total</td>
                <td>${totalAmount}</td>
              </tr>
            </tbody>
          </table>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "20px",
            }}
          >
            <div style={{ textAlign: "right" }}>
              <p>
                <strong>Net Salary :</strong> $1500.00
              </p>
              <p>
                <strong>Rebate :</strong> $0.00
              </p>
              <p>
                <strong>Payable Amount :</strong> $1500.00
              </p>
            </div>
          </div>
        </div>
    </>
  );
};

export default DeductionTable;
