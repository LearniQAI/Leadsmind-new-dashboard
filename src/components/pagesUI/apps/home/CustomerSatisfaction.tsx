"use client"
import React, { useState } from 'react';
import SatisfactionProgressbar from './SatisfactionProgressbar';
import { Tab, Tabs } from '@mui/material';

const CustomerSatisfaction = () => {
    const [value, setValue] = useState<number>(0);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const handleChange = (event: React.SyntheticEvent, newValue: number) => {
        setIsLoading(true);
        setValue(newValue);

        // Simulate a slight delay for content update
        setTimeout(() => {
            setIsLoading(false);
        }, 300);
    };

    return (
        <>
            <div className="col-span-12 lg:col-span-6 xxl:col-span-3">
                <div className="card__wrapper  card-tab-wrapper">
                    <div className="card__title-wrap flex flex-wrap gap-[10px] items-center justify-between mb-[25px]">
                        <h5 className="card__heading-title">Customer Satisfaction</h5>
                        <div className="card__tab">
                            <Tabs value={value} onChange={handleChange}>
                                <Tab label="1Y" />
                                <Tab label="1M" />
                                <Tab label="1W" />
                            </Tabs>
                        </div>
                    </div>
                    <div className="tab-content">
                        {isLoading ? (
                            <div className="loading-spinner">
                                <p>Loading...</p>
                            </div>
                        ) : (
                            <>
                                <div hidden={value !== 0}>
                                    {value === 0 && (
                                        <div className="card__box-wrapp">
                                            <h6 className="card__sub-title mb-[15px]">Total Order</h6>
                                            <div className="card__meta-box flex items-center gap-[10px] sm:gap-[20px] mb-[25px]">
                                                <h3 className="card__title">$84.00K</h3>
                                                <span className="card__desc style_two"><span className="price-increase"><i
                                                    className="fa-light fa-arrow-up"></i> +17.5%</span> Than Last Week</span>
                                            </div>
                                            <SatisfactionProgressbar />
                                        </div>
                                    )}
                                </div>
                                <div hidden={value !== 1}>
                                    {value === 1 && (
                                        <div className="card__box-wrapp">
                                            <h6 className="card__sub-title mb-[15px]">Total Order</h6>
                                            <div className="card__meta-box flex items-center gap-[10px] sm:gap-[20px] mb-[25px]">
                                                <h3 className="card__title">$84.00K</h3>
                                                <span className="card__desc style_two"><span className="price-increase"><i
                                                    className="fa-light fa-arrow-up"></i> +17.5%</span> Than Last Week</span>
                                            </div>
                                            <SatisfactionProgressbar />
                                        </div>
                                    )}
                                </div>
                                <div hidden={value !== 2}>
                                    {value === 2 && (
                                        <div className="card__box-wrapp">
                                            <h6 className="card__sub-title mb-[15px]">Total Order</h6>
                                            <div className="card__meta-box flex items-center gap-[10px] sm:gap-[20px] mb-[25px]">
                                                <h3 className="card__title">$84.00K</h3>
                                                <span className="card__desc style_two"><span className="price-increase"><i
                                                    className="fa-light fa-arrow-up"></i> +17.5%</span> Than Last Week</span>
                                            </div>
                                            <SatisfactionProgressbar />
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default CustomerSatisfaction;