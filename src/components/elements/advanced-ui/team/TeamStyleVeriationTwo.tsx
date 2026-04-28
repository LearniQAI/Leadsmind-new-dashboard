
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { teamStyleTwoData } from '@/data/team-data';

const TeamStyleVeriationTwo = () => {
    return (
        <div className="card__wrapper">
            <div className="card__title-wrap mb-[20px]">
                <h5 className="card__heading-title">Team Style 2</h5>
            </div>
            <div className="grid grid-cols-12 gap-y-5 gap-x-6 maxXs:gap-x-0">
                {teamStyleTwoData.map((member) => (
                    <div
                        key={member.id}
                        className="col-span-12 sm:col-span-6 lg:col-span-3"
                    >
                        <div className="team-wrapper team-style-one">
                            <div className="team-content-wrap position-relative">
                                <div className="team-thumb-wrap">
                                    <div className="team-thumb image-overly radius-8">
                                        <Link href={member.profileLink}>
                                            <Image src={member.image} priority style={{width:"auto", height:"auto"}} alt={`${member.title} image`} />
                                        </Link>
                                    </div>
                                    <div className="team-social has-white-bg">
                                        <Link className="icon-one" target="_blank" href={member.socialLinks.facebook}>
                                            <i className="icon-facebook"></i>
                                        </Link>
                                        <Link className="icon-two" target="_blank" href={member.socialLinks.twitter}>
                                            <i className="icon-twitter-x"></i>
                                        </Link>
                                        <Link className="icon-three" target="_blank" href={member.socialLinks.instagram as string}>
                                            <i className="icon-instagram"></i>
                                        </Link>
                                        <Link className="icon-four" target="_blank" href={member.socialLinks.linkedin}>
                                            <i className="icon-linkedin"></i>
                                        </Link>
                                    </div>
                                </div>
                                <div className="team-content">
                                    <h4 className="team-member-name mb-2.5">
                                        <Link href={member.profileLink}>{member.title}</Link>
                                    </h4>
                                    <span className="team-member-designation">{member.designation}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TeamStyleVeriationTwo;
