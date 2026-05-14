"use client";
import React, { useState } from 'react';
import EmailNotification from './EmailNotification';
import Notification from './Notification';
import HeaderUserProfile from './HeaderUserProfile';

const HeaderAction = () => {
  const [isOpenEmail, setIsOpenEmail] = useState<boolean>(false);
  const [isOpenNotification, setIsOpenNotification] = useState<boolean>(false);
  const [isOpenUserDropdown, setUserDropdown] = useState<boolean>(false);

  const handleShowNotificationEmail = () => {
    setIsOpenEmail(!isOpenEmail);
    setIsOpenNotification(false);
    setUserDropdown(false);
  };

  const handleShowNotification = () => {
    setIsOpenNotification(!isOpenNotification);
    setUserDropdown(false);
    setIsOpenEmail(false);
  };

  const handleShowUserDrowdown = () => {
    setUserDropdown(!isOpenUserDropdown);
    setIsOpenEmail(false);
    setIsOpenNotification(false);
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5 mr-2 border-r border-white/5 pr-4">
        <EmailNotification 
          handleShowNotificationEmail={handleShowNotificationEmail} 
          isOpenEmail={isOpenEmail} 
        />
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