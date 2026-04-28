"use client"
import React, { useState } from 'react';
import LineChartYear from './LineChartYear';
import { Tab, Tabs } from '@mui/material';
import Link from 'next/link';
import LineChartMonth from './LineChartMonth';
import LineChartWeek from './LineChartWeek';

const SalesOverview = () => {
    const [value, setValue] = useState<number>(0);
    const handleChange = (event: React.SyntheticEvent, newValue: number) => {
        setValue(newValue);
    };

    return (
        <>
            <div className="chart-common mb-5">
                <div className="card__wrapper style_two card-tab-wrapper">
                    <div className="card__title-wrap flex flex-wrap gap-[10px] items-center justify-between mb-[25px]">
                        <h5 className="card__heading-title">Sales Overview</h5>
                        <div className="card__tab">
                            <Tabs value={value} onChange={handleChange}>
                                <Tab label="1Y" />
                                <Tab label="1M" />
                                <Tab label="1W" />
                            </Tabs>
                        </div>
                    </div>
                    <div className="card__content">
                        <div className="card__meta flex justify-between items-end flex-wrap">
                            <div className="card__meta-box flex flex-wrap gap-[30px]">
                                <div className="card__meta-single-box">
                                    <h4 className="card__title mb-[5px]">$5900.00</h4>
                                    <span className="card__desc dot">Sale Today <span className="price-up">8.5%</span></span>
                                </div>
                                <div className="card__meta-single-box">
                                    <h4 className="card__title mb-[5px]">$5900.00</h4>
                                    <span className="card__desc dot down">Sale Today <span
                                        className="price-down">8.5%</span></span>
                                </div>
                            </div>
                            <div className="card__link">
                                <Link href="#"><i className="fa-light fa-circle-arrow-down"></i><span>Download
                                    Report</span></Link>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="tab-content">
                    <div hidden={value !== 0}>
                        {value === 0 && (
                            <div className="card__line-chart">
                                <LineChartYear />
                            </div>
                        )}
                    </div>
                    <div hidden={value !== 1}>
                        {value === 1 && (
                            <div className="card__line-chart">
                                <LineChartMonth />
                            </div>
                        )}
                    </div>
                    <div hidden={value !== 2}>
                        {value === 2 && (
                            <div className="card__line-chart">
                                <LineChartWeek />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default SalesOverview;