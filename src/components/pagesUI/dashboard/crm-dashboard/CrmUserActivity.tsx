"use client"
import CustomDropdown from '@/components/dropdown/CustomDropdown';
import { dropdownItems } from '@/data/dropdown-data';
import Image from 'next/image';
import React from 'react';
import avatar1 from "../../../../../public/assets/images/avatar/avatar1.png";
import avatar2 from "../../../../../public/assets/images/avatar/avatar2.png";
import avatar3 from "../../../../../public/assets/images/avatar/avatar3.png";

const CrmUserActivity = () => {
    return (
        <>
            <div className="card__wrapper no-height">
                <div className="card__title-wrap flex items-center justify-between mb-[20px]">
                    <h5 className="card__heading-title">User Activity</h5>
                    <CustomDropdown items={dropdownItems} />
                </div>
                <ul className="timeline">
                    {/* -- Timeline Item 1 -- */}
                    <li className="timeline__item flex gap-[10px]">
                        <div className="timeline__icon"><span><i className="fa-light fa-user"></i></span></div>
                        <div className="timeline__content w-full">
                            <div className="flex flex-wrap gap-[10px] items-center justify-between">
                                <h5 className="small">New Employee Onboarded</h5>
                                <span className="bd-badge bg-success">04 Mins Ago</span>
                            </div>
                            <p>Welcome our new team member to the company</p>
                            <div className="timeline__thumb flex gap-1">
                                <Image className="w-[48px] rounded-[50%]" src={avatar1} alt="image" />
                                <Image className="w-[48px] rounded-[50%]" src={avatar2} alt="image" />
                                <Image className="w-[48px] rounded-[50%]" src={avatar3} alt="image" />
                            </div>
                        </div>
                    </li>

                    {/* -- Timeline Item 2 -- */}
                    <li className="timeline__item flex gap-[10px]">
                        <div className="timeline__icon"><span><i className="fa-light fa-address-book"></i></span></div>
                        <div className="timeline__content w-full">
                            <div className="flex flex-wrap gap-[10px] items-center justify-between">
                                <h5 className="small">Customer Feedback Received</h5>
                                <span className="bd-badge bg-success">10 Mins Ago</span>
                            </div>
                            <p>We received positive feedback from our clients</p>
                            <div className="avatar">
                                <ul>
                                    <li><Image className="w-[48px] rounded-[50%]" src={avatar1} alt="image" /></li>
                                    <li><Image className="w-[48px] rounded-[50%]" src={avatar2} alt="image" /></li>
                                    <li><Image className="w-[48px] rounded-[50%]" src={avatar3} alt="image" /></li>
                                </ul>
                            </div>
                        </div>
                    </li>

                    {/* -- Timeline Item 3 -- */}
                    <li className="timeline__item flex gap-[10px]">
                        <div className="timeline__icon"><span><i className="fa-light fa-user-clock"></i></span></div>
                        <div className="timeline__content w-full">
                            <div className="flex flex-wrap gap-[10px] items-center justify-between">
                                <h5 className="small">Performance Review Reminder</h5>
                                <span className="bd-badge bg-warning">2 Hours Ago</span>
                            </div>
                            <p><span className="text-danger underline">3 days left</span> for completing performance reviews</p>
                        </div>
                    </li>

                    {/* -- Timeline Item 4 -- */}
                    <li className="timeline__item flex gap-[10px]">
                        <div className="timeline__icon"><span><i className="fa-light fa-briefcase"></i></span></div>
                        <div className="timeline__content w-full">
                            <div className="flex flex-wrap gap-[10px] items-center justify-between">
                                <h5 className="small">New Client Acquired</h5>
                                <span className="bd-badge bg-success">1 Day Ago</span>
                            </div>
                            <p>We are pleased to welcome our new client to our services</p>
                        </div>
                    </li>
                </ul>
            </div>
        </>
    );
};

export default CrmUserActivity;