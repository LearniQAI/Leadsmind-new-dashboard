
"use client"
import { Tooltip } from '@mui/material';
import React, { useState } from 'react';

const CircleStepWithIcon = () => {
    const [currentStep, setCurrentStep] = useState<number>(0);
    const [openTooltip, setOpenTooltip] = useState<number | null>(null);

    const handleClick = (step: number) => {
        if (openTooltip === step) {
            // If the clicked step is already open, close it
            setOpenTooltip(null);
        } else {
            // Otherwise, open the new tooltip
            setCurrentStep(step);
            setOpenTooltip(step);
        }
    };

    return (
        <>
            <div className="card__wrapper">
                <div className="card__title-wrap mb-[20px]">
                    <h5 className="card__heading-title">Circle Step With Icon</h5>
                </div>
                <div className="steps__form">
                    <div className="steps__row setup-panel-2 flex justify-between">
                        <div className="steps__step">
                            <Tooltip  className="custom-tooltip" title="Basic Information" placement="top" arrow  open={openTooltip === 1}>
                                <button
                                    onClick={(e) => { e.preventDefault(); handleClick(1); }}
                                    className={`step-circle ms-0 ${currentStep === 1 ? "step-active" : ""}`}
                                >
                                    <span><i className="fas fa-folder"></i></span>
                                </button>
                            </Tooltip>
                        </div>
                        <div className="steps__step">
                            <Tooltip className="custom-tooltip" title="Personal Data" placement="top" arrow open={openTooltip === 2}>
                                <button
                                    onClick={(e) => { e.preventDefault(); handleClick(2); }}
                                    className={`step-circle ${currentStep === 2 ? "step-active" : ""}`}
                                >
                                    <span><i className="fas fa-pencil-alt"></i></span>
                                </button>
                            </Tooltip>
                        </div>
                        <div className="steps__step">
                            <Tooltip className="custom-tooltip" title="Terms and Conditions" placement="top" arrow open={openTooltip === 3}>
                                <button
                                    onClick={(e) => { e.preventDefault(); handleClick(3); }}
                                    className={`step-circle ${currentStep === 3 ? "step-active" : ""}`}
                                >
                                    <span><i className="fas fa-images"></i></span>
                                </button>
                            </Tooltip>
                        </div>
                        <div className="steps__step">
                            <Tooltip className="custom-tooltip" title="Finish" placement="top" arrow  open={openTooltip === 4}>
                                <button
                                    onClick={(e) => { e.preventDefault(); handleClick(4); }}
                                    className={`step-circle me-0 ${currentStep === 4 ? "step-active" : ""}`}
                                >
                                    <span><i className="fas fa-check"></i></span>
                                </button>
                            </Tooltip>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default CircleStepWithIcon;
