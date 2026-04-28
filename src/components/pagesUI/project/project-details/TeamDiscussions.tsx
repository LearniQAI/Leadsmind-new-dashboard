import Link from "next/link";
import React from "react";
const TeamDiscussions = () => {
  return (
    <>
      <div className="grid grid-cols-12">
        <div className="col-span-12">
          <div className="card__wrapper">
            <div className="card__title-wrap mb-25">
              <h5 className="card__heading-title">Team Discussions</h5>
            </div>
            <div className="card__body">
              <div className="discussions__list">
                <div className="discussion__item">
                  <h6>Kickoff Meeting</h6>
                  <p>
                    Discussed initial project scope and timelines, identified
                    key milestones, and assigned initial tasks to team members.
                    Ensured everyone was aligned on project goals and
                    expectations. <Link href="">View Notes</Link>
                  </p>
                </div>
                <div className="discussion__item">
                  <h6>Design Review</h6>
                  <p>
                    Reviewed design prototypes and made adjustments based on
                    feedback. Emphasized user experience improvements and
                    discussed visual design elements to enhance user engagement.{" "}
                    <Link href="">View Notes</Link>
                  </p>
                </div>
                <div className="discussion__item">
                  <h6>Development Sprint Planning</h6>
                  <p>
                    Outlined tasks for the upcoming sprint, prioritized
                    features, and set realistic timelines for deliverables.
                    Discussed potential roadblocks and strategies to mitigate
                    risks. <Link href="">View Notes</Link>
                  </p>
                </div>
                <div className="discussion__item">
                  <h6>QA Testing Feedback</h6>
                  <p>
                    Discussed bugs and issues found during beta testing,
                    categorized them based on severity, and assigned them to
                    appropriate team members for resolution. Planned for
                    regression testing and validation of fixes.{" "}
                    <Link href="">View Notes</Link>
                  </p>
                </div>
                <div className="discussion__item">
                  <h6>Launch Preparation</h6>
                  <p>
                    Finalized details for the project launch, including
                    marketing strategies, user onboarding processes, and
                    post-launch support plans. Ensured all team members were
                    prepared for their roles during the launch phase.{" "}
                    <Link href="">View Notes</Link>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default TeamDiscussions;
