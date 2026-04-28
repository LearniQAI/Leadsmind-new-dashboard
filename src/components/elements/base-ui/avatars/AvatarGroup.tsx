
import Image from 'next/image';
import React from 'react';
import avatarImg from "../../../../../public/assets/images/avatar/avatar1.png";
import avatarImgTwo from "../../../../../public/assets/images/avatar/avatar2.png";
import avatarImgThree from "../../../../../public/assets/images/avatar/avatar3.png";
import avatarImgFour from "../../../../../public/assets/images/avatar/avatar4.png";


const AvatarGroup = () => {

    return (
        <>
            <div className="card__wrapper">
                <div className="card__title-wrap mb-[20px]">
                    <h5 className="card__heading-title">Avatar Group</h5>
                </div>
                <div className="flex items-center gap-[10px] sm:gap-[20px]">
                    <div className="avatar">
                        <ul>
                            <li><Image className="w-[60px] rounded-[50%]" priority    src={avatarImg} alt="image" />
                            </li> 
                            <li><Image className="w-[60px] rounded-[50%]" priority  src={avatarImgTwo} alt="image" />
                            </li>
                            <li><Image className="w-[60px] rounded-[50%]" priority  src={avatarImgThree} alt="image" />
                            </li>
                            <li><Image className="w-[60px] rounded-[50%]" priority  src={avatarImgFour} alt="image" />
                            </li>
                        </ul>
                    </div>
                    <div className="avatar">
                        <ul>
                            <li><Image className="w-[50px] rounded-[50%]" priority  src={avatarImg} alt="image" />
                            </li>
                            <li><Image className="w-[50px] rounded-[50%]" priority  src={avatarImgTwo} alt="image" />
                            </li>
                            <li><Image className="w-[50px] rounded-[50%]" priority  src={avatarImgThree} alt="image" />
                            </li>
                            <li><Image className="w-[50px] rounded-[50%]" priority  src={avatarImgFour} alt="image" />
                            </li>
                        </ul>
                    </div>
                    <div className="avatar">
                        <ul>
                            <li><Image className="w-[40px] rounded-[50%]" priority  src={avatarImg} alt="image" />
                            </li>
                            <li><Image className="w-[40px] rounded-[50%]" priority  src={avatarImgTwo} alt="image" />
                            </li>
                            <li><Image className="w-[40px] rounded-[50%]" priority  src={avatarImgThree} alt="image" />
                            </li>
                            <li><Image className="w-[40px] rounded-[50%]" priority  src={avatarImgFour} alt="image" />
                            </li>
                        </ul>
                    </div>
                    <div className="avatar">
                        <ul>
                            <li><Image className="w-[36px] rounded-[50%]" priority  src={avatarImg} alt="image" />
                            </li>
                            <li><Image className="w-[36px] rounded-[50%]" priority  src={avatarImgTwo} alt="image" />
                            </li>
                            <li><Image className="w-[36px] rounded-[50%]" priority  src={avatarImgThree} alt="image" />
                            </li>
                            <li><Image className="w-[36px] rounded-[50%]" priority  src={avatarImgFour} alt="image" />
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </>
    );
};

export default AvatarGroup;