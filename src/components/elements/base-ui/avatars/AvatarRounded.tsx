import Image from 'next/image';
import React from 'react';
import avatarImg from "../../../../../public/assets/images/avatar/avatar.png";

const AvatarRounded = () => {
    return (
        <>
            <div className="card__wrapper">
                <div className="card__title-wrap mb-[20px]">
                    <h5 className="card__heading-title">Avatar Rounded</h5>
                </div>
                <div className="avatar-showcase">
                    <div className="avatars flex items-center gap-[10px] sm:gap-[20px]">
                        <div className="avatar"><Image className="w-[100px] rounded-circle" priority  src={avatarImg} alt="image" /></div>
                        <div className="avatar"><Image className="w-[90px] rounded-circle" priority  src={avatarImg} alt="image" /></div>
                        <div className="avatar"><Image className="w-[80px] rounded-circle" priority  src={avatarImg} alt="image" /></div>
                        <div className="avatar"><Image className="w-[70px] rounded-circle" priority  src={avatarImg} alt="image" /></div>
                        <div className="avatar"><Image className="w-[60px] rounded-circle" priority  src={avatarImg} alt="image" /></div>
                        <div className="avatar"><Image className="w-[50px] rounded-circle" priority  src={avatarImg} alt="image" /></div>
                        <div className="avatar"><Image className="w-[40px] rounded-circle" priority  src={avatarImg} alt="image" /></div>
                        <div className="avatar"><Image className="w-[30px] rounded-circle" priority  src={avatarImg} alt="image" /></div>
                        <div className="avatar"><Image className="w-[24px] rounded-circle" priority  src={avatarImg} alt="image" /></div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default AvatarRounded;