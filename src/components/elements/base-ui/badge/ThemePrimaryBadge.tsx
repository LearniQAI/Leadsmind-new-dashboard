import React from 'react';

const ThemePrimaryBadge = () => {
    return (
        <>
            <div className="card__wrapper">
                <div className="card__title-wrap mb-[20px]">
                    <h5 className="card__heading-title">Theme Primary Badges</h5>
                </div>
                <div className="flex flex-wrap gap-2">
                    <span className="bd-badge bg-primary">Primary</span>
                    <span className="bd-badge bg-secondary">Secondary</span>
                    <span className="bd-badge bg-success">Success</span>
                    <span className="bd-badge bg-danger">Danger</span>
                    <span className="bd-badge bg-warning">Warning</span>
                    <span className="bd-badge bg-info">Info</span>
                    <span className="bd-badge bg-light">Light</span>
                    <span className="bd-badge bg-dark text-white">Dark</span>
                </div>
            </div>
        </>
    );
};

export default ThemePrimaryBadge;