"use client";
import Link from "next/link";
import React, { useState } from "react";

const DropDownButton = () => {
  const [showDropdown, setShowDropdown] = useState(false);
  const handleToggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };
  const [showDropdownTwo, setShowDropdownTwo] = useState(false);
  const handleToggleDropdownTwo = () => {
    setShowDropdownTwo(!showDropdownTwo);
  };
  const [showDropdownThree, setShowDropdownThree] = useState(false);
  const handleToggleDropdownThree = () => {
    setShowDropdownThree(!showDropdownThree);
  };
  const [showDropdownFour, setShowDropdownFour] = useState(false);
  const handleToggleDropdownFour = () => {
    setShowDropdownFour(!showDropdownFour);
  };
  const [showDropdownFive, setShowDropdownFive] = useState(false);
  const handleToggleDropdownFive = () => {
    setShowDropdownFive(!showDropdownFive);
  };
  const [showDropdownSix, setShowDropdownSix] = useState(false);
  const handleToggleDropdownSix = () => {
    setShowDropdownSix(!showDropdownSix);
  };

  return (
    <>
      <div className="card__wrapper form__element-xs">
        <div className="card__title-wrap mb-[20px]">
          <h5 className="card__heading-title">Dropdowns Button</h5>
        </div>
        <div className="from__input-box">
          <div className="form__input">
            <div className="input-group">
              <button
                onClick={handleToggleDropdown}
                type="button"
                className={`${
                  showDropdown ? "active" : ""
                } btn btn-outline-primary dropdown-toggle-button`}
              >
                Dropdown
                <ul
                  className={`dropdown-menu-start ${
                    !showDropdown ? "hidden" : ""
                  }`}
                >
                  <li>
                    <Link className="dropdown__item" href="#">
                      Action
                    </Link>
                  </li>
                  <li>
                    <Link className="dropdown__item" href="#">
                      More Action
                    </Link>
                  </li>
                  <li>
                    <Link className="dropdown__item" href="#">
                      Another Action
                    </Link>
                  </li>
                </ul>
              </button>
              <input
                type="text"
                className="form-control"
                aria-label="Text input with dropdown button"
              />
            </div>
          </div>
        </div>
        <div className="from__input-box">
          <div className="form__input">
            <div className="input-group">
              <input
                type="text"
                className="form-control"
                aria-label="Text input with dropdown button"
              />
              <button
                className={`${
                  showDropdownTwo ? "active" : ""
                } btn btn-outline-primary dropdown-toggle-button`}
                type="button"
                onClick={handleToggleDropdownTwo}
              >
                Dropdown
                <ul
                  className={`dropdown-menu-start ${
                    !showDropdownTwo ? "hidden" : ""
                  }`}
                >
                  <li>
                    <Link className="dropdown__item" href="#">
                      Action
                    </Link>
                  </li>
                  <li>
                    <Link className="dropdown__item" href="#">
                      More Action
                    </Link>
                  </li>
                  <li>
                    <Link className="dropdown__item" href="#">
                      Another Action
                    </Link>
                  </li>
                </ul>
              </button>
            </div>
          </div>
        </div>
        <div className="from__input-box">
          <div className="form__input">
            <div className="input-group form__element-xs">
              <button
                className={`${
                  showDropdownThree ? "active" : ""
                } btn btn-outline-primary dropdown-toggle-button`}
                type="button"
                onClick={handleToggleDropdownThree}
              >
                Dropdown
                <ul
                  className={`dropdown-menu-start ${
                    !showDropdownThree ? "hidden" : ""
                  }`}
                >
                  <li>
                    <Link className="dropdown__item" href="#">
                      Action
                    </Link>
                  </li>
                  <li>
                    <Link className="dropdown__item" href="#">
                      More Action
                    </Link>
                  </li>
                  <li>
                    <Link className="dropdown__item" href="#">
                      Another Action
                    </Link>
                  </li>
                </ul>
              </button>
              <button
                className={`${
                  showDropdownFour ? "active" : ""
                } btn btn-outline-primary dropdown-toggle-button`}
                type="button"
                onClick={handleToggleDropdownFour}
              >
                Dropdown
                <ul
                  className={`dropdown-menu-start ${
                    !showDropdownFour ? "hidden" : ""
                  }`}
                >
                  <li>
                    <Link className="dropdown__item" href="#">
                      Action
                    </Link>
                  </li>
                  <li>
                    <Link className="dropdown__item" href="#">
                      More Action
                    </Link>
                  </li>
                  <li>
                    <Link className="dropdown__item" href="#">
                      Another Action
                    </Link>
                  </li>
                </ul>
              </button>
              <input
                type="text"
                className="form-control"
                aria-label="Text input with dropdown button"
              />
            </div>
          </div>
        </div>
        <div className="from__input-box">
          <div className="form__input">
            <div className="input-group form__element-xs">
              <button
                className={`${
                  showDropdownFive ? "active" : ""
                } btn btn-outline-primary dropdown-toggle-button`}
                type="button"
                onClick={handleToggleDropdownFive}
              >
                Dropdown
                <ul
                  className={`dropdown-menu-start ${
                    !showDropdownFive ? "hidden" : ""
                  }`}
                >
                  <li>
                    <Link className="dropdown__item" href="#">
                      Action
                    </Link>
                  </li>
                  <li>
                    <Link className="dropdown__item" href="#">
                      More Action
                    </Link>
                  </li>
                  <li>
                    <Link className="dropdown__item" href="#">
                      Another Action
                    </Link>
                  </li>
                </ul>
              </button>
              <input
                type="text"
                className="form-control"
                aria-label="Text input with 2 dropdown buttons"
              />
              <button
                className={`${
                  showDropdownSix ? "active" : ""
                } btn btn-outline-primary dropdown-toggle-button`}
                type="button"
                onClick={handleToggleDropdownSix}
              >
                Dropdown
                <ul
                  className={`dropdown-menu-start ${
                    !showDropdownSix ? "hidden" : ""
                  }`}
                >
                  <li>
                    <Link className="dropdown__item" href="#">
                      Action
                    </Link>
                  </li>
                  <li>
                    <Link className="dropdown__item" href="#">
                      More Action
                    </Link>
                  </li>
                  <li>
                    <Link className="dropdown__item" href="#">
                      Another Action
                    </Link>
                  </li>
                  <li>
                    <hr className="dropdown-divider" />
                  </li>
                  <li>
                    <Link className="dropdown__item" href="#">
                      Separated link
                    </Link>
                  </li>
                </ul>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default DropDownButton;
