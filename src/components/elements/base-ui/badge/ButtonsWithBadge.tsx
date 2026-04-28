
import React from 'react';

const ButtonsWithBadge = () => {
    return (
        <>
            <div className="card__wrapper">
                <div className="card__title-wrap mb-[20px]">
                    <h5 className="card__heading-title">Buttons with Badge</h5>
                </div>
                <div className="">
                    <div className="mb-[15px]">
                        <button className="btn btn-primary" type="button"><span>Notifications</span>
                            <span className="bd-badge badge-circle bg-secondary badge-circle-color">2</span>
                        </button>
                    </div>
                    <div className="mb-[15px]">
                        <button className="btn btn-secondary" type="button"><span>Notifications</span>
                            <span className="bd-badge badge-circle bg-primary badge-circle-color">3</span>
                        </button>
                    </div>
                    <div className="mb-[15px]">
                        <button className="btn btn-primary bg-theme" type="button">
                            <span>Notifications</span>
                            <span className="bd-badge badge-circle bg-success badge-circle-color">4</span>
                        </button>
                    </div>
                    <div className="mb-[15px]">
                        <button className="btn btn-primary bg-theme" type="button"><span>Notifications</span>
                            <span className="bd-badge badge-circle bg-warning badge-circle-color">5</span>
                        </button>
                    </div>
                    <div className="mb-[15px]">
                        <button className="btn btn-primary bg-theme" type="button"><span>Notifications</span>
                            <span className="bd-badge badge-circle bg-danger badge-circle-color">6</span>
                        </button>
                    </div>
                    <div className="mb-[15px]">
                        <button className="btn btn-primary bg-theme" type="button"><span>Notifications</span>
                            <span className="bd-badge badge-circle bg-light badge-circle-color">6</span>
                        </button>
                    </div>
                    <div>
                        <button className="btn btn-primary bg-theme" type="button"><span>Notifications</span>
                            <span className="bd-badge badge-circle bg-dark badge-circle-color">6</span>
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ButtonsWithBadge;