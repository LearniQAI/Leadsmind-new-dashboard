import React from 'react';

const InvoiceEditTable = () => {
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
                            <th scope="col" style={{ width: "150px" }}>Rate</th>
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
                                    <input type="text" className="form-control" id="productName" placeholder="Product Name" defaultValue="Apple MacBook Pro 14-Inch M3 Pro Chip" />
                                </div>
                                <textarea className="form-control" id="productDetails" rows={2} placeholder="Product Details" defaultValue="Color: Space Gray & RAM/Storage: 18GB/1TB SSD"/>
                            </td>
                            <td>
                                <input type="number" className="form-control product-rate product-rate" id="productRate" placeholder="0.00" defaultValue="1499.00" />
                            </td>
                            <td>
                                <input type="number" className="form-control product-quantity" id="productQnty" placeholder="1" defaultValue="1" min="1" max="1000" />
                            </td>
                            <td className="text-end">
                                <div>
                                    <input type="text" className="form-control total-price" id="productTotalPrice" placeholder="$0.00" defaultValue="$1499.00" />
                                </div>
                            </td>
                            <td>
                                <button className="product__removal-btn productRemoval"><span><i
                                    className="fa-solid fa-xmark"></i></span></button>
                            </td>
                        </tr>
                        <tr className="product">
                            <td>02</td>
                            <td className="text-start">
                                <div className="mb-2.5">
                                    <input type="text" className="form-control" id="productName2" placeholder="Product Name" defaultValue="iPhone 16 Pro Max" />
                                </div>
                                <textarea className="form-control" id="productDetails2" rows={2} placeholder="Product Details" defaultValue="Color: Space Black & RAM/Storage: 12GB/2TB SSD"/> 
                            </td>
                            <td>
                                <input type="number" className="form-control product-rate" id="productRate2" placeholder="0.00" step="0.01" defaultValue="1999.00" />
                            </td>
                            <td>
                                <input type="number" className="form-control product-quantity" id="productQnty2" placeholder="1" defaultValue="1" min="1" max="1000" />
                            </td>
                            <td className="text-end">
                                <div>
                                    <input type="text" className="form-control total-price" id="productTotalPrice2" placeholder="$0.00" defaultValue="$1999.99" />
                                </div>
                            </td>
                            <td>
                                <button className="product__removal-btn productRemoval"><span><i
                                    className="fa-solid fa-xmark"></i></span></button>
                            </td>
                        </tr>
                        <tr className="product">
                            <td>03</td>
                            <td className="text-start">
                                <div className="mb-2.5">
                                    <input type="text" className="form-control" id="productName3" placeholder="Product Name" defaultValue="Sony DCD-XB100 Wireless Bluetooth Portable Speaker" />
                                </div>
                                <textarea className="form-control" id="productDetails3" rows={2} placeholder="Product Details" defaultValue="Extra-Durable IP67 Waterproof & Dustproof, 16 Hour Battery"/>
                            </td>
                            <td>
                                <input type="number" className="form-control product-rate" id="productRate3" placeholder="0.00" step="0.01" defaultValue="58.59" />
                            </td>
                            <td>
                                <input type="number" className="form-control product-quantity" id="productQnty3" placeholder="1" defaultValue="2" min="1" max="1000" />
                            </td>
                            <td className="text-end">
                                <div>
                                    <input type="text" className="form-control total-price" id="productTotalPrice3" placeholder="$0.00" defaultValue="$117.18" />
                                </div>
                            </td>
                            <td>
                                <button className="product__removal-btn productRemoval"><span><i
                                    className="fa-solid fa-xmark"></i></span></button>
                            </td>
                        </tr>
                        <tr className="product">
                            <td>04</td>
                            <td className="text-start">
                                <div className="mb-2.5">
                                    <input type="text" className="form-control" id="productName4" placeholder="Product Name" defaultValue="12 Cup Programmable Drip Coffee Maker" />
                                </div>
                                <textarea className="form-control" id="productDetails4" rows={2} placeholder="Product Details" defaultValue="Color: Black, Programmable, Removable Tank, Auto Clean Function, Water Filter."/>
                            </td>
                            <td>
                                <input type="number" className="form-control product-rate" id="productRate4" placeholder="0.00" step="0.01" defaultValue="119.50" />
                            </td>
                            <td>
                                <input type="number" className="form-control product-quantity" id="productQnty4" placeholder="1" defaultValue="1" min="1" max="1000" />
                            </td>
                            <td className="text-end">
                                <div>
                                    <input type="text" className="form-control total-price" id="productTotalPrice4" placeholder="$0.00" defaultValue="$119.50" />
                                </div>
                            </td>
                            <td>
                                <button className="product__removal-btn productRemoval"><span><i
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
                                    <label>Notes:</label>
                                </div>
                                <textarea className="form-control" defaultValue="It was delightful collaborating with you. We look forward to being considered for the next order. Thank you!"/>
                            </td>
                            <td colSpan={0}></td>
                            <td colSpan={3} className="p-0">
                                <table className="table table-borderless last-row-no-border mb-0 mt-15">
                                    <tbody>
                                        <tr>
                                            <td>Sub Total :</td>
                                            <td className="text-end">$3734.68</td>
                                        </tr>
                                        <tr>
                                            <td>Discount: <span className="text-black dark:text-white font-bold">(20%)</span></td>
                                            <td className="text-end">-$2987.74</td>
                                        </tr>
                                        <tr>
                                            <td>Vat :<span className="text-black dark:text-white font-bold">(7.5%)</span></td>
                                            <td className="text-end">+$224.08</td>
                                        </tr>
                                        <tr>
                                            <td>Shipping Charge :</td>
                                            <td className="text-end">$250.00</td>
                                        </tr>
                                        <tr className="border-top">
                                            <th scope="row">Total :</th>
                                            <th className="text-end">$3461.82</th>
                                        </tr>
                                        <tr className="border-top">
                                            <td>Rebate :</td>
                                            <td className="text-end">-$00.82</td>
                                        </tr>
                                        <tr className="border-top">
                                            <th scope="row">Payable Amount :</th>
                                            <th className="text-end">$3461.00</th>
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

export default InvoiceEditTable;