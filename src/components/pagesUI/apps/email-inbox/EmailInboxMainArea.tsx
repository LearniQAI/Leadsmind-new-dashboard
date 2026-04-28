"use client"
import Image from "next/image";
import Link from "next/link";
import React, { useState } from "react";
import avatar1 from "../../../../../public/assets/images/avatar/avatar.png";
import { Box, Tab, Tabs } from "@mui/material";
import EmailInboxTable from "./EmailInboxTable";
import {  primaryEmailTabs, secondaryEmailTabs } from "@/data/apps/email-data";

const EmailInboxMainArea = () => {
  const [value, setValue] = useState<number>(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isOpenInbox, setIsOpenInbox] = useState(false);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };
  const toggleDropdownInbox = () => {
    setIsOpenInbox(!isOpenInbox);
  };
  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };
  return (
    <>
      {/* -- App side area start -- */}
      <div className="app__slide-wrapper">
        <div className="email__section">
          <div className="grid grid-cols-12 gap-5 maxXs:gap-x-0">
            <div className="col-span-12 md:col-span-6 xl:col-span-4 xxl:col-span-3">
              <div className="email__sidebar">
                <button type="button" className="btn btn-primary rounded-pill email__toggle-btn" onClick={(e) => {toggleDropdownInbox()}}>
                  email filter</button>
                <div className={`email__left-side ${isOpenInbox === true ? "open" : ""}`}>
                  <div className="card__wrapper">
                    <div className="email__left-sidebar">
                      <div className="media flex-wrap items-center mb-5">
                        <div className="media-size-email"><Image className="w-[50px] border-circle me-[10px]" src={avatar1} alt="image" /></div>
                        <div className="media-body">
                          <h6 className="f-w-600">Jhon Smith</h6>
                          <p>jhonsmith@manez.com</p>
                        </div>
                      </div>
                      <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                        <Tabs
                          value={value}
                          onChange={handleChange}
                          orientation="vertical"
                          variant="scrollable"
                        >
                          {primaryEmailTabs.map((email, index) => (
                            <Tab key={index}
                              label={
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                  <span className="flex items-center">
                                    <i className={`${email.icon} me-3`} />
                                    {email.label}
                                  </span>
                                  {email.count !== null && (
                                    <span className="email__left-meta">{email.count}</span>
                                  )}
                                </Box>
                              }
                            />
                          ))}
                          <div className="divider"></div>
                          {secondaryEmailTabs.map((email, index) => (
                            <Tab key={index}
                              label={
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                  <span className="flex items-center">
                                    <i className={`${email.icon} me-3`} />
                                    {email.label}
                                  </span>
                                  {email.count !== null && (
                                    <span className="email__left-meta">{email.count}</span>
                                  )}
                                </Box>
                              }
                            />
                          ))}
                        </Tabs>
                      </Box>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-span-12 xl:col-span-8 xxl:col-span-9 xl-70">
              <div className="email-right-aside">
                <div className="card__wrapper style_four email-body">
                  <div className="email__profile">
                    <div className="email-top ps-5">
                      <div className="grid grid-cols-12">
                        <div className="col-span-12">
                          <div className="media items-center">
                            <label className="email-chek block">
                              <input className="checkbox_animated" type="checkbox" />
                            </label>
                            <label className="email-reload block">
                              <span><i className="fa-solid fa-rotate-right"></i></span>
                            </label>
                            <div className="media-body">
                              <div className="dropdown style_two">
                                <button onClick={toggleDropdown}><i
                                  className="fa-regular fa-ellipsis-vertical"></i></button>
                                {/* Dropdown Menu */}
                                {isOpen && (
                                  <div
                                    className="absolute mt-2 w-48 bg-white dark:bg-card-dark border dark:border-dark border-gray-200 rounded-lg shadow-lg z-10"
                                  >
                                    <Link href="#" className="block px-4 py-2 text-headingPrimary dark:text-headingPrimary-dark  hover:bg-gray-100 dark:hover:bg-bgLightest-dark">
                                      Mark all as read
                                    </Link>
                                    <Link href="#" className="block px-4 py-2 text-headingPrimary dark:text-headingPrimary-dark hover:bg-gray-100 dark:hover:bg-bgLightest-dark">
                                      Mark as important
                                    </Link>
                                    <Link href="#" className="block px-4 py-2 text-headingPrimary dark:text-headingPrimary-dark hover:bg-gray-100 dark:hover:bg-bgLightest-dark">
                                      Important Notes
                                    </Link>
                                    <Link href="#" className="block px-4 py-2 text-headingPrimary dark:text-headingPrimary-dark hover:bg-gray-100 dark:hover:bg-bgLightest-dark">
                                      Move to trash
                                    </Link>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="email__inbox">
                      <EmailInboxTable />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* -- App side area end -- */}
    </>
  );
};

export default EmailInboxMainArea;
