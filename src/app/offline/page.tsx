"use client"
import Image from 'next/image';
import React from 'react';
import offlineImg from "../../../public/assets/images/error/offline.png";

const OfflineMain = () => {
    return (
        <>
            {/* -- offline area start -- */}
            <div className="container-xxl">
                <div className="error-wrapper">
                    <div className="error-thumb">
                        <Image src={offlineImg} priority style={{ width: "100%", height: "auto" }} alt="image" />
                    </div>
                    <div className="error-content">
                        <h2>{`We're`} Currently Offline</h2>
                        <p>It looks like you {`aren't`} connected to the internet. When {`you're`} back online, please refresh the page
                        </p>
                        <div className="error-btn">
                            <button className="btn btn-primary rounded-pill xxl" onClick={() => window.location.reload()}>Refresh</button>
                        </div>
                    </div>
                </div>
            </div>
            {/* -- offline area end -- */}
        </>
    );
};

export default OfflineMain;