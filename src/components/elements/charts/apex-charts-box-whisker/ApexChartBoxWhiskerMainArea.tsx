"use client"
import Breadcrumb from '@/common/Breadcrumb/breadcrumb';
import React from 'react';
import BoxWhiskerChartsBasic from './BoxWhiskerChartsBasic';
import BoxplotScatter from './BoxplotScatter';
import CustomDropdown from '@/components/dropdown/CustomDropdown';
import { dropdownItems } from '@/data/dropdown-data';
import HorizontalBoxPlot from './HorizontalBoxPlot';

const ApexChartBoxWhiskerMainArea = () => {
    return (
        <>

            {/* -- App side area start -- */}
            <div className="app__slide-wrapper">
                <Breadcrumb breadTitle='Box Whisker' subTitle='Home' />

                <div className="grid grid-cols-12">
                    <div className="col-span-12">
                        <div className="card__wrapper style_two">
                            <div className="card__title-wrap flex items-center justify-between mb-[25px]">
                                <h5 className="card__heading-title">Box & Whisker Charts</h5>
                            </div>
                            <div className="grid grid-cols-12 gap-x-6 maxXs:gap-x-0">
                                <div className="col-span-12 xxl:col-span-4">
                                    <div className="chart-common mb-[20px]">
                                        <div className="card__wrapper style_two">
                                            <div className="card__title-wrap flex items-center justify-between">
                                                <h5 className="card__heading-title">Basic</h5>
                                                <CustomDropdown items={dropdownItems} />
                                            </div>
                                            <div className="card__content">
                                                <div className="card__line-chart">
                                                    <BoxWhiskerChartsBasic />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-span-12 xxl:col-span-4">
                                    <div className="chart-common mb-[20px]">
                                        <div className="card__wrapper style_two">
                                            <div className="card__title-wrap flex items-center justify-between">
                                                <h5 className="card__heading-title">Boxplot-Scatter</h5>
                                                <CustomDropdown items={dropdownItems} />
                                            </div>
                                            <div className="card__content">
                                                <div className="card__line-chart">
                                                    <BoxplotScatter />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-span-12 xxl:col-span-4">
                                    <div className="chart-common mb-[20px]">
                                        <div className="card__wrapper style_two">
                                            <div className="card__title-wrap flex items-center justify-between">
                                                <h5 className="card__heading-title">Horizontal BoxPlot</h5>
                                                <CustomDropdown items={dropdownItems} />
                                            </div>
                                            <div className="card__content">
                                                <div className="card__line-chart">
                                                   <HorizontalBoxPlot/>
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
            {/* -- App side area end -- */}
        </>
    );
};

export default ApexChartBoxWhiskerMainArea;