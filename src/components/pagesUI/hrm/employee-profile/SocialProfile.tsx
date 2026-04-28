"use client";
import React, { useState } from "react";
import UpdateSocialProfileModal from "./UpdateSocialProfileModal";
import Link from "next/link";

const SocialProfile = () => {
  const [modalOpen, setModalOpen] = useState(false);
  return (
    <>
      <div className="col-span-12 md:col-span-6 xl:col-span-4 xxl:col-span-4">
        <div className="card__wrapper">
          <div className="employee__profile-single-box relative">
            <div className="card__title-wrap flex align-center justify-between mb-[15px]">
              <h5 className="card__heading-title">Social Profile</h5>
              <button
                onClick={() => setModalOpen(true)}
                className="edit-icon"
                data-bs-toggle="modal"
                data-bs-target="#social__info"
              >
                <i className="fa-solid fa-pencil"></i>
              </button>
            </div>
            <div className="personal-info-wrapper bank__account">
              <ul className="personal-info">
                <li>
                  <div className="title">LinkedIn:</div>
                  <div className="text text-link-hover">
                    <Link href="#">Ethan Mitchell</Link>
                  </div>
                </li>
                <li>
                  <div className="title">Twitter:</div>
                  <div className="text text-link-hover">
                    <Link href="#">Ethan Mitchell</Link>
                  </div>
                </li>
                <li>
                  <div className="title">Facebook:</div>
                  <div className="text text-link-hover">
                    <Link href="#">Ethan Mitchell</Link>
                  </div>
                </li>
                <li>
                  <div className="title">Instagram:</div>
                  <div className="text text-link-hover">
                    <Link href="#">Ethan Mitchell</Link>
                  </div>
                </li>
                <li>
                  <div className="title">WhatsApp:</div>
                  <div className="text text-link-hover">
                    <Link href="#">123456789</Link>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {modalOpen && (
        <UpdateSocialProfileModal open={modalOpen} setOpen={setModalOpen} />
      )}
    </>
  );
};

export default SocialProfile;
