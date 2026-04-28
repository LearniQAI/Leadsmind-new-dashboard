
import Link from 'next/link';
import React  from 'react';
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
                                <div key={index} className="notification__item">
                                    <div className="notification__thumb">
                                        <Link href={notification.profileLink}>
                                            <Image src={notification.avatar} alt="image not found" />
                                        </Link>
                                    </div>
                                    <div className="notification__content">
                                        <p>
                                            <Link href={notification.messageLink}>{notification.message}</Link>
                                        </p>
                                        <div className="notification__time">
                                            <span>{notification.time}</span>
                                            <span className="status">{notification.status}</span>
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
