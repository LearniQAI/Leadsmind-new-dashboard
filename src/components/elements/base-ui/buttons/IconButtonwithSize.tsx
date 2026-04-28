import React from 'react';

const IconButtonwithSize = () => {
    return (
        <>
            <div className="card__wrapper">
                <div className="card__title-wrap mb-[20px]">
                    <h5 className="card__heading-title">Icon Button with Size</h5>
                </div>
                <div className="flex flex-wrap items-center gap-[10px] sm:gap-[20px]">
                    <div className="icon-button-wrap">
                        <button className="btn btn-icon btn-primary">
                            <i className="icon-house"></i></button>
                        <button className="btn btn-icon btn-info">
                            <i className="icon-house"></i></button>
                        <button className="btn btn-icon btn-danger">
                            <i className="icon-house"></i></button>
                        <button className="btn btn-icon btn-warning">
                            <i className="icon-house"></i>
                        </button>
                    </div>
                    <div className="icon-button-wrap">
                        <button className="btn btn-icon btn-primary-light radius-pill">
                            <i className="icon-house"></i> </button>
                        <button className="btn btn-icon btn-secondary-light radius-pill">
                            <i className="icon-house"></i> </button>
                        <button className="btn btn-icon btn-success-light radius-pill">
                            <i className="icon-house"></i> </button>
                        <button className="btn btn-icon btn-danger-light radius-pill">
                            <i className="icon-house"></i> </button>
                    </div>
                    <div className="icon-button-wrap">
                        <button className="btn btn-icon btn-outline-primary radius-pill">
                            <i className="icon-house"></i> </button>
                        <button className="btn btn-icon btn-outline-secondary radius-pill">
                            <i className="icon-house"></i> </button>
                        <button className="btn btn-icon btn-outline-success radius-pill">
                            <i className="icon-house"></i> </button>
                        <button className="btn btn-icon btn-outline-danger radius-pill">
                            <i className="icon-house"></i>
                        </button>
                    </div>
                    <div className="icon-button-wrap">
                        <button className="btn btn-icon btn-xs btn-primary">
                            <i className="icon-house"></i></button>
                        <button className="btn btn-icon btn-sm btn-secondary">
                            <i className="icon-house"></i></button>
                        <button className="btn btn-icon btn-warning">
                            <i className="icon-house"></i></button>
                        <button className="btn btn-icon btn-lg btn-info">
                            <i className="icon-house"></i></button>
                        <button className="btn btn-icon btn-xl btn-danger">
                            <i className="icon-house"></i></button>
                        <button className="btn btn-xxl btn-icon btn-dark">
                            <i className="icon-house"></i></button>
                    </div>
                    <div className="icon-button-wrap">
                        <button className="btn btn-icon btn-xs btn-primary-light radius-pill">
                            <i className="icon-house"></i> </button>
                        <button className="btn btn-icon btn-secondary-light radius-pill">
                            <i className="icon-house"></i> </button>
                        <button className="btn btn-icon btn-sm btn-success-light radius-pill">
                            <i className="icon-house"></i> </button>
                        <button className="btn btn-icon btn-lg btn-danger-light radius-pill">
                            <i className="icon-house"></i> </button>
                        <button className="btn btn-icon btn-xl btn-warning-light radius-pill">
                            <i className="icon-house"></i> </button>
                        <button className="btn btn-icon btn-xxl btn-info-light radius-pill">
                            <i className="icon-house"></i> </button>
                    </div>
                    <div className="icon-button-wrap">
                        <button className="btn btn-icon btn-xs btn-outline-primary radius-pill">
                            <i className="icon-house"></i> </button>
                        <button className="btn btn-icon btn-sm btn-outline-secondary radius-pill">
                            <i className="icon-house"></i> </button>
                        <button className="btn btn-icon btn-outline-success radius-pill">
                            <i className="icon-house"></i> </button>
                        <button className="btn btn-icon btn-lg btn-outline-info radius-pill">
                            <i className="icon-house"></i></button>
                        <button className="btn btn-icon btn-xl btn-outline-danger radius-pill">
                            <i className="icon-house"></i></button>
                        <button className="btn btn-icon btn-xxl btn-outline-warning radius-pill">
                            <i className="icon-house"></i></button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default IconButtonwithSize;