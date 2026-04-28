import React from 'react';

const InputFieldSizing = () => {
    return (
        <>
            <div className="card__wrapper no-height">
                <div className="card__title-wrap mb-[20px]">
                    <h5 className="card__heading-title">Input Field Sizing</h5>
                </div>
                <div className="from__input-box">
                    <div className="form__input-title">
                        <label htmlFor="defaultInput" className="form-label">Default input</label>
                    </div>
                    <div className="form__input">
                        <input id="defaultInput" className="form-control" type="text" placeholder="Default input field" />
                    </div>
                </div>
                <div className="from__input-box">
                    <div className="form__input-title">
                        <label htmlFor="largeInput" className="form-label">Large input field</label>
                    </div>
                    <div className="form__input">
                        <input id="largeInput" className="form-control form-control-lg" type="text" placeholder=".form-control-lg" />
                    </div>
                </div>
                <div className="from__input-box">
                    <div className="form__input-title">
                        <label htmlFor="smallInput" className="form-label">Small input Field</label>
                    </div>
                    <div className="form__input">
                        <input id="smallInput" className="form-control form-control-sm" type="text" placeholder=".form-control-sm" />
                    </div>
                </div>
            </div>
        </>
    );
};

export default InputFieldSizing;