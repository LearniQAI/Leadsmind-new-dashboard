import Image from 'next/image';
import React from 'react';
import maintenanceBg from "../../../public/assets/images/error/maintenance-bg.png";
import Link from 'next/link';

const MaintenanceMain = () => {
    return (
        <>

            {/* -- maintenance area start -- */}
            <div className="container-xxl">
                <div className="error-wrapper">
                    <div className="error-thumb">
                        <Image src={maintenanceBg} style={{ width: "100%", height: "auto" }} alt="image" />
                    </div>
                    <div className="error-content">
                        <h2>Site Under Maintenance</h2>
                        <p>We are currently performing maintenance on our site to improve your experience. We apologize for any
                            inconvenience this may cause.</p>
                        <div className="error-btn">
                            <Link href="/" className="btn btn-primary rounded-pill xxl">Back to Home</Link>
                        </div>
                    </div>
                </div>
            </div>
            {/* -- maintenance area end -- */}
        </>
    );
};

export default MaintenanceMain;