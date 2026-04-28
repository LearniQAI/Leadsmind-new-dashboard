"use client"
import CustomDropdown from '@/components/dropdown/CustomDropdown';
import { dropdownItems } from '@/data/dropdown-data';
import Image from 'next/image';
import React from 'react';
import avatar1 from "../../../../../public/assets/images/avatar/avatar1.png";
import avatar2 from "../../../../../public/assets/images/avatar/avatar2.png";
import avatar3 from "../../../../../public/assets/images/avatar/avatar3.png";
import avatar4 from "../../../../../public/assets/images/avatar/avatar4.png";
import PieChartAudience from './PieChartAud';

const AudienceSection = () => {
    return (
        <>
            <div className="card__wrapper no-height">
                <div className="card__top-box flex justify-between mb-[10px]">
                    <h5 className="card__heading-title">Audience</h5>
                    <div className="card__dropdown">
                        <CustomDropdown items={dropdownItems} />
                    </div>
                </div>
                <div className="card__pie-chart mb-[10px]">
                    <PieChartAudience />
                </div>
                <div className="card__bottom-box flex justify-between mb-[10px]">
                    <div className="right-box">
                        <span className="card__desc style_two dot mb-[5px]">Total Subscribed</span>
                        <h4 className="card__title"><span className="price-increase"><i
                            className="fa-sharp fa-solid fa-caret-up"></i></span> 279M</h4>
                    </div>
                    <div className="left-box">
                        <span className="card__desc style_two dot down mb-[5px]">New User</span>
                        <h4 className="card__title"><span className="price-decrease"><i
                            className="fa-sharp fa-solid fa-caret-down"></i></span> 8900K</h4>
                    </div>
                </div>
                <div className="card__meta-box flex justify-between items-end">
                    <div className="avatar">
                        <ul>
                            <li>
                                <Image className="w-[36px] rounded-[50%]" src={avatar1} alt="image" />
                            </li>
                            <li><Image className="w-[36px] rounded-[50%]" src={avatar2} alt="image" />
                            </li>
                            <li><Image className="w-[36px] rounded-[50%]" src={avatar3} alt="image" />
                            </li>
                            <li><Image className="w-[36px] rounded-[50%]" src={avatar4} alt="image" />
                            </li>
                        </ul>
                    </div>
                    <div className="card__icon-box">
                        <i className="fa-light fa-gear"></i>
                    </div>
                </div>
            </div>
        </>
    );
};

export default AudienceSection;