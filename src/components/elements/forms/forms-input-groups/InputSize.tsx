import React from 'react';

const InputSize = () => {
    return (
        <>
            <div className="card__wrapper">
                <div className="card__title-wrap mb-[20px]">
                    <h5 className="card__heading-title">Input Size</h5>
                </div>
                <div className="from__input-box">
                    <div className="input-group input-group-lg">
                        <span className="input-group-text" id="input-field-lg">@</span>
                        <input type="text" className="form-control" placeholder="username large" aria-label="Username large" aria-describedby="input-field-lg" />
                    </div>
                </div>
                <div className="from__input-box">
                    <div className="input-group">
                        <span className="input-group-text" id="input-field-default">@</span>
                        <input type="text" className="form-control" placeholder="username" aria-label="Username Default" aria-describedby="input-field-default" />
                    </div>
                </div>
                <div className="from__input-box">
                    <div className="input-group input-group-sm">
                        <span className="input-group-text" id="input-field-sm">@</span>
                        <input type="text" className="form-control" placeholder="username small" aria-label="Username Small" aria-describedby="input-field-sm" />
                    </div>
                </div>
            </div>
        </>
    );
};

export default InputSize;