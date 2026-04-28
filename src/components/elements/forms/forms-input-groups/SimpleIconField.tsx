"use client";
import Link from "next/link";
import React, { useState } from "react";

const SimpleIconField = () => {
  const [showDropdown, setShowDropdown] = useState(false);
  const handleToggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };
  return (
    <>
      <div className="card__wrapper">
        <div className="card__title-wrap mb-[20px]">
          <h5 className="card__heading-title">Simple Icon Field</h5>
        </div>
        <div className="from__input-box">
          <div className="input-group">
            <span className="input-group-text" id="basic-field2">
              <i className="fa-regular fa-magnifying-glass"></i>
            </span>
            <input
              type="text"
              className="form-control"
              placeholder="Username"
              aria-label="Username"
              aria-describedby="basic-field2"
            />
          </div>
        </div>
        <div className="from__input-box">
          <div className="input-group">
            <span className="input-group-text" id="basic-field3">
              <i className="fa-sharp fa-regular fa-bell"></i>
            </span>
            <input
              type="text"
              className="form-control"
              placeholder="Username"
              aria-label="Username"
              aria-describedby="basic-field3"
            />
          </div>
        </div>
        <div className="from__input-box">
          <div className="input-group">
            <span className="input-group-text" id="basic-field4">
              <i className="fa-duotone fa-spinner"></i>
            </span>
            <input
              type="text"
              className="form-control"
              placeholder="Username"
              aria-label="Username"
              aria-describedby="basic-field4"
            />
          </div>
        </div>
        <div className="input-group">
          <div className="input-group">
            <button
              type="button"
              className={`${
                showDropdown ? "active" : ""
              } btn btn-outline-primary dropdown-toggle-button`}
              onClick={handleToggleDropdown}
            >
              <i className="fa-solid fa-gear"></i>
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
              aria-label="Text input with segmented dropdown button"
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default SimpleIconField;
