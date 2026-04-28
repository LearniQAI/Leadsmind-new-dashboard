"use client";
import React, { useState } from "react";
import UpdateEducationQualificationModal from "./UpdateEducationQualificationModal";
import Link from "next/link";

const EducationQualification = () => {
  const [modalOpen, setModalOpen] = useState(false);
  return (
    <>
      <div className="col-span-12 md:col-span-12 xl:col-span-6 xxl:col-span-6">
        <div className="card__wrapper">
          <div className="employee__profile-single-box relative">
            <div className="card__title-wrap flex align-center justify-between mb-[15px]">
              <h5 className="card__heading-title">Education Qualification</h5>
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="edit-icon"
                data-bs-toggle="modal"
                data-bs-target="#education__info"
              >
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
                        International College of Arts and Science (UG)
                      </Link>
                      <span className="degree">MSc In Computer Science</span>
                      <span className="year">2000 - 2003</span>
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
                        International College of Arts and Science (PG)
                      </Link>
                      <span className="degree">BSc In Computer Science</span>
                      <span className="year">2000 - 2003</span>
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
                        International College of Arts and Science (PG)
                      </Link>
                      <span className="degree">Bsc Computer Science</span>
                      <span className="year">2000 - 2003</span>
                    </div>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {modalOpen && (
        <UpdateEducationQualificationModal
          open={modalOpen}
          setOpen={setModalOpen}
        />
      )}
    </>
  );
};

export default EducationQualification;
