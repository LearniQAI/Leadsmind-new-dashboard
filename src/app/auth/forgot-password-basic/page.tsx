import Image from 'next/image';
import Link from 'next/link';
import React from 'react';
import logoSvg from '../../../../public/assets/images/logo/logo.svg';
import logoWhite from '../../../../public/assets/images/logo/logo-white.svg';
import ForgotBasicForm from '@/form/auth/forgot-password/basic-form';

const ForgotPasswordBasicMain = () => {
    return (
        <>
            <div className="container-xxl">
                {/* -- forgot area start-- */}
                <div className="authentication-wrapper basic-authentication">
                    <div className="authentication-inner">
                        <div className="card__wrapper">
                            <div className="authentication-top text-center mb-[20px]">
                                <Link href="#" className="authentication-logo logo-black">
                                    <Image style={{ width: "100%", height: "auto" }} src={logoSvg} alt="logo" />
                                </Link>
                                <Link href="#" className="authentication-logo logo-white">
                                    <Image style={{ width: "100%", height: "auto" }} src={logoWhite} alt="logo" />
                                </Link>
                                <h4 className="mb-[15px]">Forgot Password?</h4>
                                <p className="mb-[15px]">Please enter your email address, and {`we'll`} send you instructions to reset your password.</p>
                            </div>
                            {/* forgot form */}
                            <ForgotBasicForm/>
                            {/* forgot form end*/}
                        </div>
                    </div>
                </div>
                {/* -- forgot area end-- */}

            </div>
        </>
    );
};

export default ForgotPasswordBasicMain;