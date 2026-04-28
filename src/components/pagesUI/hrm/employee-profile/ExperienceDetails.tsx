"use client";
import React, { useState } from "react";
import UpdateExperienceDetailsModal from "./UpdateExperienceDetailsModal";
import Link from "next/link";

const ExperienceDetails = () => {
  const [modalOpen, setModalOpen] = useState(false);
  return (
    <>
      <div className="col-span-12 md:col-span-6">
        <div className="card__wrapper">
          <div className="employee__profile-single-box relative">
            <div className="card__title-wrap flex align-center justify-between mb-[15px]">
              <h5 className="card__heading-title">Experience Details</h5>
              <button className="edit-icon" onClick={() => setModalOpen(true)}>
                <i className="fa-solid fa-pencil"></i>
              </button>
            </div>
            <div className="education__box">
              <ul className="education__list">
                <li>
                  <div className="education__user">
                    <div className="before__circle"></div>
                  </div>
                  <div className="education__content">
                    <div className="timeline-content">
                      <Link href="#" className="name">
                        Envato Inc, Melbourne
                      </Link>
                      <span className="degree">Head Of Review Team</span>
                      <span className="year">2020 - Present</span>
                    </div>
                  </div>
                </li>
                <li>
                  <div className="education__user">
                    <div className="before__circle"></div>
                  </div>
                  <div className="education__content">
                    <div className="timeline-content">
                      <Link href="#" className="name">
                        CodeCanyon Sydney
                      </Link>
                      <span className="degree">Software Developer</span>
                      <span className="year">2016 - 2018</span>
                    </div>
                  </div>
                </li>
                <li>
                  <div className="education__user">
                    <div className="before__circle"></div>
                  </div>
                  <div className="education__content">
                    <div className="timeline-content">
                      <Link href="#" className="name">
                        Facebook Inc, California
                      </Link>
                      <span className="degree">Junior Software Developer</span>
                      <span className="year">2011 - 2016</span>
                    </div>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      {modalOpen && (
        <UpdateExperienceDetailsModal open={modalOpen} setOpen={setModalOpen} />
      )}
    </>
  );
};

export default ExperienceDetails;
