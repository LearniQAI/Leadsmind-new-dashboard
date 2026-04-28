import React from "react";

const EmployeeAttendanceSummary = () => {
  return (
    <>
      <div className="col-span-12 sm:col-span-6 xxl:col-span-3">
        <div className="card__wrapper">
          <div className="flex items-center gap-[30px] maxSm:gap-5">
            <div className="card__icon">
              <span>
                <i className="fa-sharp fa-regular fa-gear"></i>
              </span>
            </div>
            <div className="card__title-wrap">
              <h6 className="card__sub-title mb-[10px]">
                Total Complete Project
              </h6>
              <div className="card__content">
                <h3 className="card__title mb-[5px]">23</h3>
                <span className="card__desc style_two">
                  <span className="price-increase">
                    <i className="fa-light fa-arrow-up"></i> +5.15%
                  </span>{" "}
                  Than Last Month
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="col-span-12 sm:col-span-6 xxl:col-span-3">
        <div className="card__wrapper">
          <div className="flex items-center gap-[30px] maxSm:gap-5">
            <div className="card__icon">
              <span>
                <i className="fa-sharp fa-regular fa-gear"></i>
              </span>
            </div>
            <div className="card__title-wrap">
              <h6 className="card__sub-title mb-[10px]">Total Work Time</h6>
              <div className="card__content">
                <h3 className="card__title mb-[5px]">39 Hrs : 54 Min</h3>
                <span className="card__desc style_two">
                  <span className="price-increase">
                    <i className="fa-light fa-arrow-up"></i> +5.15%
                  </span>{" "}
                  Than Last Month
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="col-span-12 sm:col-span-6 xxl:col-span-3">
        <div className="card__wrapper">
          <div className="flex items-center gap-[30px] maxSm:gap-5">
            <div className="card__icon">
              <span>
                <i className="fa-light fa-badge-check"></i>
              </span>
            </div>
            <div className="card__title-wrap">
              <h6 className="card__sub-title mb-[10px]">Total Bark Time</h6>
              <div className="card__content">
                <h3 className="card__title mb-[5px]">05 Hrs : 55 Min</h3>
                <span className="card__desc style_two">
                  <span className="price-decrease">
                    <i className="fa-light fa-arrow-down"></i> +1.5%
                  </span>{" "}
                  Than Last Month
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="col-span-12 sm:col-span-6 xxl:col-span-3">
        <div className="card__wrapper">
          <div className="flex items-center gap-[30px] maxSm:gap-5">
            <div className="card__icon">
              <span>
                <i className="fa-sharp fa-regular fa-user"></i>
              </span>
            </div>
            <div className="card__title-wrap">
              <h6 className="card__sub-title mb-[10px]">Total Leave</h6>
              <div className="card__content">
                <h3 className="card__title mb-[5px]">03 Days</h3>
                <span className="card__desc style_two">
                  <span className="price-increase">
                    <i className="fa-light fa-arrow-up"></i> +2.15%
                  </span>{" "}
                  Than Last Month
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default EmployeeAttendanceSummary;
