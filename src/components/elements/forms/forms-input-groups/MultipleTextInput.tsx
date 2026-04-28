import React from 'react';

const MultipleTextInput = () => {
    return (
        <>
            <div className="card__wrapper form__element-xs">
                <div className="card__title-wrap mb-[20px]">
                    <h5 className="card__heading-title">Multiple Text Inputs</h5>
                </div>
                <div className="from__input-box">
                    <div className="input-group form__element-xs">
                        <span className="input-group-text">First and Last Name</span>
                        <input type="text" aria-label="First name" className="form-control" />
                        <input type="text" aria-label="Last name" className="form-control" />
                    </div>
                </div>
                <div className="from__input-box">
                    <div className="input-group form__element-xs">
                        <span className="input-group-text">First and Email</span>
                        <input type="text" aria-label="full name" className="form-control" placeholder="Full Name" />
                        <input type="email" aria-label="email address" className="form-control" placeholder="Email Address" />
                    </div>
                </div>
                <div className="from__input-box">
                    <div className="input-group">
                        <span className="input-group-text">$</span>
                        <span className="input-group-text">0.00</span>
                        <input type="number" className="form-control" aria-label="Dollar amount (with dot and two decimal places)" />
                    </div>
                </div>
            </div>
        </>
    );
};

export default MultipleTextInput;