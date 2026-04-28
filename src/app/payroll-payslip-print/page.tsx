
import React from 'react';
import DeductionTable from '@/components/pagesUI/payroll/payroll-payslip/DeductionTable';
import EarningTable from '@/components/pagesUI/payroll/payroll-payslip/EarningTable';
import PayslipAndBillingAddress from '@/components/pagesUI/payroll/payroll-payslip/PayslipAndBillingAddress';

const PayrollPayslipPrintMain = () => {
    return (
        <>
            <div className="invoice__print p-[50px]">
                <div className='invoice__print--overlay'></div>
                <div className="card__wrapper box-shadow-hidden">
                    <PayslipAndBillingAddress />
                    <EarningTable />
                    <DeductionTable />
                    <div className="payslip-line"></div>
                    <div className="payslip__payment-details">
                        <h5 className="card__heading-title mb-[15px]">Payment Details:</h5>
                        <p className="text-muted">Payment Method: <span className="font-semibold">Bank Account</span></p>
                        <p className="text-muted">Account Name: <span className="font-semibold">Ethan Mitchell</span></p>
                        <p className="text-muted">Account Number: <span className="font-semibold">3456 **** **** **34</span></p>
                        <p className="text-muted">Account Name: <span className="font-semibold">Manez Bank LTD</span></p>
                    </div>
                </div>
            </div>
        </>
    );
};

export default PayrollPayslipPrintMain;