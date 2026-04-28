"use client"
import CustomDropdown from '@/components/dropdown/CustomDropdown';
import { dropdownItems } from '@/data/dropdown-data';
import Link from 'next/link';
import React from 'react';

type INotification = {
    id: number,
    name: string;
    date: string;
    content: string;
    link: string;
}

const notifications: INotification[] = [
    {
        id: 1,
        name: 'Jane D. Smith',
        date: 'Jul 13, 2024',
        content: 'Our latest HRM update focuses on enhancing employee engagement through new interactive platforms and personalized feedback systems.',
        link: '#',
    },
    {
        id: 2,
        name: 'Jane D. Smith',
        date: 'Jul 13, 2024',
        content: 'Discover how our HRM solutions are driving productivity with innovative time management and collaboration tools.',
        link: '#',
    },
    {
        id: 3,
        name: 'Michael B. Jordan',
        date: 'Jul 13, 2024',
        content: 'Our CRM system now includes advanced analytics to better understand customer behavior and improve service delivery.',
        link: '#',
    },
    {
        id: 4,
        name: 'Michael B. Jordan',
        date: 'Jul 13, 2024',
        content: 'Learn about our new CRM features that streamline customer communication and enhance satisfaction.',
        link: '#',
    },
    {
        id: 5,
        name: 'Lisa R. Brown',
        date: 'Jul 13, 2024',
        content: 'Introducing new training modules designed to keep your team updated with the latest HRM best practices.',
        link: '#',
    },
    {
        id: 6,
        name: 'Lisa R. Brown',
        date: 'Jul 13, 2024',
        content: 'Enhance your CRM experience with our new user-friendly interface and seamless integration options.',
        link: '#',
    },
];

const Notification = () => {
    return (
        <>
            <div className="card__wrapper no-height">
                <div className="card__title-wrap flex items-center justify-between mb-[20px]">
                    <h5 className="card__heading-title">Notifications</h5>
                    <CustomDropdown items={dropdownItems} />
                </div>
                <div className='common-scrollbar h-[575px] overflow-y-auto'>
                    <div className="card__inner">
                        <div className="card__noticeboard-wrapper">
                            {notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    className="card__noticeboard-box mb-[20px]"
                                >
                                    <div className="card__noticeboard-content">
                                        <h5 className="seller__name small font-semibold mb-[5px]">
                                            {notification.name}
                                        </h5>
                                        <span>{notification.date}</span>
                                        <p>{notification.content}</p>
                                        <Link href={notification.link} className="btn-text">
                                            Read More{' '}
                                            <span>
                                                <i className="fa-regular fa-arrow-right"></i>
                                            </span>
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Notification;
