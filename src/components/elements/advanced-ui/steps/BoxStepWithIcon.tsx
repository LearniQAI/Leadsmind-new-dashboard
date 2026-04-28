"use client"
import React, { useState } from 'react';

const BoxStepWithIcon = () => {
    const [currentStep, setCurrentStep]=useState(2);
    return (
        <>
            <div className="card__wrapper">
                <div className="card__title-wrap mb-[20px]">
                    <h5 className="card__heading-title">Box Step With Icon</h5>
                </div>
                <div className="steps-grid-3">
                    <div className={`steps-item ${currentStep === 1 ? "current":""}`}>
                        <span className="steps-number"><i className="fa-solid fa-user"></i></span>
                        <div onClick={()=>setCurrentStep(1)} className="steps-content"><span className="steps-title">Recruitment</span>
                            <p>Identify and attract talent</p>
                        </div>
                    </div>
                    <div className={`steps-item ${currentStep === 2 ? "current":""}`}><span className="steps-number"><i
                        className="fa-solid fa-person-digging"></i></span>
                        <div onClick={()=>setCurrentStep(2)} className="steps-content"><span className="steps-title">Onboarding</span>
                            <p>Integrate new hires</p>
                        </div>
                    </div>
                    <div className={`steps-item ${currentStep === 3 ? "current":""}`}><span className="steps-number"><i className="fa-solid fa-terminal"></i></span>
                        <div onClick={()=>setCurrentStep(3)} className="steps-content"><span className="steps-title">Development</span>
                            <p>Train and develop employees</p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default BoxStepWithIcon;