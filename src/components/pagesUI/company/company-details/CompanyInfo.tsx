"use client";
import React from "react";
import SocialProfile from "./SocialProfile";
import Link from "next/link";
import logoImage from "../../../../../public/assets/images/user/1.png";
import Image from "next/image";

interface statePropsType {
  handleToggle: () => void;
  handleSendEmailToggle: () => void;
}

const CompanyInfo = ({
  handleToggle,
  handleSendEmailToggle,
}: statePropsType) => {
  return (
    <>
      <div className="card__wrapper">
        <div className="company__wrapper">
          <div className="company__info">
            <div className="company__logo">
              <Image src={logoImage} priority alt="img" />
            </div>
            <div className="company__name mb-5">
              <h3 className="company__title">Gaza Solutions</h3>
            </div>
            <div className="company__btn mb-[30px]">
              <div className="flex flex-wrap items-center justify-between gap-[10px]">
                <button
                  onClick={handleToggle}
                  type="button"
                  className="btn btn-primary w-full"
                >
                  Add Deals
                </button>
                <button
                  onClick={handleSendEmailToggle}
                  type="button"
                  className="btn btn-secondary w-full"
                >
                  Send Mail
                </button>
              </div>
            </div>
            <div className="company__info-list">
              <ul>
                <li>
                  <span>
                    <i className="fa-sharp fa-regular fa-location-dot"></i>
                  </span>
                  Gaza Strip, Gaza, Palestine
                </li>
                <li>
                  <span>
                    <i className="fa-sharp fa-light fa-phone"></i>
                  </span>
                  <Link href="tel:+1555123-4567">+1 (555) 123-4567</Link>
                </li>
                <li>
                  <span>
                    <i className="fa-sharp fa-light fa-envelope"></i>
                  </span>
                  <Link href="mailto:info@gaza.com">info@gaza.com</Link>
                </li>
                <li>
                  <span>
                    <i className="fa-light fa-calendar-clock"></i>
                  </span>{" "}
                  Created on 09:55am, 05 May 2024
                </li>
                <li>
                  <span>
                    <i className="fa-sharp fa-solid fa-star"></i>
                  </span>{" "}
                  5.0
                </li>
                <li>
                  <span>
                    <i className="fa-thin fa-globe-pointer"></i>
                  </span>{" "}
                  <Link href="#">www.manez.info</Link>
                </li>
              </ul>
            </div>
            <div className="company__info-list style-two">
              <h5 className="company__info-list-title">Other Information</h5>
              <ul>
                <li>
                  <span>Language:</span> English
                </li>
                <li>
                  <span>Currency:</span> America Dollar
                </li>
                <li>
                  <span>Source:</span> Linkedin
                </li>
                <li>
                  <span>Last Modified:</span> 03:39am, 07 May 2024
                </li>
              </ul>
            </div>
            <div className="company__info-list style-three">
              <h5 className="company__info-list-title">Owner Information</h5>
              <ul>
                <li>
                  <span>Name:</span> Michael Johnson
                </li>
                <li>
                  <span>Number:</span>{" "}
                  <Link href="tel:+1555123456">+1 (555) 123456</Link>
                </li>
                <li>
                  <span>Email:</span>{" "}
                  <Link href="mailto:michaeljohnson@example.com">
                    michaeljohnson@example.com
                  </Link>
                </li>
              </ul>
            </div>
            <SocialProfile />
            <div className="company__info-list">
              <h5 className="company__info-list-title">Settings</h5>
              <div className="company__social">
                <Link className="table__icon download" href="#">
                  <i className="fa-sharp fa-light fa-share-from-square"></i>
                </Link>
                <Link className="table__icon edit" href="#">
                  <i className="fa-sharp fa-light fa-bookmark"></i>
                </Link>
                <button className="removeBtn table__icon delete social_trash">
                  <i className="fa-regular fa-trash"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CompanyInfo;
