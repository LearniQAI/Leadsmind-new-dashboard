import Link from 'next/link';
import React from 'react';
interface TTimeline{
    id:number;
    step:string;
    title:string;
    description:string;
    iconClass:string;
    link:string
}

const VerticalTimeline = () => {
    const timelineData:TTimeline[] = [
        {
            id: 1,
            step: '01',
            title: 'Employee Recruitment',
            description: 'Attract and hire the best talent to join your team. Manage applications and schedule interviews seamlessly.',
            iconClass: 'fa fa-user-plus',
            link: '#',
        },
        {
            id: 2,
            step: '02',
            title: 'Onboarding Process',
            description: 'Ensure a smooth onboarding experience for new employees, with all necessary documentation and training.',
            iconClass: 'fa fa-user-tie',
            link: '#',
        },
        {
            id: 3,
            step: '03',
            title: 'Training and Development',
            description: 'Provide continuous training and development opportunities to help employees grow their skills and careers.',
            iconClass: 'fa fa-chalkboard-teacher',
            link: '#',
        },
        {
            id: 4,
            step: '04',
            title: 'Performance Management',
            description: 'Regularly evaluate employee performance to ensure alignment with company goals and provide constructive feedback.',
            iconClass: 'fa fa-handshake',
            link: '#',
        },
    ];
    return (
        <>
            <div className="card__wrapper">
            <div className="card__title-wrap mb-[20px]">
                <h5 className="card__heading-title">Vertical Timeline</h5>
            </div>
            <div className="bd-timeline-wrapper-2">
                {timelineData.map(item => (
                    <div className="bd-timeline-item-2" key={item.id}>
                        <Link href={item.link} className="bd-timeline-content-2">
                            <div className="bd-timeline-icon-2">
                                <i className={item.iconClass}></i>
                            </div>
                            <div className="bd-timeline-step">
                                <span>step</span>{item.step}
                            </div>
                            <h3 className="title">{item.title}</h3>
                            <p className="description">
                                {item.description}
                            </p>
                        </Link>
                    </div>
                ))}
            </div>
        </div>
        </>
    );
};

export default VerticalTimeline;