"use client"
import CustomDropdown from '@/components/dropdown/CustomDropdown';
import { dropdownItems } from '@/data/dropdown-data';
import React from 'react';
import product1 from "../../../../../public/assets/images/product/item1.png";
import product2 from "../../../../../public/assets/images/product/item2.png";
import product3 from "../../../../../public/assets/images/product/item3.png";
import avatar1 from "../../../../../public/assets/images/avatar/avatar1.png";
import avatar2 from "../../../../../public/assets/images/avatar/avatar2.png";
import avatar3 from "../../../../../public/assets/images/avatar/avatar3.png";
import Image from 'next/image';

const RecentActivity = () => {
  return (
    <>
      <div className="card__wrapper">
        <div className="card__title-wrap flex items-center justify-between mb-[20px]">
          <h5 className="card__heading-title">Recent Activity</h5>
          <CustomDropdown items={dropdownItems} />
        </div>
        <div className="common-scrollbar h-[400px] overflow-y-auto">
          <div className="card__inner">
            <ul className="timeline">
              <li className="timeline__item flex gap-[10px]">
                <div className="timeline__icon"><span><i className="fa-light fa-box"></i></span></div>
                <div className="timeline__content w-full">
                  <div className="flex flex-wrap gap-[10px] items-center justify-between">
                    <h5 className="small">Purchased from MediaTek</h5>
                    <span className="bd-badge bg-success">04 Mins Ago</span>
                  </div>
                  <p>Successfully integrated new HRM features into the system</p>
                  <div className="timeline__thumb flex gap-1">
                    <Image src={product1} priority style={{ width: "100%", height: "auto" }} alt="image" />
                    <Image src={product2} priority style={{ width: "100%", height: "auto" }} alt="image" />
                    <Image src={product3} priority style={{ width: "100%", height: "auto" }} alt="image" />
                  </div>
                </div>
              </li>
              <li className="timeline__item flex gap-[10px]">
                <div className="timeline__icon"><span><i className="fa-light fa-box"></i></span></div>
                <div className="timeline__content w-full">
                  <div className="flex flex-wrap gap-[10px] items-center justify-between">
                    <h5 className="small">CRM Notification</h5>
                    <span className="bd-badge bg-success">10 Mins Ago</span>
                  </div>
                  <p><span className="text-danger text-decoration-underline">3 days left</span> to update
                    customer profiles with the new CRM tools</p>
                </div>
              </li>
              <li className="timeline__item flex gap-[10px]">
                <div className="timeline__icon"><span><i className="fa-light fa-box"></i></span></div>
                <div className="timeline__content w-full">
                  <div className="flex flex-wrap gap-[10px] items-center justify-between">
                    <h5 className="small">Purchased from MediaTek</h5>
                    <span className="bd-badge bg-success">30 Mins Ago</span>
                  </div>
                  <p>Team collaboration improved with new HRM tools</p>
                  <div className="avatar">
                    <ul className='flex'>
                      <li className="inline-block"><Image className="w-[48px] rounded-[50%]" src={avatar1} priority alt="image" /></li>
                      <li className="inline-block"><Image className="w-[48px] rounded-[50%]" src={avatar2} priority alt="image" /></li>
                      <li className="inline-block"><Image className="w-[48px] rounded-[50%]" src={avatar3} priority alt="image" /></li>
                    </ul>
                  </div>
                </div>
              </li>
              <li className="timeline__item flex gap-[10px]">
                <div className="timeline__icon"><span><i className="fa-light fa-box"></i></span></div>
                <div className="timeline__content w-full">
                  <div className="flex flex-wrap gap-[10px] items-center justify-between">
                    <h5 className="small">CRM Update</h5>
                    <span className="bd-badge bg-success">45 Mins Ago</span>
                  </div>
                  <p className="mb-[10px]"><span className="text-danger text-decoration-underline">2 days
                    left</span> to complete CRM training sessions</p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
};

export default RecentActivity;