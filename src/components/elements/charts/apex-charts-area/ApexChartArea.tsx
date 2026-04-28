"use client";
import Breadcrumb from "@/common/Breadcrumb/breadcrumb";
import React from "react";
import AreaChartsBasic from "./AreaChartsBasic";
import AreaChartsSpline from "./AreaChartsSpline";
import AreaChartsNegative from "./AreaChartsNegative";
import AreaChartsMissingNullValues from "./AreaChartsMissingNullValues";
import AreaChartsStackedstraight from "./AreaChartsStackedstraight";
import AreaChartsStackedSmooth from "./AreaChartsStackedSmooth";
import CustomDropdown from "@/components/dropdown/CustomDropdown";
import { dropdownItems } from "@/data/dropdown-data";

const ApexChartArea = () => {
  return (
    <>
      {/* -- App side area start -- */}
      <div className="app__slide-wrapper">
        <Breadcrumb breadTitle="Area" subTitle="Home" />
        <div className="grid grid-cols-12">
          <div className="col-span-12">
            <div className="card__wrapper style_two">
              <div className="card__title-wrap flex items-center justify-between mb-[25px]">
                <h5 className="card__heading-title">Area Charts</h5>
              </div>
              <div className="grid grid-cols-12 gap-x-6 maxXs:gap-x-0">
                <div className="col-span-12 xxl:col-span-6">
                  <div className="chart-common mb-[20px]">
                    <div className="card__wrapper style_two">
                      <div className="card__title-wrap flex items-center justify-between">
                        <h5 className="card__heading-title">
                          Area Charts Basic
                        </h5>
                        <CustomDropdown items={dropdownItems} />
                      </div>
                      <div className="card__content">
                        <div className="card__line-chart">
                          <AreaChartsBasic />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-span-12 xxl:col-span-6">
                  <div className="chart-common mb-[20px]">
                    <div className="card__wrapper style_two">
                      <div className="card__title-wrap flex items-center justify-between">
                        <h5 className="card__heading-title">
                          Area Charts Spline
                        </h5>
                        <CustomDropdown items={dropdownItems} />
                      </div>
                      <div className="card__content">
                        <div className="card__line-chart">
                          <AreaChartsSpline />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-span-12 xxl:col-span-6">
                  <div className="chart-common mb-[20px]">
                    <div className="card__wrapper style_two">
                      <div className="card__title-wrap flex items-center justify-between">
                        <h5 className="card__heading-title">
                          Area Charts Negative
                        </h5>
                        <CustomDropdown items={dropdownItems} />
                      </div>
                      <div className="card__content">
                        <div className="card__line-chart">
                          <AreaChartsNegative />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-span-12 xxl:col-span-6">
                  <div className="chart-common mb-[20px]">
                    <div className="card__wrapper style_two">
                      <div className="card__title-wrap flex items-center justify-between">
                        <h5 className="card__heading-title">
                          Area Charts Missing / Null values
                        </h5>
                        <CustomDropdown items={dropdownItems} />
                      </div>
                      <div className="card__content">
                        <div className="card__line-chart">
                          <AreaChartsMissingNullValues />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-span-12 xxl:col-span-6">
                  <div className="chart-common mb-[20px]">
                    <div className="card__wrapper style_two">
                      <div className="card__title-wrap flex items-center justify-between">
                        <h5 className="card__heading-title">
                          Area Charts Stacked Straight
                        </h5>
                        <CustomDropdown items={dropdownItems} />
                      </div>
                      <div className="card__content">
                        <div className="card__line-chart">
                          <AreaChartsStackedstraight />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-span-12 xxl:col-span-6">
                  <div className="chart-common mb-[20px]">
                    <div className="card__wrapper style_two">
                      <div className="card__title-wrap flex items-center justify-between">
                        <h5 className="card__heading-title">
                          Area Charts Stacked Smooth
                        </h5>
                        <CustomDropdown items={dropdownItems} />
                      </div>
                      <div className="card__content">
                        <div className="card__line-chart">
                          <AreaChartsStackedSmooth />
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

export default ApexChartArea;
