import Image from 'next/image';
import Link from 'next/link';
import React from 'react';
import errorImg from "../../../public/assets/images/error/error-img-1.png";

const ErrorPageMain = () => {
    return (
        <>
            {/* -- error area start -- */}
            <div className="container-xxl">
                <div className="error-wrapper">
                    <div className="error-thumb">
                        <Image src={errorImg} style={{ width: "100%", height: "auto" }} alt="image" />
                    </div>
                    <div className="error-content">
                        <h2>Sorry, something went wrong</h2>
                        <p>Sorry, the page you are looking for cannot be found. It might have been removed, had its
                            name
                            changed, or is temporarily unavailable.</p>
                        <div className="error-btn">
                            <Link href="/" className="btn btn-primary rounded-pill xxl">Back to Home</Link>
                        </div>
                    </div>
                </div>
            </div>
            {/* -- error area end -- */}
        </>
    );
};

export default ErrorPageMain;