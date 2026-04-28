import React from 'react';

const ThemePrimaryButtons = () => {
    return (
        <>
            <div className="card__wrapper">
                <div className="card__title-wrap mb-[20px]">
                    <h5 className="card__heading-title">Theme Primary Button</h5>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button type="submit" className="btn btn-primary">Primary</button>
                    <button type="submit" className="btn btn-secondary">Secondary</button>
                    <button type="submit" className="btn btn-success">Success</button>
                    <button type="submit" className="btn btn-danger">Danger</button>
                    <button type="submit" className="btn btn-warning">Warning</button>
                    <button type="submit" className="btn btn-info">Info</button>
                    <button type="submit" className="btn btn-light">Light</button>
                    <button type="submit" className="btn btn-dark">Dark</button>
                </div>
            </div>
        </>
    );
};

export default ThemePrimaryButtons;