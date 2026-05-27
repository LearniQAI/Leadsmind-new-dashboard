"use client";
import React, { useState } from 'react';
import EmailNotification from './EmailNotification';
import Notification from './Notification';
import HeaderUserProfile from './HeaderUserProfile';

const HeaderAction = () => {
  const [isOpenNotification, setIsOpenNotification] = useState<boolean>(false);
  const [isOpenUserDropdown, setUserDropdown] = useState<boolean>(false);

  const handleShowNotification = () => {
    setIsOpenNotification(!isOpenNotification);
    setUserDropdown(false);
  };

  const handleShowUserDrowdown = () => {
    setUserDropdown(!isOpenUserDropdown);
    setIsOpenNotification(false);
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5 mr-2 border-r border-white/5 pr-4">
        <EmailNotification />
        <Notification 
          handleShowNotification={handleShowNotification} 
          isOpenNotification={isOpenNotification} 
        />
      </div>

      <HeaderUserProfile
        handleShowUserDrowdown={handleShowUserDrowdown}
        isOpenUserDropdown={isOpenUserDropdown}
      />
    </div>
  );
};

export default HeaderAction;