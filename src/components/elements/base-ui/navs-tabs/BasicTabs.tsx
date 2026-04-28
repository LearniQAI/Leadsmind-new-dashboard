
"use client";
import React, { useState } from 'react';
import { Tab, Tabs } from '@mui/material';

const BasicTabsComponent: React.FC = () => {
    const [value, setValue] = useState<number>(0);

    const handleChange = (event: React.SyntheticEvent, newValue: number) => {
        setValue(newValue);
    };

    return (
        <div className="card__wrapper">
            <div className="card__title-wrap mb-[20px]">
                <h5 className="card__heading-title">Basic Tabs</h5>
            </div>
            {/* Tabs */}
            <Tabs value={value} onChange={handleChange} aria-label="basic tabs example">
                <Tab label="Home" />
                <Tab label="Profile" />
                <Tab label="Contact" />
            </Tabs>

            {/* Tab Panels */}
            <div role="tabpanel" hidden={value !== 0}>
                {value === 0 && (
                    <p className="mb-0 mt-[20px]">
                        This is some placeholder content for the Home {`tab's`} associated content. Clicking
                        another tab will toggle the visibility of this one for the next. The tab JavaScript swaps classes
                        to control the content visibility and styling. You can use it with tabs, pills, and any other
                        .nav-powered navigation.
                    </p>
                )}
            </div>

            <div role="tabpanel" hidden={value !== 1}>
                {value === 1 && (
                    <p className="mb-0 mt-[20px]">
                        This is some placeholder content for the Profile {`tab's`} associated content. Selecting a
                        different tab will toggle the display of this one. JavaScript handles the class changes for visibility and design
                        updates. {`It's`} versatile for use with tabs, pills, and other navigation setups.
                    </p>
                )}
            </div>

            <div role="tabpanel" hidden={value !== 2}>
                {value === 2 && (
                    <p className="mb-0 mt-[20px]">
                        This is some placeholder content for the Contact {`tab's`} associated section. Toggling to
                        another tab will replace the current content with the next. JavaScript swaps classes for visibility and presentation,
                        and it can be used with various navigation systems, such as tabs or pills.
                    </p>
                )}
            </div>
        </div>
    );
};

export default BasicTabsComponent;
