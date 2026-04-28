import React from "react";

const AttendanceTypeIcons = () => {
  return (
    <>
      <div className="grid grid-cols-12 justify-between gap-y-5 mb-[20px] items-end">
        <div className="col-span-12">
          <div className="flex items-center">
            <h6 className="">Note:</h6>
            <div className="attendant__info-wrapper">
              <div className="attendant__info-icon">
                <i className="fa fa-star text-primary"></i>
                <span className="attachment__info-arrow">
                  <i className="fa fa-arrow-right text-lightest"></i>
                </span>
                <h6 className="text-dark small">Holiday</h6>
              </div>
              <div className="attendant__info-icon">
                <i className="fa fa-calendar-week text-secondary"></i>
                <span className="attachment__info-arrow">
                  <i className="fa fa-arrow-right text-lightest"></i>
                </span>
                <h6 className="text-dark small">Day Off</h6>
              </div>
              <div className="attendant__info-icon">
                <i className="fa fa-check text-success"></i>
                <span className="attachment__info-arrow">
                  <i className="fa fa-arrow-right text-lightest"></i>
                </span>
                <h6 className="text-dark small">Present</h6>
              </div>
              <div className="attendant__info-icon">
                <i className="fa fa-star-half-alt text-info"></i>
                <span className="attachment__info-arrow">
                  <i className="fa fa-arrow-right text-lightest"></i>
                </span>
                <h6 className="text-dark small">Half Day</h6>
              </div>
              <div className="attendant__info-icon">
                <i className="fa fa-exclamation-circle text-warning"></i>
                <span className="attachment__info-arrow">
                  <i className="fa fa-arrow-right text-lightest"></i>
                </span>
                <h6 className="text-dark small">Late</h6>
              </div>
              <div className="attendant__info-icon">
                <i className="fa fa-times text-danger"></i>
                <span className="attachment__info-arrow">
                  <i className="fa fa-arrow-right text-lightest"></i>
                </span>
                <h6 className="text-dark small">Absent</h6>
              </div>
              <div className="attendant__info-icon">
                <i className="fa fa-plane-departure text-link"></i>
                <span className="attachment__info-arrow">
                  <i className="fa fa-arrow-right text-lightest"></i>
                </span>
                <h6 className="text-dark small">On Leave</h6>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AttendanceTypeIcons;
