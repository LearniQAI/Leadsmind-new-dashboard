import React from 'react';

const DefaultFloatlabelTwo = () => {
    return (
        <>
            <div className="card__wrapper no-height">
                <div className="card__title-wrap mb-2.5">
                    <h5 className="card__heading-title">Default Float label 2</h5>
                </div>
                <div className="floating__form-input mt-[20px]">
                    <input className="form-control" type="text" />
                    <span className="floating-label">Full Name</span>
                </div>
            </div>
        </>
    );
};

export default DefaultFloatlabelTwo;