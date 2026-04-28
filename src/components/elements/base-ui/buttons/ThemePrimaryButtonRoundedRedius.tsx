import React from 'react';

const ThemePrimaryButtonRoundedRedius = () => {
    return (
        <>
            <div className="card__wrapper">
                <div className="card__title-wrap mb-[20px]">
                    <h5 className="card__heading-title">Theme Primary Button Rounded</h5>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button type="submit" className="btn btn-primary border-radius-none">Primary</button>
                    <button type="submit" className="btn btn-secondary border-radius-none">Secondary</button>
                    <button type="submit" className="btn btn-success border-radius-none">Success</button>
                    <button type="submit" className="btn btn-danger border-radius-none">Danger</button>
                    <button type="submit" className="btn btn-warning border-radius-none">Warning</button>
                    <button type="submit" className="btn btn-info border-radius-none">Info</button>
                    <button type="submit" className="btn btn-light border-radius-none">Light</button>
                    <button type="submit" className="btn btn-dark border-radius-none">Dark</button>
                </div>
            </div>
        </>
    );
};

export default ThemePrimaryButtonRoundedRedius;