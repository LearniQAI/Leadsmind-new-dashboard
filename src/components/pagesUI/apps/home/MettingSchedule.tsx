"use client";
import CustomDropdown from "@/components/dropdown/CustomDropdown";
import { dropdownItems } from "@/data/dropdown-data";
import { absentData, meetingData } from "@/data/table_data";

const MeetingSchedule = () => {
  return (
    <>
      <div className="col-span-12 xxl:col-span-5 xl:col-span-12 lg:col-span-12">
        {/* Meeting Schedule Section */}
        <div className="card__wrapper no-height">
          <div className="card__title-wrap flex items-center justify-between mb-[20px]">
            <h5 className="card__heading-title">Meeting Schedule</h5>
            <CustomDropdown items={dropdownItems} />
          </div>
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
                {meetingData.map((meeting, index) => (
                  <tr key={index}>
                    <td>{meeting.title}</td>
                    <td>{meeting.date}</td>
                    <td>{meeting.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {/* Absent Today Section */}
        <div className="card__wrapper no-height">
          <div className="card__title-wrap flex items-center justify-between mb-[20px]">
            <h5 className="card__heading-title">Absent Today</h5>
            <CustomDropdown items={dropdownItems} />
          </div>
          <div className="common-scrollbar h-[148px] overflow-y-auto">
            <div className="table-height">
              <div className="table__wrapper meeting-table table-responsive">
                <table className="table mb-[20px] w-full">
                  <thead>
                    <tr className="table__title">
                      <th>Employee</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody className="table__body">
                    {absentData.map((absent, index) => (
                      <tr key={index}>
                        <td>{absent.employee}</td>
                        <td>{absent.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default MeetingSchedule;
