
import Link from 'next/link';
import React from 'react';
import Image from 'next/image';
import { emailNotifications } from '@/data/notification-data';
import EmailIconTwo from '@/svg/header-svg/EmailIconTwo';
// types
type TEmailProps={
  handleShowNotificationEmail: () => void;
  isOpenEmail: boolean
}
const EmailNotification = ({handleShowNotificationEmail, isOpenEmail}:TEmailProps) => {

  return (
    <li>
      <div className="nav-item relative">
        {/* Clickable email icon */}
        <div className="notification__icon cursor-pointer" onClick={handleShowNotificationEmail}>
         <EmailIconTwo/>
        </div>
        {/* Conditional rendering of the dropdown */}
        {isOpenEmail && (
          <div className={`email__dropdown ${isOpenEmail ? "email-enable" : " "}`}>
          <div className='common-scrollbar h-[420px] overflow-y-auto card__scroll'>
          <div className="notification__header">
                <div className="notification__inner">
                  <h5>Email Notifications</h5>
                  <span>({emailNotifications.length})</span>
                </div>
              </div>
              {/* Rendering email notifications */}
              {emailNotifications.map((notification, index) => (
                <div key={index} className="notification__item hover:bg-white/5 p-3 rounded-xl transition-all cursor-pointer">
                  <div className="notification__thumb">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-black text-sm shadow-inner">
                      {notification.message?.[0]?.toUpperCase() || 'M'}
                    </div>
                  </div>
                  <div className="notification__content ml-3">
                    <p className="text-xs text-white/80 font-medium line-clamp-2">
                      <Link href="/apps/email-inbox">{notification.message}</Link>
                    </p>
                    <div className="notification__time flex items-center justify-between mt-2">
                      <span className="text-[9px] text-white/40 uppercase tracking-widest">{notification.time}</span>
                      <span className="status text-[8px] bg-primary/20 text-primary px-2 py-0.5 rounded-full uppercase tracking-widest">{notification.status}</span>
                    </div>
                  </div>
                </div>
              ))}
          </div>
          </div>
        )}
      </div>
    </li>
  );
};

export default EmailNotification;
