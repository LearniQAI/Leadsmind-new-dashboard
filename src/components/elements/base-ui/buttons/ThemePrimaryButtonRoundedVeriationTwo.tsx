import React from 'react';

const ThemePrimaryButtonRoundedVeriationTwo = () => {
    return (
        <>
            <div className="card__wrapper">
                <div className="card__title-wrap mb-[20px]">
                    <h5 className="card__heading-title">Theme Primary Button Rounded</h5>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button type="submit" className="btn btn-outline-primary radius-pill">Primary</button>
                    <button type="submit" className="btn btn-outline-secondary radius-pill">Secondary</button>
                    <button type="submit" className="btn btn-outline-success radius-pill">Success</button>
                    <button type="submit" className="btn btn-outline-danger radius-pill">Danger</button>
                    <button type="submit" className="btn btn-outline-warning radius-pill">Warning</button>
                    <button type="submit" className="btn btn-outline-info radius-pill">Info</button>
                    <button type="submit" className="btn btn-outline-light radius-pill">Light</button>
                    <button type="submit" className="btn btn-outline-dark radius-pill">Dark</button>
                </div>
            </div>
        </>
    );
};

export default ThemePrimaryButtonRoundedVeriationTwo;