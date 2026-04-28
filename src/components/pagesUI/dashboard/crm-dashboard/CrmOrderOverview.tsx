"use client";
import { Tab, Tabs } from "@mui/material";
import Link from "next/link";
import React, { useState } from "react";
import SalesChartYearly from "../../apps/home/SalesChartYearly";

const CrmOrderOverview = () => {
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
      <div className="chart-common mb-5">
        <div className="card__wrapper style_two card-tab-wrapper">
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
        </div>
        <div className="card__content">
          <div className="tab-content" id="pills-tabContent2">
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
        <div className="card__meta sells-space flex flex-wrap gap-[10px] justify-between items-end">
          <div className="card__link">
            <Link href="#">
              <i className="fa-light fa-circle-arrow-down"></i>
              <span>Download Report</span>
            </Link>
          </div>
          <div className="card__meta-box flex gap-[30px]">
            <div className="card__meta-single-box">
              <span className="card__desc dot">Sale</span>
            </div>
            <div className="card__meta-single-box">
              <span className="card__desc dot down">Profit</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CrmOrderOverview;
