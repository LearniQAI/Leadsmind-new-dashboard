'use client'
import Link from 'next/link';
import React, { useState } from 'react';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';

const ActionButtonWithDropdown = () => {
    const [showDropdown, setShowDropdown] = useState(false);
    const handleToggleDropdown = () => {
        setShowDropdown(!showDropdown)
    }
    const [showDropdownTwo, setShowDropdownTwo] = useState(false);
    const handleToggleDropdownTwo = () => {
        setShowDropdownTwo(!showDropdownTwo)
    }
    const [showDropdownThree, setShowDropdownThree] = useState(false);
    const handleToggleDropdownThree = () => {
        setShowDropdownThree(!showDropdownThree)
    }
    return (
        <>
            <div className="card__wrapper">
                <div className="card__title-wrap mb-[20px]">
                    <h5 className="card__heading-title">Action Button With Dropdown</h5>
                </div>
                <div className="from__input-box">
                    <div className="input-group">
                        <input type="text" className="form-control" aria-label="Text input with dropdown button" />
                        <button type="button" className="btn btn-outline-primary">Action</button>
                        <button
                            type="button"
                            className={`${showDropdown ? 'active' : ''} btn btn-outline-primary dropdown-toggle dropdown-toggle-split`}
                            onClick={handleToggleDropdown}
                        >
                            <span className="visually-hidden"><KeyboardArrowDownIcon /></span>
                            <ul className={`dropdown-menu-end ${!showDropdown ? 'hidden' : ''}`}>
                                <li><button className="dropdown__item">Action</button></li>
                                <li><button className="dropdown__item">More Action</button></li>
                                <li><button className="dropdown__item">Another Action</button></li>
                            </ul>
                        </button>
                    </div>
                </div>
                <div className="from__input-box">
                    <div className="input-group">
                        <button type="button" className="btn btn-outline-primary">Action</button>
                        <button
                            type="button"
                            className={`${showDropdownTwo ? 'active' : ''} btn btn-outline-primary dropdown-toggle dropdown-toggle-split`}
                            onClick={handleToggleDropdownTwo}
                        >
                            <span className="visually-hidden"><KeyboardArrowDownIcon /></span>
                            <ul className={` dropdown-menu-start ${!showDropdownTwo ? 'hidden' : ''}`}>
                                <li><Link className="dropdown__item" href="#">Action</Link></li>
                                <li><Link className="dropdown__item" href="#">More Action</Link></li>
                                <li><Link className="dropdown__item" href="#">Another Action</Link></li>
                            </ul>
                        </button>
                        <input type="text" className="form-control" aria-label="Text input with dropdown button" />
                    </div>
                </div>
                <div className="from__input-box">
                    <div className="input-group">
                        <button type="button" className="btn btn-outline-primary">Action</button>
                        <input type="text" className="form-control" aria-label="Text input with dropdown button" />
                        <button
                            type="button"
                            className={`${showDropdownThree ? 'active' : ''} btn btn-outline-primary dropdown-toggle dropdown-toggle-split`}
                            onClick={handleToggleDropdownThree}
                        >
                            <span className="visually-hidden"><KeyboardArrowDownIcon /></span>
                            <ul className={`dropdown-menu-end ${!showDropdownThree ? 'hidden' : ''}`}>
                                <li><Link className="dropdown__item" href="#">Action</Link></li>
                                <li><Link className="dropdown__item" href="#">More Action</Link></li>
                                <li><Link className="dropdown__item" href="#">Another Action</Link></li>
                                <li>
                                    <hr className="dropdown-divider" />
                                </li>
                                <li><Link className="dropdown__item" href="#">Separated link</Link></li>
                            </ul>
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ActionButtonWithDropdown;