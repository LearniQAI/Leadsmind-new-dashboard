
"use client";
import React, { useState } from 'react';
import { Tab, Tabs } from '@mui/material';

const BasicTabsWithIconRight: React.FC = () => {
    const [value, setValue] = useState<number>(0);

    const handleChange = (event: React.SyntheticEvent, newValue: number) => {
        setValue(newValue);
    };

    return (
        <div className="card__wrapper">
            <div className="card__title-wrap mb-[20px]">
                <h5 className="card__heading-title">Basic Tabs with Icon Right</h5>
            </div>
              {/* Tabs */}
              <Tabs className='mt-[20px] tabs-icon-right' value={value} onChange={handleChange} aria-label="basic tabs example">
                <Tab iconPosition="start" icon={<i className="icon-house"></i>} label="Home" />
                <Tab iconPosition="start" icon={ <i className="fa-sharp fa-regular fa-users"></i>} label="Profile" />
                <Tab iconPosition="start" icon={<i className="icon-notebook"></i>} label="Contact" />
            </Tabs>
            {/* Tab Panels */}
            <div role="tabpanel" hidden={value !== 0}>
                {value === 0 && (
                  <p className="mb-0 mt-[20px]">This is some placeholder content the Home {`tab's`} associated content. Clicking
                  another tab will toggle the visibility of this one for the next. The tab JavaScript swaps classes
                  to control the content visibility and styling. You can use it with tabs, pills, and any other
                  .nav-powered navigation.</p>
                )}
            </div>

            <div role="tabpanel" hidden={value !== 1}>
                {value === 1 && (
                     <p className="mb-0 mt-[20px]">This is some placeholder content the Profile {`tab's`} associated content.
                     Clicking another tab will toggle the visibility of this one for the next. The tab JavaScript swaps
                     classes to control the content visibility and styling. You can use it with tabs, pills, and any
                     other .nav-powered navigation.</p>
                )}
            </div>

            <div role="tabpanel" hidden={value !== 2}>
                {value === 2 && (
                    <p className="mb-0 mt-[20px]">This is some placeholder content the Contact {`tab's`} associated content.
                    Clicking another tab will toggle the visibility of this one for the next. The tab JavaScript swaps
                    classes to control the content visibility and styling. You can use it with tabs, pills, and any
                    other .nav-powered navigation.</p>
                )}
            </div>
        </div>
    );
};

export default BasicTabsWithIconRight;
