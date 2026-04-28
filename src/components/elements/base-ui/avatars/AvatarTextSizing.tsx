import React from 'react';

const AvatarTextSizing = () => {
    return (
        <>
            <div className="card__wrapper">
                <div className="card__title-wrap mb-[20px]">
                    <h5 className="card__heading-title">Avatar Text Sizing</h5>
                </div>
                <div className="flex items-center gap-[10px] sm:gap-[20px]">
                    <div className="avatar">
                        <ul>
                            <li><span className="avatar-bg avatar-bg-xxl">MZ</span></li>
                            <li><span className="avatar-bg avatar-bg-xl">MZ</span></li>
                            <li><span className="avatar-bg avatar-bg-lg">MZ</span></li>
                            <li><span className="avatar-bg avatar-bg-md">MZ</span></li>
                            <li><span className="avatar-bg avatar-bg-sm">MZ</span></li>
                            <li><span className="avatar-bg avatar-bg-xs">MZ</span></li>
                        </ul>
                    </div>
                </div>
            </div>
        </>
    );
};

export default AvatarTextSizing;