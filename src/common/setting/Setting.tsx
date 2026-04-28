"use client";

import useGlobalContext from "@/hooks/use-context";
import { useDirection } from "@/hooks/useDirection";
import React, { useState } from "react";

const Setting = () => {
  const { toggleTheme } = useGlobalContext();
  const { direction, toggleDirection } = useDirection();
  const [openSetting, setOpenSetting] = useState(false);
  // Toggle settings
  const toggleSetting = () => {
    setOpenSetting(!openSetting);
  };

  return (
    <div
      className={`bd-theme-settings-area transition-3 ${
        openSetting ? "settings-opened" : ""
      }`}
    >
      <div className="bd-theme-wrapper">
        <div className="bd-theme-header text-center">
          <h4 className="bd-theme-header-title">Template Settings</h4>
        </div>

        {/* -- THEME TOGGLER -- */}
        <div className="bd-theme-toggle mb-[20px]">
          <label className="bd-theme-toggle-main" htmlFor="bd-theme-toggler">
            <span onClick={toggleTheme} className="bd-theme-toggle-dark">
              <i className="fa-light fa-moon"></i> Dark
            </span>
            <input type="checkbox" id="bd-theme-toggler" />
            <i className="bd-theme-toggle-slide"></i>
            <span
              onClick={toggleTheme}
              className="bd-theme-toggle-light"
            >
              <i className="fa-light fa-sun-bright"></i> Light
            </span>
          </label>
        </div>

        {/* -- RTL SETTINGS  mb-20 -- */}
        <div className="bd-theme-dir">
          <label className="bd-theme-dir-main" htmlFor="bd-dir-toggler">
            <span className="bd-theme-dir-rtl"> RTL</span>
            <input
              type="checkbox"
              id="bd-dir-toggler"
              onChange={toggleDirection}
              checked={direction === "rtl"}
            />
            <i className="bd-theme-dir-slide"></i>
            <span className="bd-theme-dir-ltr active"> LTR</span>
          </label>
        </div>

        <div className="bd-theme-settings">
          <div className="bd-theme-settings-wrapper">
            <div className="bd-theme-settings-open">
              <button
                className="bd-theme-settings-open-btn"
                onClick={toggleSetting}
              >
                <span className="bd-theme-settings-gear">
                  <i className="fa-light fa-gear"></i>
                </span>
                <span className="bd-theme-settings-close">
                  <i className="fa-regular fa-xmark"></i>
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Setting;
