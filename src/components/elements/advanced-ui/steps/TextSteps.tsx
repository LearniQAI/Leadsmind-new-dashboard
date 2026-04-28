
"use client";
import Link from 'next/link';
import React, { useState } from 'react';

const TextSteps = () => {
    const [currentStep, setCurrentStep] = useState(1);

    return (
        <>
            <div className="card__wrapper">
                <div className="card__title-wrap mb-[20px]">
                    <h5 className="card__heading-title">Text Steps</h5>
                </div>
                <div className="steps__form">
                    <div className="steps__row style_two setup-panel flex justify-between flex-wrap">
                        <div className="steps__step">
                            <Link href="#" onClick={(e) => { e.preventDefault(); setCurrentStep(1); }}
                                className={`steps__title ${currentStep === 1 ? "step-active" : ""}`}
                            >
                                Personal Information
                            </Link>
                        </div>
                        <div className="steps__step">
                            <Link
                                href="#" onClick={(e) => { e.preventDefault(); setCurrentStep(2); }}
                                className={`steps__title ${currentStep === 2 ? "step-active" : ""}`}
                            >
                                Account Information
                            </Link>
                        </div>
                        <div className="steps__step">
                            <Link href="#"
                                onClick={(e) => { e.preventDefault(); setCurrentStep(3); }}
                                className={`steps__title ${currentStep === 3 ? "step-active" : ""}`}
                            >
                                Company Information
                            </Link>
                        </div>
                        <div className="steps__step">
                            <Link href="#"
                                onClick={(e) => { e.preventDefault(); setCurrentStep(4); }}
                                className={`steps__title ${currentStep === 4 ? "step-active" : ""}`}
                            >
                                Submit Button
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default TextSteps;
