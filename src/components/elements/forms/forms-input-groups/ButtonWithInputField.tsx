import React from 'react';

const ButtonWithInputField = () => {
    return (
        <>
            <div className="card__wrapper form__element-xs">
                <div className="card__title-wrap mb-[20px]">
                    <h5 className="card__heading-title">Button With Input Field</h5>
                </div>
                <div className="from__input-box">
                    <div className="form__input">
                        <div className="input-group form__element-xs">
                            <button className="btn btn-outline-primary" type="button" id="button-left-side">Button</button>
                            <input type="text" className="form-control" placeholder="Left Side Button" aria-label="Text with button" aria-describedby="button-left-side"/>
                        </div>
                    </div>
                </div>
                <div className="from__input-box">
                    <div className="form__input">
                        <div className="input-group form__element-xs">
                            <button className="btn btn-outline-primary" type="button">Button</button>
                            <button className="btn btn-outline-primary" type="button">Button</button>
                            <input type="text" className="form-control" placeholder="Left Side Double Button" aria-label="Text with double button"/>
                        </div>
                    </div>
                </div>
                <div className="from__input-box">
                    <div className="form__input">
                        <div className="input-group form__element-xs">
                            <input type="text" className="form-control" placeholder="Right Side Button" aria-label="Text with button" aria-describedby="button-right-side"/>
                                <button className="btn btn-outline-primary" type="button" id="button-right-side">Button</button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ButtonWithInputField;