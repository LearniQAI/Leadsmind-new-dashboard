import React from 'react';

const RoundedInputField = () => {
    return (
        <>
            <div className="card__wrapper no-height">
                <div className="card__title-wrap mb-2.5">
                    <h5 className="card__heading-title">Rounded input field</h5>
                </div>
                <div className="from__input-box">
                    <div className="form__input-title">
                        <label htmlFor="roundedInput" className="form-label">Rounded input</label>
                    </div>
                    <div className="form__input">
                        <input id="roundedInput" className="form-control rounded-pill" type="text" placeholder="Default input" />
                    </div>
                </div>
            </div>
        </>
    );
};

export default RoundedInputField;