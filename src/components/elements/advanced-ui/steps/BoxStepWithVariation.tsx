import React from 'react';

const BoxStepWithVariation = () => {
    return (
        <>
            <div className="card__wrapper">
                <div className="card__title-wrap mb-[20px]">
                    <h5 className="card__heading-title mb-2.5">Box Step with Variation</h5>
                    <p>A steps-item with classname <code>.done </code> A steps-item with classname <code>.error </code> A steps-item with classname <code>.active </code> A steps-item with classname <code>.disabled </code></p>
                </div>
                <div className="steps-grid-4">
                    <div className="steps-item done"><span className="steps-number"><i className="fa-solid fa-user"></i></span>
                        <div className="steps-content"><span className="steps-title">Recruitment</span>
                            <p>Identify and attract talent</p>
                        </div>
                    </div>
                    <div className="steps-item error"><span className="steps-number"><i
                        className="fa-solid fa-person-digging"></i></span>
                        <div className="steps-content"><span className="steps-title">Onboarding</span>
                            <p>Integrate new hires</p>
                        </div>
                    </div>
                    <div className="steps-item active"><span className="steps-number"><i className="fa-solid fa-terminal"></i></span>
                        <div className="steps-content"><span className="steps-title">Development</span>
                            <p>Train and develop employees</p>
                        </div>
                    </div>
                    <div className="steps-item disabled"><span className="steps-number"><i
                        className="fa-regular fa-badge-check"></i></span>
                        <div className="steps-content"><span className="steps-title">Performance Management</span>
                            <p>Assess and improve employee performance</p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default BoxStepWithVariation;