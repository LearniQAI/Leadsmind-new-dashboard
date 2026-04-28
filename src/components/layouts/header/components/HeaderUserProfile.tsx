import Image from 'next/image';
import Link from 'next/link';
import React from 'react';
import avatarImg from "../../../../../public/assets/images/avatar/avatar.png";
import UserIcon from '@/svg/header-svg/Profile/UserIcon';
import ChatIcon from '@/svg/header-svg/Profile/ChatIcon';
import EmailIcon from '@/svg/header-svg/Profile/EmailIcon';
import AddAccountIcon from '@/svg/header-svg/Profile/AddAccountIcon';
import LogOut from '@/svg/header-svg/Profile/LogOut';
//types
type TUserProps={
    handleShowUserDrowdown:()=>void;
    isOpenUserDropdown:boolean;
}

const HeaderUserProfile = ({handleShowUserDrowdown, isOpenUserDropdown}:TUserProps) => {
    return (
        <>
            <div className="nav-item relative">
                 {/* Clickable profile icon */}
                <Link id="userportfolio" href="#" onClick={handleShowUserDrowdown}>
                    <div className="user__portfolio">
                        <div className="user__portfolio-thumb">
                            <Image src={avatarImg} alt="img not found" />
                        </div>
                        <div className="user__content">
                            <h5>Jhon Smith</h5>
                            <span>online</span>
                        </div>
                    </div>
                </Link>
                {/* Conditional rendering of the dropdown */}
                {isOpenUserDropdown && (
                    <div className={`user__dropdown ${isOpenUserDropdown ? "user-enable" : " "}`}>
                    <ul>
                        <li>
                            <Link href="/hrm/employee-profile">
                            <UserIcon/>
                                Profile</Link>
                        </li>
                        <li>
                            <Link href="/apps/app-chat">
                           <ChatIcon/>
                                chat</Link>
                        </li>
                        <li>
                            <Link href="/apps/email-inbox">
                            <EmailIcon/>
                                inbox
                            </Link>
                        </li>
                        <li>
                            <Link href="/auth/signup-basic">
                            <AddAccountIcon/>
                                add acount
                            </Link>
                        </li>
                        <li>
                            <Link href="/auth/signin-basic">
                        <LogOut/>
                                Log Out</Link>
                        </li>
                    </ul>
                </div>
                )}
            </div>
        </>
    );
};

export default HeaderUserProfile;