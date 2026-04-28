import React from 'react';

const ThemePrimaryButtonsVariationTwo = () => {
    return (
        <>
            <div className="card__wrapper">
                <div className="card__title-wrap mb-[20px]">
                    <h5 className="card__heading-title">Theme Primary Button</h5>
                </div>
                <div className="elements-button-gap">
                    <button type="submit" className="btn btn-primary btn-xs">Button XS</button>
                    <button type="submit" className="btn btn-success btn-md">Button MD</button>
                    <button type="submit" className="btn btn-danger btn-lg">Button LG</button>
                    <button type="submit" className="btn btn-warning btn-xl">Button XL</button>
                    <button type="submit" className="btn btn-info btn-xxl">Button XXl</button>
                </div>
            </div>
        </>
    );
};

export default ThemePrimaryButtonsVariationTwo;