import React from 'react';

const ThemePrimaryButtonOutline = () => {
    return (
        <>
            <div className="card__wrapper">
                <div className="card__title-wrap mb-[20px]">
                    <h5 className="card__heading-title">Theme Primary Button Outline</h5>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button type="submit" className="btn btn-outline-primary">Primary</button>
                    <button type="submit" className="btn btn-outline-secondary">Secondary</button>
                    <button type="submit" className="btn btn-outline-success">Success</button>
                    <button type="submit" className="btn btn-outline-danger">Danger</button>
                    <button type="submit" className="btn btn-outline-warning">Warning</button>
                    <button type="submit" className="btn btn-outline-info">Info</button>
                    <button type="submit" className="btn btn-outline-light">Light</button>
                    <button type="submit" className="btn btn-outline-dark">Dark</button>
                </div>
            </div>
        </>
    );
};

export default ThemePrimaryButtonOutline;