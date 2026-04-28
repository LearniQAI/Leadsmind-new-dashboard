
import React from 'react';

const ThemeLightAlert = () => {

    return (
        <>
            <div className="card__wrapper">
                <div className="card__title-wrap mb-[20px]">
                    <h5 className="card__heading-title">Theme Light Alerts</h5>
                </div>
                <div className="">
                    <div className="alert alert-primary">
                        <p>This is a primary alert—check it out!</p>
                    </div>
                    <div className="alert alert-secondary">
                        <p>This is a secondary alert—check it out!</p>
                    </div>
                    <div className="alert alert-success">
                        <p>This is a success alert—check it out!</p>
                    </div>
                    <div className="alert alert-info">
                        <p>This is an info alert—check it out!</p>
                    </div>
                    <div className="alert alert-warning">
                        <p>This is a warning alert—check it out!</p>
                    </div>
                    <div className="alert alert-danger">
                        <p>This is a danger alert—check it out!</p>
                    </div>
                    <div className="alert alert-light">
                        <p>This is a light alert—check it out!</p>
                    </div>
                    <div className="alert alert-dark">
                        <p>This is a dark alert—check it out!</p>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ThemeLightAlert;