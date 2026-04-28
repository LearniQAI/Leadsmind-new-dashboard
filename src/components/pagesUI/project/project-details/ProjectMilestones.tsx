import React from "react";

const ProjectMilestones = () => {
  return (
    <>
      <div className="card__wrapper">
        <div className="card__title-wrap mb-25">
          <h5 className="card__heading-title">Project Milestones</h5>
        </div>
        <div className="card__body">
          <div className="milestone__list">
            <div className="milestone__item d-flex align-items-center">
              <span className="milestone__icon">
                <i className="fa-solid fa-flag-checkered"></i>
              </span>
              <p>Initial Planning Complete</p>
              <span className="milestone__date">Jan 15, 2024</span>
            </div>
            <div className="milestone__item d-flex align-items-center">
              <span className="milestone__icon">
                <i className="fa-solid fa-code"></i>
              </span>
              <p>Development Phase Started</p>
              <span className="milestone__date">Feb 01, 2024</span>
            </div>
            <div className="milestone__item d-flex align-items-center">
              <span className="milestone__icon">
                <i className="fa-solid fa-pencil-ruler"></i>
              </span>
              <p>Design Prototypes Approved</p>
              <span className="milestone__date">Mar 10, 2024</span>
            </div>
            <div className="milestone__item d-flex align-items-center">
              <span className="milestone__icon">
                <i className="fa-solid fa-bug"></i>
              </span>
              <p>Beta Testing Begins</p>
              <span className="milestone__date">May 20, 2024</span>
            </div>
            <div className="milestone__item d-flex align-items-center">
              <span className="milestone__icon">
                <i className="fa-solid fa-rocket"></i>
              </span>
              <p>Project Launch</p>
              <span className="milestone__date">Aug 15, 2024</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProjectMilestones;
