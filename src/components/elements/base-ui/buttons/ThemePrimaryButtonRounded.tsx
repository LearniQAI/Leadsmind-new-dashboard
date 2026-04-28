import React from 'react';

const ThemePrimaryButtonRounded = () => {
    return (
        <>
            <div className="card__wrapper">
                <div className="card__title-wrap mb-[20px]">
                    <h5 className="card__heading-title">Theme Primary Button Rounded</h5>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button type="submit" className="btn btn-primary radius-pill">Primary</button>
                    <button type="submit" className="btn btn-secondary radius-pill">Secondary</button>
                    <button type="submit" className="btn btn-success radius-pill">Success</button>
                    <button type="submit" className="btn btn-danger radius-pill">Danger</button>
                    <button type="submit" className="btn btn-warning radius-pill">Warning</button>
                    <button type="submit" className="btn btn-info radius-pill">Info</button>
                    <button type="submit" className="btn btn-light radius-pill">Light</button>
                    <button type="submit" className="btn btn-dark radius-pill">Dark</button>
                </div>
            </div>
        </>
    );
};

export default ThemePrimaryButtonRounded;