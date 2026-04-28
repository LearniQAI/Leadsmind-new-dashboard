import React from 'react';

const BadgesWithoutBorder = () => {
    return (
        <>
            <div className="card__wrapper">
                <div className="card__title-wrap mb-[20px]">
                    <h5 className="card__heading-title">Badges Without Border Radius</h5>
                </div>
                <div className="flex flex-wrap gap-2">
                    <span className="bd-badge border-radius-none bg-primary">Primary</span>
                    <span className="bd-badge border-radius-none bg-secondary">Secondary</span>
                    <span className="bd-badge border-radius-none bg-success">Success</span>
                    <span className="bd-badge border-radius-none bg-danger">Danger</span>
                    <span className="bd-badge border-radius-none bg-warning">Warning</span>
                    <span className="bd-badge border-radius-none bg-info">Info</span>
                    <span className="bd-badge border-radius-none bg-light">Light</span>
                    <span className="bd-badge border-radius-none bg-dark text-white">Dark</span>
                </div>
            </div>
        </>
    );
};

export default BadgesWithoutBorder;