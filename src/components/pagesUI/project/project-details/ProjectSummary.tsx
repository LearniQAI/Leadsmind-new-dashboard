import React from "react";

const ProjectSummary = () => {
  return (
    <>
      <div className="grid grid-cols-12">
        <div className="col-span-12">
          <div className="card__wrapper">
            <div className="card__title-wrap mb-[25px]">
              <h5 className="card__heading-title">Summary</h5>
            </div>
            <p>
              This project involves the development of an education application
              using the Laravel framework. The app aims to provide comprehensive
              features for students and educators, including course management,
              student assessments, and real-time communication.
            </p>
            <p>
              The application will leverage {`Laravel's`} robust MVC
              architecture to ensure a scalable and maintainable codebase. Key
              features will include user authentication, course content
              management, interactive forums, and analytics for tracking student
              progress.
            </p>

            <p>
              The development process will follow agile methodologies to ensure
              regular updates and feature enhancements based on user feedback. A
              dedicated team will work on front-end and back-end development to
              deliver a seamless user experience.
              <span id="dots">...</span>
              <span id="more">
                {" "}
                The project is scheduled to undergo multiple phases, including
                initial development, testing, deployment, and post-launch
                support. Each phase will be documented and reviewed to maintain
                high-quality standards.
              </span>
            </p>
            <button className="read__more-btn mb-[15px]" id="myBtn">
              Read more
            </button>
            <div className="list__dot mb-[15px]">
              <ul>
                <li>
                  Course management system with content upload capabilities.
                </li>
                <li>
                  Real-time communication tools for students and teachers.
                </li>
                <li>
                  Secure user authentication and role-based access control.
                </li>
                <li>Interactive forums for peer-to-peer learning.</li>
                <li>Detailed analytics and reporting features.</li>
              </ul>
            </div>
            <div className="grid grid-cols-12 gap-x-3 maxXs:gap-x-2.5 mb-15">
              <div className="sm:col-span-6 md:col-span-6 lg:col-span-3 xl:col-span-3">
                <div>
                  <p className="mb-[5px] fw-medium">Create Date:</p>
                  <h5 className="text-[15px] mb-0">May 16, 2024</h5>
                </div>
              </div>
              <div className="sm:col-span-6 md:col-span-6 lg:col-span-3 xl:col-span-3">
                <div>
                  <p className="mb-[5px] fw-medium">Deadline:</p>
                  <h5 className="text-[15px] mb-0">Aug 15, 2025</h5>
                </div>
              </div>
              <div className="sm:col-span-6 md:col-span-6 lg:col-span-3 xl:col-span-3">
                <div>
                  <p className="mb-[5px] fw-medium">Priority:</p>
                  <span className="bd-badge bg-success text-[12px]">High</span>
                </div>
              </div>
              <div className="sm:col-span-6 md:col-span-6 lg:col-span-3 xl:col-span-3">
                <div>
                  <p className="mb-[5px] fw-medium">Status:</p>
                  <span className="bd-badge bg-warning text-[12px]">Inprogress</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProjectSummary;
