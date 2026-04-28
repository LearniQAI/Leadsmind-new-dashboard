"use client";
import CustomDropdown from "@/components/dropdown/CustomDropdown";
import { dropdownItems } from "@/data/dropdown-data";
import React from "react";

const MeetingScheduleTwo = () => {
  return (
    <>
      <div className="card__wrapper no-height">
        <div className="card__title-wrap flex items-center justify-between mb-[20px]">
          <h5 className="card__heading-title">Meeting Schedule</h5>
          <CustomDropdown items={dropdownItems} />
        </div>
        <div className="common-scrollbar h-[177px] overflow-y-auto">
          <div className="table__wrapper meeting-table table-responsive">
            <table className="table mb-[20px] w-full">
              <thead>
                <tr className="table__title">
                  <th>Meeting Title</th>
                  <th>Meeting Date</th>
                  <th>Meeting Time</th>
                </tr>
              </thead>
              <tbody className="table__body">
                <tr>
                  <td>Project Kickoff</td>
                  <td>June 1, 2024</td>
                  <td>10:00 AM</td>
                </tr>
                <tr>
                  <td>Weekly Team Sync</td>
                  <td>June 5, 2024</td>
                  <td>02:00 PM</td>
                </tr>
                <tr>
                  <td>Client Presentation</td>
                  <td>June 10, 2024</td>
                  <td>11:00 AM</td>
                </tr>
                <tr>
                  <td>Project Kickoff</td>
                  <td>June 1, 2024</td>
                  <td>10:00 AM</td>
                </tr>
                <tr>
                  <td>Project Kickoff</td>
                  <td>June 1, 2024</td>
                  <td>10:00 AM</td>
                </tr>
                <tr>
                  <td>Weekly Team Sync</td>
                  <td>June 5, 2024</td>
                  <td>02:00 PM</td>
                </tr>
                <tr>
                  <td>Client Presentation</td>
                  <td>June 10, 2024</td>
                  <td>11:00 AM</td>
                </tr>
                <tr>
                  <td>Project Kickoff</td>
                  <td>June 1, 2024</td>
                  <td>10:00 AM</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
};

export default MeetingScheduleTwo;
