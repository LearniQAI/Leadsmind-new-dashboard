import React from 'react';

const InvoiceAddTable = () => {
    return (
        <>
            <div className="col-span-12 table-responsive">
                <table className="table table-bordered table-nowrap w-full maxMd:min-w-[900px] maxMd:overflow-x-auto mb-0" id="productTableRepeater">
                    <thead className="align-middle">
                        <tr className="table__title bg-title">
                            <th scope="col" className="" style={{ width: "30px" }}>#</th>
                            <th scope="col">
                                Product Details
                            </th>
                            <th scope="col" style={{ width: "120px" }}>
                                Rate
                            </th>
                            <th scope="col" style={{ width: "120px" }}>Quantity</th>
                            <th scope="col" className="text-end" style={{ width: "150px" }}>Amount</th>
                            <th scope="col" className="text-end" style={{ width: "30px" }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr className="product">
                            <td>01</td>
                            <td className="text-start">
                                <div className="mb-2.5">
                                    <input type="text" className="form-control" id="productName" placeholder="Product Name" required />
                                </div>
                                <textarea className="form-control" id="productDetails" rows={2} placeholder="Product Details"></textarea>
                            </td>
                            <td>
                                <input type="number" className="form-control product-rate" id="productRate" step="0.01" placeholder="0.00" required />
                            </td>
                            <td>
                                <input type="number" className="form-control product-quantity" id="productQnty" placeholder="1" min="1" max="1000" />
                            </td>
                            <td className="text-end">
                                <div>
                                    <input type="text" className="form-control total-price" id="productTotalPrice" placeholder="$0.00" />
                                </div>
                            </td>
                            <td>
                                <button id="productRemoval" className="product__removal-btn"><span><i
                                    className="fa-solid fa-xmark"></i></span></button>
                            </td>
                        </tr>
                    </tbody>
                    <tbody>
                        <tr>
                            <td colSpan={5}>
                                <button id="addItemBtn" className="btn btn-primary">Add Item</button>
                            </td>
                        </tr>
                        <tr className="invoice-line">
                            <td colSpan={2} className="align-middle">
                                <div className="form__input-title">
                                    <label htmlFor="extraNote">Notes:</label>
                                </div>
                                <textarea className="form-control" id="extraNote" placeholder="Extra Notes..."></textarea>
                            </td>
                            <td colSpan={0}></td>
                            <td colSpan={3} className="p-0">
                                <table className="table table-borderless last-row-no-border mb-0 mt-15">
                                    <tbody>
                                        <tr>
                                            <td>Sub Total :</td>
                                            <td className="text-end">$00.00</td>
                                        </tr>
                                        <tr>
                                            <td>Discount: <span className="text-black dark:text-white font-bold">(20%)</span></td>
                                            <td className="text-end">-$00.00</td>
                                        </tr>
                                        <tr>
                                            <td>Vat :<span className="text-black dark:text-white font-bold">(7.5%)</span></td>
                                            <td className="text-end">+$00.00</td>
                                        </tr>
                                        <tr>
                                            <td>Shipping Charge :</td>
                                            <td className="text-end">$00.00</td>
                                        </tr>
                                        <tr className="border-top">
                                            <th scope="row">Total :</th>
                                            <th className="text-end">$00.00</th>
                                        </tr>
                                        <tr className="border-top">
                                            <td>Rebate :</td>
                                            <td className="text-end">-$00.00</td>
                                        </tr>
                                        <tr className="border-top">
                                            <th scope="row">Payable Amount :</th>
                                            <th className="text-end">$00.00</th>
                                        </tr>
                                    </tbody>
                                </table>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </>
    );
};

export default InvoiceAddTable;