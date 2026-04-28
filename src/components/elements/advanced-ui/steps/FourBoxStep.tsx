"use client"
import React, { useState } from 'react';

const FourBoxStep = () => {
    const [currentStep, setCurrentStep] = useState(1);
    return (
        <>
            <div className="card__wrapper">
                <div className="card__title-wrap mb-[20px]">
                    <h5 className="card__heading-title">Four Box Step</h5>
                </div>
                <div className="steps-grid-4">
                    <div className={`steps-item ${currentStep === 1 ? "current":""}`}><span className="steps-number"><i className="fa-solid fa-user"></i></span>
                        <div onClick={()=>setCurrentStep(1)} className="steps-content"><span className="steps-title">Recruitment</span>
                            <p>Identify and attract talent</p>
                        </div>
                    </div>
                    <div className={`steps-item ${currentStep === 2 ? "current":""}`}><span className="steps-number"><i className="fa-solid fa-person-digging"></i></span>
                        <div onClick={()=>setCurrentStep(2)} className="steps-content"><span className="steps-title">Onboarding</span>
                            <p>Integrate new hires</p>
                        </div>
                    </div>
                    <div className={`steps-item ${currentStep === 3 ? "current":""}`}><span className="steps-number"><i className="fa-solid fa-terminal"></i></span>
                        <div onClick={()=>setCurrentStep(3)} className="steps-content"><span className="steps-title">Development</span>
                            <p>Train and develop employees</p>
                        </div>
                    </div>
                    <div className={`steps-item ${currentStep === 4 ? "current":""}`}><span className="steps-number"><i className="fa-regular fa-badge-check"></i></span>
                        <div onClick={()=>setCurrentStep(4)} className="steps-content"><span className="steps-title">Performance Management</span>
                            <p>Assess and improve employee performance</p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default FourBoxStep;