import React from 'react';

const LightBadgesBorder = () => {
    return (
        <>
            <div className="card__wrapper">
                <div className="card__title-wrap mb-[20px]">
                    <h5 className="card__heading-title">Light Badges</h5>
                </div>
                <div className="flex flex-wrap gap-2">
                    <span className="alert-badge bg-primary/50">Primary</span>
                    <span className="alert-badge bg-secondary/50">Secondary</span>
                    <span className="alert-badge bg-success/50">Success</span>
                    <span className="alert-badge bg-danger/50">Danger</span>
                    <span className="alert-badge bg-warning/50">Warning</span>
                    <span className="alert-badge bg-info/50">Info</span>
                    <span className="alert-badge bg-light/50">Light</span>
                    <span className="alert-badge bg-dark/50">Dark</span>
                </div>
            </div>
        </>
    );
};

export default LightBadgesBorder;

