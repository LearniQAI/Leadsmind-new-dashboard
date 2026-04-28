
import React from 'react';

const ButtonWithIconBadge = () => {

    return (
        <>
            <div className="card__wrapper">
                <div className="card__title-wrap mb-[20px]">
                    <h5 className="card__heading-title">Button with Icon Badge</h5>
                </div>
                <div className="">
                    <div className="mb-[15px]">
                        <button className="btn btn-primary" type="button"><span>Messages</span>
                            <span className="bd-badge badge-circle bg-white"><i className="icon-envelope"></i></span>
                        </button>
                    </div>
                    <div className="mb-[15px]">
                        <button className="btn btn-secondary" type="button"><span>notifications</span>
                            <span className="bd-badge badge-circle bg-white"><i
                                className="icon-bell"></i></span>
                        </button>
                    </div>
                    <div className="mb-[15px]">
                        <button className="btn btn-success" type="button">
                            <span>Update</span>
                            <span className="bd-badge badge-circle bg-white"><i
                                className="icon-gear-complex"></i></span>
                        </button>
                    </div>
                    <div className="mb-[15px]">
                        <button className="btn btn-info" type="button"><span>Playing Now </span>
                            <span className="bd-badge badge-circle bg-white"><i
                                className="icon-music"></i></span>
                        </button>
                    </div>
                    <div className="mb-[15px]">
                        <button className="btn btn-warning" type="button"><span>Memory Used</span>
                            <span className="bd-badge badge-circle bg-white"><i
                                className="icon-triangle-exclamation"></i></span>
                        </button>
                    </div>
                    <div className="mb-[15px]">
                        <button className="btn btn-danger" type="button"><span>Danger </span>
                            <span className="bd-badge badge-circle bg-white"><i
                                className="icon-circle-exclamation"></i></span>
                        </button>
                    </div>
                    <div className="mb-[15px]">
                        <button className="btn btn-light" type="button"><span>Light </span>
                            <span className="bd-badge badge-circle bg-white"><i
                                className="icon-circle-exclamation"></i></span>
                        </button>
                    </div>
                    <div>
                        <button className="btn btn-dark" type="button"><span>Dark </span>
                            <span className="bd-badge badge-circle bg-white"><i
                                className="icon-circle-exclamation"></i></span>
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ButtonWithIconBadge;