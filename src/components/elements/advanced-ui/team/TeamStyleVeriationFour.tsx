import { teamStyleFourData } from "@/data/team-data";
import Image from "next/image";
import Link from "next/link";

const TeamStyleVeriationFour = () => {
    return (
        <>
            <div className="card__wrapper">
                <div className="card__title-wrap mb-[20px]">
                    <h5 className="card__heading-title">Team Style 4</h5>
                </div>
                <div className="grid grid-cols-12 justify-between gap-x-6 maxXs:gap-x-0 gap-y-5">
                    {teamStyleFourData.map(member => (
                        <div key={member.id} className="col-span-12 sm:col-span-6 lg:col-span-3">
                            <div className="team-wrapper team-style-three">
                                <div className="team-thumb image-overly radius-8 mb-[15px]">
                                    <Link href={member.profileLink}>
                                        <Image src={member.image} priority style={{ width: "100%", height: "auto" }} alt={member.title} />
                                    </Link>
                                </div>
                                <div className="team-content mb-2.5">
                                    <span className="team-member-designation mb-2.5">{member.designation}</span>
                                    <h4 className="team-member-name">
                                        <Link href={member.profileLink}>{member.title}</Link>
                                    </h4>
                                </div>
                                <div className="team-social">
                                    <Link className="icon-one" target="_blank" rel="noopener noreferrer" href={member.socialLinks.facebook}>
                                        <i className="icon-facebook"></i>
                                    </Link>
                                    <Link className="icon-two" target="_blank" rel="noopener noreferrer" href={member.socialLinks.twitter}>
                                        <i className="icon-twitter-x"></i>
                                    </Link>
                                    <Link className="icon-three" target="_blank" rel="noopener noreferrer" href={member.socialLinks.instagram as string}>
                                        <i className="icon-instagram"></i>
                                    </Link>
                                    <Link className="icon-four" target="_blank" rel="noopener noreferrer" href={member.socialLinks.linkedin}>
                                        <i className="icon-linkedin"></i>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
};

export default TeamStyleVeriationFour;