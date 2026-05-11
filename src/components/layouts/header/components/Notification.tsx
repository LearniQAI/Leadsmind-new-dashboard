import { notificationsData } from "@/data/notification-data";
import NotificationSvg from "@/svg/header-svg/Profile/Notification";
import Image from "next/image";
import Link from "next/link";
import React from "react";
//types
type TNotificationProps = {
 handleShowNotification: () => void;
 isOpenNotification: boolean;
};

const Notification = ({
 handleShowNotification,
 isOpenNotification,
}: TNotificationProps) => {
 return (
  <li>
   <div className="nav-item relative">
    <button id="notifydropdown" className="flex">
     {/* Clickable notification icon */}
     <div className="notification__icon cursor-pointer" onClick={handleShowNotification}>
      <NotificationSvg />
     </div>
    </button>
    {/* Conditional rendering of the dropdown */}
    {isOpenNotification && (
     <div
      className={`notification__dropdown item-two ${
       isOpenNotification ? "email-enable" : " "
      }`}
     >
      <div className="common-scrollbar h-[420px] overflow-y-auto card__scroll">
       <div className="notification__header">
        <div className="notification__inner">
         <h5>Notifications</h5>
         <span>({notificationsData.length})</span>
        </div>
       </div>
       {/* Rendering notifications */}
       {notificationsData.map((notification, index) => (
        <div className="notification__item hover:bg-white/5 p-3 rounded-xl transition-all cursor-pointer" key={notification.id}>
         <div className="notification__thumb">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-success to-emerald-500 flex items-center justify-center text-white font-black text-sm shadow-inner">
           {notification.category?.[0]?.toUpperCase() || 'S'}
          </div>
         </div>
         <div className="notification__content ml-3">
          <Link
           href={`/project/project-details/${index + 1}`}
           className="text-xs text-white/80 font-medium line-clamp-2 hover:text-primary transition-colors"
          >{`${notification.category}: ${notification.message}`}</Link>
          <div className="notification__time flex items-center justify-between mt-2">
           <span className="text-[9px] text-white/40 uppercase tracking-widest">{notification.time}</span>
           <span className="status text-[8px] bg-success/20 text-success px-2 py-0.5 rounded-full uppercase tracking-widest">{notification.category}</span>
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

export default Notification;
