"use client"
import React, { useState } from 'react';

const BoxStepWithNumber = () => {
    const [currentStep, setCurrentStep] = useState(2);

    return (
        <>
            <div className="card__wrapper">
                <div className="card__title-wrap mb-[20px]">
                    <h5 className="card__heading-title">Box Step With Number</h5>
                </div>
                <div className="steps-grid-3">
                    <div 
                        className={`steps-item ${currentStep === 1 ? 'current' : ''}`} 
                        onClick={() => setCurrentStep(1)}
                    >
                        <span className="steps-number">1</span>
                        <div className="steps-content">
                            <span className="steps-title">Recruitment</span>
                            <p>Identify and attract talent</p>
                        </div>
                    </div>
                    <div 
                        className={`steps-item ${currentStep === 2 ? 'current' : ''}`} 
                        onClick={() => setCurrentStep(2)}
                    >
                        <span className="steps-number">2</span>
                        <div className="steps-content">
                            <span className="steps-title">Onboarding</span>
                            <p>Integrate new hires</p>
                        </div>
                    </div>
                    <div 
                        className={`steps-item ${currentStep === 3 ? 'current' : ''}`} 
                        onClick={() => setCurrentStep(3)}
                    >
                        <span className="steps-number">3</span>
                        <div className="steps-content">
                            <span className="steps-title">Development</span>
                            <p>Train and develop employees</p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default BoxStepWithNumber;
