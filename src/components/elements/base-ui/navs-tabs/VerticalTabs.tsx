"use client";
import React, { useState } from 'react';
import { Tab, Tabs } from '@mui/material';

const VerticalTabs: React.FC = () => {
    const [value, setValue] = useState<number>(0);

    const handleChange = (event: React.SyntheticEvent, newValue: number) => {
        setValue(newValue);
    };

    return (
        <div className="card__wrapper">
            <div className="card__title-wrap mb-[20px]">
                <h5 className="card__heading-title">Vertical Tabs</h5>
            </div>
            <div className="tabs__container grid grid-cols-12 gap-x-6 maxXs:gap-x-0 tabs__style">
                {/* Vertical Tabs */}
                <Tabs
                    value={value}
                    onChange={handleChange}
                    orientation="vertical"
                    variant="scrollable"
                    aria-label="vertical tabs example"
                    className="col-span-12 md:col-span-3"
                >
                    <Tab label="Home" />
                    <Tab label="Profile" />
                    <Tab label="Message" />
                    <Tab label="Settings" />
                </Tabs>

                {/* Tab Panels */}
                <div className="tab-content col-span-12 md:col-span-9">
                    <div role="tabpanel" hidden={value !== 0}>
                        {value === 0 && (
                            <p className="mb-0">
                                This is some placeholder content for the Home {`tab's`} associated content. Clicking
                                another tab will toggle the visibility of this one for the next.
                            </p>
                        )}
                    </div>

                    <div role="tabpanel" hidden={value !== 1}>
                        {value === 1 && (
                            <p className="mb-0">
                                This is some placeholder content for the Profile {`tab's`} associated content. Selecting a
                                different tab will toggle the display of this one.
                            </p>
                        )}
                    </div>

                    <div role="tabpanel" hidden={value !== 2}>
                        {value === 2 && (
                            <p className="mb-0">
                                This is some placeholder content for the Contact {`tab's`} associated section. Toggling to
                                another tab will replace the current content with the next.
                            </p>
                        )}
                    </div>
                    <div role="tabpanel" hidden={value !== 3}>
                        {value === 3 && (
                            <p className="mb-0">
                                This is some placeholder content for the Contact {`tab's`} associated section. Toggling to
                                another tab will replace the current content with the next.
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VerticalTabs;
