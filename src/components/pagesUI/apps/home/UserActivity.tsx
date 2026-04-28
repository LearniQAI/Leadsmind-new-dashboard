"use client";
import React from "react";
import { dropdownItems } from "@/data/dropdown-data";
import Image from "next/image";
import product1 from "../../../../../public/assets/images/product/item1.png";
import product2 from "../../../../../public/assets/images/product/item2.png";
import product3 from "../../../../../public/assets/images/product/item3.png";
import avatar1 from "../../../../../public/assets/images/avatar/avatar1.png";
import avatar2 from "../../../../../public/assets/images/avatar/avatar2.png";
import avatar3 from "../../../../../public/assets/images/avatar/avatar3.png";
import CustomDropdown from "@/components/dropdown/CustomDropdown";

const UserActivity = () => {
  return (
    <>
      <div className="col-span-12 xl:col-span-6 xxl:col-span-4">
        <div className="card__wrapper height-equal not-height">
          <div className="card__title-wrap flex items-center justify-between mb-5">
            <h5 className="card__heading-title">User Activity</h5>
            <CustomDropdown items={dropdownItems} />
          </div>
          <ul className="timeline">
            <li className="timeline__item flex gap-[10px]">
              <div className="timeline__icon">
                <span>
                  <i className="fa-light fa-box"></i>
                </span>
              </div>
              <div className="timeline__content w-full">
                <div className="flex flex-wrap gap-[10px] items-center justify-between">
                  <h5 className="small">Purchased from MediaTek</h5>
                  <span className="bd-badge bg-success">04 Mins Ago</span>
                </div>
                <p>Lorem ipsum dolor sit amet consecte</p>
                <div className="timeline__thumb flex gap-1">
                  <Image
                    src={product1}
                    style={{ width: "100%", height: "auto" }}
                    priority
                    alt="image"
                  />
                  <Image
                    src={product2}
                    style={{ width: "100%", height: "auto" }}
                    priority
                    alt="image"
                  />
                  <Image
                    src={product3}
                    style={{ width: "100%", height: "auto" }}
                    priority
                    alt="image"
                  />
                </div>
              </div>
            </li>
            <li className="timeline__item flex gap-[10px]">
              <div className="timeline__icon">
                <span>
                  <i className="fa-light fa-box"></i>
                </span>
              </div>
              <div className="timeline__content w-full">
                <div className="flex flex-wrap gap-[10px] items-center justify-between">
                  <h5 className="small">Purchased from MediaTek</h5>
                  <span className="bd-badge bg-success">04 Mins Ago</span>
                </div>
                <p>Lorem ipsum dolor sit amet consecte</p>
                <div className="avatar">
                  <ul>
                    <li>
                      <Image
                        className="w-[48px] rounded-[50%]"
                        src={avatar1}
                        alt="image"
                      />
                    </li>
                    <li>
                      <Image
                        className="w-[48px] rounded-[50%]"
                        src={avatar2}
                        alt="image"
                      />
                    </li>
                    <li>
                      <Image
                        className="w-[48px] rounded-[50%]"
                        src={avatar3}
                        alt="image"
                      />
                    </li>
                  </ul>
                </div>
              </div>
            </li>
            <li className="timeline__item flex gap-[10px]">
              <div className="timeline__icon">
                <span>
                  <i className="fa-light fa-box"></i>
                </span>
              </div>
              <div className="timeline__content w-full">
                <div className="flex flex-wrap gap-[10px] items-center justify-between">
                  <h5 className="small">Purchased from MediaTek</h5>
                  <span className="bd-badge bg-success">04 Mins Ago</span>
                </div>
                <p>
                  <span className="text-danger underline">3 days left</span>{" "}
                  notification to submit new products
                </p>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </>
  );
};

export default UserActivity;
