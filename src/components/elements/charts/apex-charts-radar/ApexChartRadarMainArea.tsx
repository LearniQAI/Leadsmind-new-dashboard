"use client"
import Breadcrumb from '@/common/Breadcrumb/breadcrumb';
import React from 'react';
import CustomDropdown from '@/components/dropdown/CustomDropdown';
import { dropdownItems } from '@/data/dropdown-data';
import PolygonFill from './PolygonFill';

const ApexChartRadarMainArea = () => {
    return (
        <>
              <div className="app__slide-wrapper">
                <Breadcrumb breadTitle='Radar' subTitle='Home'/>
        
                <div className="grid grid-cols-12">
                    <div className="col-span-12">
                        <div className="card__wrapper style_two">
                            <div className="card__title-wrap flex items-center justify-between mb-[25px]">
                                <h5 className="card__heading-title">Radar Charts</h5>
                            </div>
                            <div className="grid grid-cols-12 gap-x-6 maxXs:gap-x-0">
                                <div className="col-span-12 xxl:col-span-4">
                                    <div className="chart-common mb-[20px]">
                                        <div className="card__wrapper style_two">
                                            <div className="card__title-wrap flex items-center justify-between">
                                                <h5 className="card__heading-title">Polygon-fill</h5>
                                                <CustomDropdown items={dropdownItems} />
                                            </div>
                                            <div className="card__content">
                                                <div className="card__line-chart">
                                                   <PolygonFill/>
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

export default ApexChartRadarMainArea;