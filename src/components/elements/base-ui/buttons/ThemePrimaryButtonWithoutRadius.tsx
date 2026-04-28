import React from 'react';

const ThemePrimaryButtonWithoutRadius = () => {
    return (
        <>
            <div className="card__wrapper">
                <div className="card__title-wrap mb-[20px]">
                    <h5 className="card__heading-title">Theme Primary Button Without Radius</h5>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button type="submit" className="btn btn-outline-primary border-radius-none">Primary</button>
                    <button type="submit" className="btn btn-outline-secondary border-radius-none">Secondary</button>
                    <button type="submit" className="btn btn-outline-success border-radius-none">Success</button>
                    <button type="submit" className="btn btn-outline-danger border-radius-none">Danger</button>
                    <button type="submit" className="btn btn-outline-warning border-radius-none">Warning</button>
                    <button type="submit" className="btn btn-outline-info border-radius-none">Info</button>
                    <button type="submit" className="btn btn-outline-light border-radius-none">Light</button>
                    <button type="submit" className="btn btn-outline-dark border-radius-none">Dark</button>
                </div>
            </div>
        </>
    );
};

export default ThemePrimaryButtonWithoutRadius;