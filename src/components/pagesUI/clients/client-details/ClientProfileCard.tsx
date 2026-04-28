import { IClient } from "@/interface";
import Image from "next/image";
import Link from "next/link";
import React from "react";

interface propsType {
  data: IClient | any;
}

const ClientProfileCard = ({ data }: propsType) => {
  return (
    <>
      <div className="card__wrapper">
        <div className="company__wrapper">
          <div className="company__info">
            <div className="company__logo">
              <Image className="rounded-[50%]" src={data?.image} alt="image" />
            </div>
            <div className="company__name mb-[30px]">
              <h3 className="company__title">{data?.name}</h3>
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
                  <Link href={`tel:${data?.phone}`}>{data?.phone}</Link>
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
            <div className="company__info-list">
              <h5 className="company__info-list-title">Social Profile</h5>
              <div className="company__social">
                <Link className="company__social-icon" href="#">
                  <i className="fa-brands fa-facebook-f"></i>
                </Link>
                <Link className="company__social-icon" href="#">
                  <i className="fa-brands fa-linkedin-in"></i>
                </Link>
                <Link className="company__social-icon" href="#">
                  <i className="fa-brands fa-x-twitter"></i>
                </Link>
                <Link className="company__social-icon" href="#">
                  <i className="fa-brands fa-youtube"></i>
                </Link>
                <Link className="company__social-icon" href="#">
                  <i className="fa-brands fa-instagram"></i>
                </Link>
                <Link className="company__social-icon" href="#">
                  <i className="fa-brands fa-whatsapp"></i>
                </Link>
                <Link className="company__social-icon" href="#">
                  <i className="fa-brands fa-pinterest"></i>
                </Link>
              </div>
            </div>
            <div className="company__info-list">
              <h5 className="company__info-list-title">Settings</h5>
              <div className="company__social">
                <Link className="table__icon download" href="#">
                  <i className="fa-sharp fa-light fa-share-from-square"></i>
                </Link>
                <Link className="table__icon edit" href="#">
                  <i className="fa-sharp fa-light fa-bookmark"></i>
                </Link>
                <button className="removeBtn table__icon delete">
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

export default ClientProfileCard;
