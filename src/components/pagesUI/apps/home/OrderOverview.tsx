"use client"
import { Tab, Tabs } from "@mui/material";
import React, { useState } from "react";
import SalesChartYearly from "./SalesChartYearly";

const OrderOverview = () => {
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
            <div className="col-span-12 lg:col-span-6 xl:col-span-12 xxl:col-span-5">
                <div className="card__wrapper card-tab-wrapper">
                    <div className="card__title-wrap flex flex-wrap gap-[10px] items-center justify-between mb-[25px]">
                        <h5 className="card__heading-title">Order Overview</h5>
                        <div className="card__tab">
                            <Tabs value={value} onChange={handleChange}>
                                <Tab label="1Y" />
                                <Tab label="1M" />
                                <Tab label="1W" />
                            </Tabs>
                        </div>
                    </div>
                    <div className="card__content">
                        <div className="tab-content" id="pills-tabContent">
                            {isLoading ? (
                                <div className="loading-spinner">
                                    <p>Loading...</p>
                                </div>
                            ) : (
                                <>
                                    <div hidden={value !== 0}>
                                        {value === 0 && (
                                            <div className="card__line-chart">
                                                <SalesChartYearly />
                                            </div>
                                        )}
                                    </div>
                                    <div hidden={value !== 1}>
                                        {value === 1 && (
                                            <div className="card__line-chart">
                                                <SalesChartYearly />
                                            </div>
                                        )}
                                    </div>
                                    <div hidden={value !== 2}>
                                        {value === 2 && (
                                            <div className="card__line-chart">
                                                <SalesChartYearly />
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default OrderOverview;
