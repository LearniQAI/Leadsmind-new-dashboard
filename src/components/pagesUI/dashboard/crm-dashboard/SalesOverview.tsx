"use client";
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
    <div className="card__wrapper mb-5">
      <div className="flex flex-wrap gap-2 items-center justify-between mb-6">
        <h5 className="card__heading-title">Sales <span style={{ color: 'var(--accent2)' }}>Overview</span></h5>
        <div className="card__tab">
          <Tabs
            value={value}
            onChange={handleChange}
            sx={{
              minHeight: 'auto',
              '& .MuiTabs-indicator': { backgroundColor: 'var(--accent)' },
              '& .MuiTab-root': {
                color: 'var(--t3)',
                minWidth: 'auto',
                minHeight: 'auto',
                padding: '4px 12px',
                fontSize: '11px',
                fontWeight: 600,
                '&.Mui-selected': { color: 'var(--t1)' }
              }
            }}
          >
            <Tab label="1Y" />
            <Tab label="1M" />
            <Tab label="1W" />
          </Tabs>
        </div>
      </div>

      <div className="flex justify-between items-end mb-6">
        <div className="flex gap-8">
          <div>
            <h4 className="font-space text-2xl font-bold mb-1" style={{ color: 'var(--amber)' }}>$5,900.00</h4>
            <span className="text-[11px] text-t3 flex items-center">
              <span className="price-up mr-1"><i className="fa-solid fa-caret-up"></i> 8.5%</span>
              Sale Today
            </span>
          </div>
          <div>
            <h4 className="font-space text-2xl font-bold mb-1" style={{ color: 'var(--t1)' }}>$42,120.00</h4>
            <span className="text-[11px] text-t3 flex items-center">
              <span className="price-up mr-1"><i className="fa-solid fa-caret-up"></i> 12.4%</span>
              This Month
            </span>
          </div>
        </div>
        <div className="card__link">
          <Link href="#" className="btn-ghost py-1 px-3 text-[11px]">
            <i className="fa-solid fa-download mr-1"></i> Download
          </Link>
        </div>
      </div>

      <div className="tab-content relative h-[240px]">
        <div hidden={value !== 0} className="h-full">
          {value === 0 && <LineChartYear />}
        </div>
        <div hidden={value !== 1} className="h-full">
          {value === 1 && <LineChartMonth />}
        </div>
        <div hidden={value !== 2} className="h-full">
          {value === 2 && <LineChartWeek />}
        </div>
      </div>
    </div>
  );
};

export default SalesOverview;