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
                <div className="notification__item" key={notification.id}>
                  <div className="notification__thumb">
                    <Link href="/employee-profile">
                      <Image src={notification.image} alt="image not found" />
                    </Link>
                  </div>
                  <div className="notification__content">
                    <Link
                      href={`/project/project-details/${index + 1}`}
                    >{`${notification.category}: ${notification.message}`}</Link>
                    <div className="notification__time">
                      <span>{notification.time}</span>
                      <span className="status">{notification.category}</span>
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
