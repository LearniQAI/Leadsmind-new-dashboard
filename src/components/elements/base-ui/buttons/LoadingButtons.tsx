import React from 'react';

const LoadingButtons = () => {
    return (
        <>
            <div className="card__wrapper">
                <div className="card__title-wrap mb-[20px]">
                    <h5 className="card__heading-title">Loading Button</h5>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button className="btn btn-primary btn-loader">
                        <span className="me-[8px]">Loading</span>
                        <span className=""><i className="icon-spinner-scale fs-16"></i></span>
                    </button>
                    <button className="btn btn-outline-secondary btn-loader">
                        <span className="me-[8px]">Loading</span>
                        <span className=""><i className="icon-loader fs-16"></i></span>
                    </button>
                    <button className="btn btn-light btn-loader">
                        <span className="me-[8px]">Loading</span>
                        <span className=""><i className="icon-spinner-third fs-16"></i></span>
                    </button>
                    <button className="btn btn-warning btn-loader">
                        <span className="me-[8px]">Loading</span>
                        <span className=""><i className=" icon-spinner fs-16"></i></span>
                    </button>
                    <button className="btn btn-success btn-loader disabled">
                        <span className="me-[8px]">Disabled</span>
                        <span className=""><i className="icon-arrows-rotate fs-16"></i></span>
                    </button>
                </div>
            </div>
        </>
    );
};

export default LoadingButtons;