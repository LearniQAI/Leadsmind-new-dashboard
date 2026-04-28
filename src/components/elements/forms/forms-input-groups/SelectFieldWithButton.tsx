'use client'
import React, { useState } from 'react';

const SelectFieldWithButton = () => {
    const [selectedValue1, setSelectedValue1] = useState("");
    const [selectedValue2, setSelectedValue2] = useState("");
    const [selectedValue3, setSelectedValue3] = useState("");
    const [selectedValue4, setSelectedValue4] = useState("");

    return (
        <>
            <div className="card__wrapper">
                <div className="card__title-wrap mb-[20px]">
                    <h5 className="card__heading-title">Select Field with Button</h5>
                </div>
                {/* Select with Label */}
                <div className="from__input-box">
                    <div className="form__input">
                        <div className="input-group">
                            <label className="input-group-text" htmlFor="inputFieldSelect1">Options</label>
                            <select
                                className="form-select"
                                id="inputFieldSelect1"
                                value={selectedValue1}
                                onChange={(e) => setSelectedValue1(e.target.value)}
                            >
                                <option value="">Choose Item...</option>
                                <option value="1">CRM Analytic</option>
                                <option value="2">Banking</option>
                                <option value="3">Crypto</option>
                            </select>
                        </div>
                    </div>
                </div>
                {/* Label after Select */}
                <div className="from__input-box">
                    <div className="form__input">
                        <div className="input-group">
                            <select
                                className="form-select"
                                id="inputFieldSelect2"
                                value={selectedValue2}
                                onChange={(e) => setSelectedValue2(e.target.value)}
                            >
                                <option value="">Choose Item...</option>
                                <option value="1">CRM Analytic</option>
                                <option value="2">Banking</option>
                                <option value="3">Crypto</option>
                            </select>
                            <label className="input-group-text" htmlFor="inputFieldSelect2">Options</label>
                        </div>
                    </div>
                </div>
                {/* Button before Select */}
                <div className="from__input-box">
                    <div className="form__input">
                        <div className="input-group">
                            <button className="btn btn-outline-primary" type="button">Button</button>
                            <select
                                className="form-select"
                                id="inputFieldSelect3"
                                value={selectedValue3}
                                onChange={(e) => setSelectedValue3(e.target.value)}
                            >
                                <option value="">Choose Item...</option>
                                <option value="1">CRM Analytic</option>
                                <option value="2">Banking</option>
                                <option value="3">Crypto</option>
                            </select>
                        </div>
                    </div>
                </div>
                {/* Button after Select */}
                <div className="from__input-box">
                    <div className="form__input">
                        <div className="input-group">
                            <select
                                className="form-select"
                                id="inputFieldSelect4"
                                value={selectedValue4}
                                onChange={(e) => setSelectedValue4(e.target.value)}
                            >
                                <option value="">Choose Item...</option>
                                <option value="1">CRM Analytic</option>
                                <option value="2">Banking</option>
                                <option value="3">Crypto</option>
                            </select>
                            <button className="btn btn-outline-primary" type="button">Button</button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default SelectFieldWithButton;
