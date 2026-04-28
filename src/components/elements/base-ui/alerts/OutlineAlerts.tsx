import React from 'react';

const OutlineAlerts = () => {
    return (
        <>
            <div className="card__wrapper">
                <div className="card__title-wrap mb-[20px]">
                    <h5 className="card__heading-title">Outline Alerts</h5>
                </div>
                <div className="">
                    <div className="alert alert-primary outline-one" >
                        <p>This is a primary alert—check it out!</p>
                    </div>
                    <div className="alert alert-secondary outline-one" >
                        <p>This is a secondary alert—check it out!</p>
                    </div>
                    <div className="alert alert-success outline-one" >
                        <p>This is a success alert—check it out!</p>
                    </div>
                    <div className="alert alert-info outline-one">
                        <p>This is an info alert—check it out!</p>
                    </div>
                    <div className="alert alert-warning outline-one" >
                        <p>This is a warning alert—check it out!</p>
                    </div>
                    <div className="alert alert-danger outline-one" >
                        <p>This is a danger alert—check it out!</p>
                    </div>
                    <div className="alert alert-light outline-one" >
                        <p>This is a light alert—check it out!</p>
                    </div>
                    <div className="alert alert-dark outline-one" >
                        <p>This is a dark alert—check it out!</p>
                    </div>
                </div>
            </div>
        </>
    );
};

export default OutlineAlerts;