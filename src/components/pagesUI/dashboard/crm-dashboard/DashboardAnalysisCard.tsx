"use client"
import CustomDropdown from '@/components/dropdown/CustomDropdown';
import { dropdownItems } from '@/data/dropdown-data';
import React from 'react';

const DashboardAnalysisCard = () => {
    return (
        <>
            <div className="card__box">
                <div className="card__wrapper">
                    <div className="card__icon-box flex justify-between mb-[10px]">
                        <div className="card__icon">
                            <span><i className="fa-light fa-database"></i></span>
                        </div>
                        <CustomDropdown items={dropdownItems} />
                    </div>
                    <h6 className="card__sub-title mb-[10px]">Total Order</h6>
                    <h4 className="card__title mb-[10px]">$84.00K</h4>
                    <span className="card__desc style_two"><span className="price-increase"><i
                        className="fa-light fa-arrow-up"></i> +17.5%</span> Than Last Week</span>
                </div>
                <div className="card__wrapper">
                    <div className="card__icon-box flex justify-between mb-[10px]">
                        <div className="card__icon">
                            <span><i className="fa-light fa-box"></i></span>
                        </div>
                        <CustomDropdown items={dropdownItems} />
                    </div>
                    <h6 className="card__sub-title mb-[10px]">Product Views</h6>
                    <h4 className="card__title mb-[10px]">3.00M</h4>
                    <span className="card__desc style_two"><span className="price-increase"><i
                        className="fa-light fa-arrow-up"></i> +17.5%</span> Than Last Week</span>
                </div>
                <div className="card__wrapper">
                    <div className="card__icon-box flex justify-between mb-[10px]">
                        <div className="card__icon">
                            <span><i className="fa-thin fa-mug-hot"></i></span>
                        </div>
                        <CustomDropdown items={dropdownItems} />
                    </div>
                    <h6 className="card__sub-title mb-[10px]">Total Customers</h6>
                    <h4 className="card__title mb-[10px]">12.00K</h4>
                    <span className="card__desc style_two"><span className="price-decrease"><i
                        className="fa-light fa-arrow-down"></i> +17.5%</span> Than Last Week</span>
                </div>
                <div className="card__wrapper">
                    <div className="card__icon-box flex justify-between mb-[10px]">
                        <div className="card__icon">
                            <span><i className="fa-thin fa-face-smile"></i></span>
                        </div>
                        <CustomDropdown items={dropdownItems} />
                    </div>
                    <h6 className="card__sub-title mb-[10px]">Total Income</h6>
                    <h4 className="card__title mb-[10px]">$59.00K</h4>
                    <span className="card__desc style_two"><span className="price-increase"><i
                        className="fa-light fa-arrow-up"></i> +17.5%</span> Than Last Week</span>
                </div>
            </div>
        </>
    );
};

export default DashboardAnalysisCard;