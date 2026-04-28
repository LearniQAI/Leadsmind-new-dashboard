import React from 'react';

const InvoicePreviewTable = () => {
    return (
        <>
            <div className="table-responsive">
                <table className="table table-bordered w-full text-center table-nowrap align-middle mb-0">
                    <thead>
                        <tr className="table__title bg-title">
                            <th scope="col" style={{ width: "50px" }}>#</th>
                            <th scope="col">Product Details</th>
                            <th scope="col" style={{ width: "50px" }}>Rate</th>
                            <th scope="col" style={{ width: "50px" }}>Quantity</th>
                            <th scope="col" className="text-start">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <th scope="row">01</th>
                            <td className="text-start">
                                <span className="font-semibold">Apple MacBook Pro 14-Inch M3 Pro Chip</span>
                                <p className="text-muted mb-0">Color: Space Gray &amp; RAM/Storage: 18GB/1TB SSD</p>
                            </td>
                            <td>$1499.00</td>
                            <td>01</td>
                            <td className="text-start">$1499.00</td>
                        </tr>
                        <tr>
                            <th scope="row">02</th>
                            <td className="text-start">
                                <span className="font-semibold">iPhone 16 Pro Max</span>
                                <p className="text-muted mb-0">Color: Space Black &amp; RAM/Storage: 12GB/2TB SSD </p>
                            </td>
                            <td>$1999.00</td>
                            <td>01</td>
                            <td className="text-start">$1999.00</td>
                        </tr>
                        <tr>
                            <th scope="row">03</th>
                            <td className="text-start">
                                <span className="font-semibold">Sony DCD-XB100 Wireless Bluetooth Portable Speaker</span>
                                <p className="text-muted mb-0">Extra-Durable IP67 Waterproof & Dustproof, 16 Hour
                                    Battery
                                </p>
                            </td>
                            <td>$58.59</td>
                            <td>02</td>
                            <td className="text-start">$117.18</td>
                        </tr>
                        <tr>
                            <th scope="row">04</th>
                            <td className="text-start">
                                <span className="font-semibold">12 Cup Programmable Drip Coffee Maker</span>
                                <p className="text-muted mb-0">Color:Black, Programmable, Removable Tank, Auto Clean
                                    Function, Water Filter.</p>
                            </td>
                            <td>$119.50</td>
                            <td>01</td>
                            <td className="text-start">$119.50</td>
                        </tr>
                    </tbody>
                    <tbody>
                        <tr className="invoice-line">
                            <td colSpan={4} className="text-start">
                                <div className="form__input-title">
                                    <label className="font-semibold">Notes:</label>
                                </div>
                                <span className="text-muted">It was delightful collaborating with you. We look forward
                                    to being considered for the next order. Thank you!</span>
                            </td>
                            <td colSpan={2} className="p-0 text-end">
                                <div className="table-responsive">
                                    <table className="table table-borderless last-row-no-border mb-0 mt-[15px]">
                                        <tbody>
                                            <tr>
                                                <td>Sub Total :</td>
                                                <td className="text-start">$3734.68</td>
                                            </tr>
                                            <tr>
                                                <td>Discount: <span className="text-black dark:text-white font-bold"> (20%)</span></td>
                                                <td className="text-start">-$2987.74</td>
                                            </tr>
                                            <tr>
                                                <td>Vat :<span className="text-black dark:text-white font-bold"> (7.5%)</span></td>
                                                <td className="text-start">+$224.08</td>
                                            </tr>
                                            <tr>
                                                <td>Shipping Charge :</td>
                                                <td className="text-start">$250.00</td>
                                            </tr>
                                            <tr className="border-top">
                                                <th scope="row">Total :</th>
                                                <th className="text-start">$3461.82</th>
                                            </tr>
                                            <tr className="border-top">
                                                <td>Rebate :</td>
                                                <td className="text-start">-$00.82</td>
                                            </tr>
                                            <tr className="border-top">
                                                <th scope="row">Payable Amount :</th>
                                                <th className="text-start">$3461.00</th>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </>
    );
};

export default InvoicePreviewTable;