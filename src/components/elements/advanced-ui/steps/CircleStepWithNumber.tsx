"use client"
import React, { useState } from 'react';

const CircleStepWithNumber = () => {
    const [currentStep, setCurrentStep] = useState(1);
    return (
        <>
            <div className="card__wrapper">
                <div className="card__title-wrap mb-[20px]">
                    <h5 className="card__heading-title">Circle Step With Number</h5>
                </div>
                <div className="steps__form">
                    <div className="steps__row setup-panel-2 flex justify-between">
                        <div className="steps__step">
                            <button onClick={(e) => { e.preventDefault(); setCurrentStep(1); }} className={`step-circle ${currentStep === 1 ? "step-active" : ""}`}>
                                <span>1</span>
                            </button>
                        </div>
                        <div className="steps__step">
                            <button onClick={(e) => { e.preventDefault(); setCurrentStep(2); }} className={`step-circle ${currentStep === 2 ? "step-active" : ""}`}>
                                <span>2</span>
                            </button>
                        </div>
                        <div className="steps__step">
                            <button onClick={(e) => { e.preventDefault(); setCurrentStep(3); }} className={`step-circle ${currentStep === 3 ? "step-active" : ""}`}>
                                <span>3</span>
                            </button>
                        </div>
                        <div className="steps__step">
                            <button onClick={(e) => { e.preventDefault(); setCurrentStep(4); }} className={`step-circle ${currentStep === 4 ? "step-active" : ""}`}>
                                <span>4</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default CircleStepWithNumber;