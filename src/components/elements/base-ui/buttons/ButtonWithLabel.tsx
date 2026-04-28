import React from 'react';

const ButtonWithLabel = () => {
    return (
        <>
            <div className="card__wrapper">
                <div className="card__title-wrap mb-[20px]">
                    <h5 className="card__heading-title">Button With Label</h5>
                </div>
                <div className="flex items-center gap-1">
                    <button className="btn btn-primary label-btn">
                        <span className="label-btn-icon"><i className="icon-face-smile-relaxed"></i></span>
                        Primary
                    </button>
                    <button className="btn btn-primary label-btn radius-pill">
                        <span className="label-btn-icon label-radius-pill"><i
                            className="icon-face-smile-relaxed"></i></span>
                        Primary
                    </button>
                </div>
            </div>
        </>
    );
};

export default ButtonWithLabel;