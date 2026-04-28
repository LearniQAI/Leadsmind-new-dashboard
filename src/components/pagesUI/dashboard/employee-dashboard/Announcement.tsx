"use client";
import CustomDropdown from "@/components/dropdown/CustomDropdown";
import { dropdownItems } from "@/data/dropdown-data";
import { Box, LinearProgress } from "@mui/material";
import Image, { StaticImageData } from "next/image";
import React from "react";
import avatar1 from "../../../../../public/assets/images/avatar/avatar.png";
import avatar2 from "../../../../../public/assets/images/avatar/avatar1.png";
import avatar3 from "../../../../../public/assets/images/avatar/avatar2.png";
interface TContact {
  id: number;
  name: string;
  phone: string;
  image: StaticImageData;
}
const Announcement = () => {
  const contacts: TContact[] = [
    {
      id: 1,
      name: "Ethan Mitchell",
      phone: "+1(800) 642 7676",
      image: avatar1,
    },
    {
      id: 2,
      name: "Mason Rodriguez",
      phone: "+4(800) 987 6543",
      image: avatar2,
    },
    {
      id: 3,
      name: "Olivia Bennett",
      phone: "+9(800) 123 4567",
      image: avatar3,
    },
  ];
  return (
    <>
      <div className="card__wrapper no-height">
        <div className="card__title-wrap flex items-center justify-between mb-[20px]">
          <h5 className="card__heading-title">Announcement</h5>
          <CustomDropdown items={dropdownItems} />
        </div>
        <div className="common-scrollbar h-[320px] overflow-y-auto">
          <div className=" table__wrapper meeting-table table-responsive">
            <table className="table mb-[20px] w-full">
              <thead>
                <tr className="table__title">
                  <th>Title</th>
                  <th>Date</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Quarterly Financial Results</td>
                  <td>May 15, 2024</td>
                  <td>Q2 2024 financial performance.</td>
                </tr>
                <tr>
                  <td>New Health Benefits</td>
                  <td>May 18, 2024</td>
                  <td>Details on the new health plan.</td>
                </tr>
                <tr>
                  <td>Team Building Workshop</td>
                  <td>May 20, 2024</td>
                  <td>Workshop on team collaboration.</td>
                </tr>
                <tr>
                  <td>Office Relocation</td>
                  <td>Jun 01, 2024</td>
                  <td>New office location details.</td>
                </tr>
                <tr>
                  <td>Annual Leave Policy Update</td>
                  <td>Jun 05, 2024</td>
                  <td>Changes to the leave policy.</td>
                </tr>
                <tr>
                  <td>Employee of the Month</td>
                  <td>Jun 10, 2024</td>
                  <td>Recognition for outstanding work.</td>
                </tr>
                <tr>
                  <td>Summer Intern Program</td>
                  <td>Jun 15, 2024</td>
                  <td>Details about the intern program.</td>
                </tr>
                <tr>
                  <td>Cybersecurity Training</td>
                  <td>Jun 20, 2024</td>
                  <td>Mandatory cybersecurity training.</td>
                </tr>
                <tr>
                  <td>Holiday Schedule</td>
                  <td>Jun 25, 2024</td>
                  <td>Upcoming holiday schedule.</td>
                </tr>
                <tr>
                  <td>Product Launch</td>
                  <td>Jul 01, 2024</td>
                  <td>Details of the new product launch.</td>
                </tr>
                <tr>
                  <td>Corporate Social Responsibility</td>
                  <td>Jul 05, 2024</td>
                  <td>CSR initiatives update.</td>
                </tr>
                <tr>
                  <td>Performance Reviews</td>
                  <td>Jul 10, 2024</td>
                  <td>Mid-year performance reviews.</td>
                </tr>
                <tr>
                  <td>Health and Safety Guidelines</td>
                  <td>Jul 15, 2024</td>
                  <td>Updated health and safety protocols.</td>
                </tr>
                <tr>
                  <td>New Project Kickoff</td>
                  <td>Jul 20, 2024</td>
                  <td>Kickoff meeting for the new project.</td>
                </tr>
                <tr>
                  <td>Staff Meeting</td>
                  <td>Jul 25, 2024</td>
                  <td>Monthly staff meeting details.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div className="card-flex">
        <div className="card__wrapper no-height">
          <div className="card__title-wrap flex items-center justify-between mb-[15px]">
            <h5 className="card__heading-title">My Goal</h5>
            <CustomDropdown items={dropdownItems} />
          </div>
          <div className="mz-progress-bar">
            <div className="mz-progress style_two">
              <div className="mz-progress-wrapper">
                <div className="mz-progress-head items-center mb-5">
                  <h6 className="text-label font-medium">United State Trip</h6>
                  <span className="mz-progress-percentage">44%</span>
                </div>
                <Box sx={{ width: "100%", mb: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={44}
                    className="progress-bar progress-primary"
                    sx={{ height: "10px" }}
                  />
                </Box>
              </div>
              <div className="mz-progress-wrapper">
                <div className="mz-progress-head items-center mb-5">
                  <h6 className="text-label font-medium">Attends Business Samite</h6>
                  <span className="mz-progress-percentage">22%</span>
                </div>
                <Box sx={{ width: "100%", mb: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={22}
                    className="progress-bar progress-secondary"
                    sx={{ height: "10px" }}
                  />
                </Box>
              </div>
              <div className="mz-progress-wrapper">
                <div className="mz-progress-head items-center mb-5">
                  <h6 className="text-label font-medium">South Africa</h6>
                  <span className="mz-progress-percentage">18%</span>
                </div>
                <Box sx={{ width: "100%", mb: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={18}
                    className="progress-bar progress-success"
                    sx={{ height: "10px" }}
                  />
                </Box>
              </div>
              <div className="mz-progress-wrapper">
                <div className="mz-progress-head items-center mb-5">
                  <h6 className="text-label font-medium">Business Meeting</h6>
                  <span className="mz-progress-percentage">70%</span>
                </div>
                <Box sx={{ width: "100%" }}>
                  <LinearProgress
                    variant="determinate"
                    value={70}
                    className="progress-bar progress-warning"
                    sx={{ height: "10px" }}
                  />
                </Box>
              </div>
            </div>
          </div>
        </div>
        {/* contact list */}
        <div className="card__wrapper no-height">
          <div className="card__title-wrap flex items-center justify-between mb-[15px]">
            <h5 className="card__heading-title">My Contact List</h5>
            <CustomDropdown items={dropdownItems} />
          </div>
          {contacts.map((contact) => (
            <div
              key={contact.id}
              className="contact__list flex justify-between items-center"
            >
              <div className="contact__list-meta flex items-center gap-[10px]">
                <Image
                  className="w-[48px] rounded-[50%]"
                  src={contact.image}
                  priority
                  alt={contact.name}
                />
                <div className="contact__list-content">
                  <h5 className="small font-semibold">{contact.name}</h5>
                  <span className="seller__digi">{contact.phone}</span>
                </div>
              </div>
              <div className="contact__list-icon flex gap-[10px]">
                <span>
                  <i className="fa-regular fa-phone"></i>
                </span>
                <span>
                  <i className="fa-regular fa-envelope"></i>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default Announcement;
