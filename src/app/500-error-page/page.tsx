import Image from 'next/image';
import React from 'react';
import errorThumb from "../../../public/assets/images/error/error-img-2.png";
import Link from 'next/link';

const Error500Page = () => {
    return (
        <>
            {/* -- error area start -- */}
            <div className="container-xxl">
                <div className="error-wrapper">
                    <div className="error-thumb">
                        <Image style={{width:"100%", height:"auto"}} priority src={errorThumb} alt="image"/>
                    </div>
                    <div className="error-content">
                        <h2>Internal server error</h2>
                        <p>The page you are trying to reach is currently unavailable. It might have been moved or no longer
                            exists.</p>
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

export default Error500Page;