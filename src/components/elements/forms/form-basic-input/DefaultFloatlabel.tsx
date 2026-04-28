import React from 'react';

const DefaultFloatlabel = () => {
    return (
        <>
            <div className="card__wrapper no-height">
                <div className="card__title-wrap mb-2.5">
                    <h5 className="card__heading-title">Default Float label</h5>
                </div>
                <div className="form-floating">
                    <input type="text" className="form-control" id="floatingInput"/>
                        <label htmlFor="floatingInput">Full Name</label>
                </div>
            </div>
        </>
    );
};

export default DefaultFloatlabel;   