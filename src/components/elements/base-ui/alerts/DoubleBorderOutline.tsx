import React from 'react';

const DoubleBorderOutline = () => {
    return (
        <>
            <div className="card__wrapper">
                <div className="card__title-wrap mb-[20px]">
                    <h5 className="card__heading-title">2X Border Outline Alerts</h5>
                </div>
                <div className="">
                    <div className="alert alert-primary outline-2x">
                        <p>This is a primary alert—check it out!</p>
                    </div>
                    <div className="alert alert-secondary outline-2x">
                        <p>This is a secondary alert—check it out!</p>
                    </div>
                    <div className="alert alert-success outline-2x">
                        <p>This is a success alert—check it out!</p>
                    </div>
                    <div className="alert alert-info outline-2x">
                        <p>This is an info alert—check it out!</p>
                    </div>
                    <div className="alert alert-warning outline-2x">
                        <p>This is a warning alert—check it out!</p>
                    </div>
                    <div className="alert alert-danger outline-2x">
                        <p>This is a danger alert—check it out!</p>
                    </div>
                    <div className="alert alert-light outline-2x">
                        <p>This is a light alert—check it out!</p>
                    </div>
                    <div className="alert alert-dark outline-2x">
                        <p>This is a dark alert—check it out!</p>
                    </div>
                </div>
            </div>
        </>
    );
};

export default DoubleBorderOutline;