"use client"
import Breadcrumb from '@/common/Breadcrumb/breadcrumb';
import React from 'react';
import BubbleChartsBasic from './BubbleChartsBasic';
import CustomDropdown from '@/components/dropdown/CustomDropdown';
import { dropdownItems } from '@/data/dropdown-data';
import Link from 'next/link';
import BubbleChart3D from './BubbleChart3D';

const ApexChartBubbleMainArea = () => {
    return (
        <>
            <div className="app__slide-wrapper">
                <Breadcrumb breadTitle='Bubble' subTitle='Home' />

                <div className="grid grid-cols-12">
                    <div className="col-span-12">
                        <div className="card__wrapper style_two">
                            <div className="card__title-wrap flex items-center justify-between mb-[25px]">
                                <h5 className="card__heading-title">Bubble Charts</h5>
                            </div>
                            <div className="grid grid-cols-12 gap-x-6 maxXs:gap-x-0">
                                <div className="col-span-12 xxl:col-span-6">
                                    <div className="chart-common mb-[20px]">
                                        <div className="card__wrapper style_two">
                                            <div className="card__title-wrap flex items-center justify-between">
                                                <h5 className="card__heading-title">Simple</h5>
                                                <CustomDropdown items={dropdownItems} />
                                            </div>
                                            <div className="card__content">
                                                <div className="card__line-chart">
                                                    <BubbleChartsBasic />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-span-12 xxl:col-span-6">
                                    <div className="chart-common mb-[20px]">
                                        <div className="card__wrapper style_two">
                                            <div className="card__title-wrap flex items-center justify-between">
                                                <h5 className="card__heading-title">3D Bubble</h5>
                                                <CustomDropdown items={dropdownItems} />
                                            </div>
                                            <div className="card__content">
                                                <div className="card__line-chart">
                                                  <BubbleChart3D/>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ApexChartBubbleMainArea;