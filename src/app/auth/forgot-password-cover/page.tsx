import Link from 'next/link';
import React from 'react';
import logoSvg from '../../../../public/assets/images/logo/logo.svg';
import logoWhite from '../../../../public/assets/images/logo/logo-white.svg';
import Image from 'next/image';
import passwordimg from "../../../../public/assets/images/sign/forget.png";
import ForgotCoverForm from '@/form/auth/forgot-password/cover-form';

const ForgotPasswordCoverMain = () => {
    return (
        <>
            <div className="authentication-wrapper cover-authentication">
                <div className="authentication-inner grid grid-cols-12 gap-5 ps-3 pe-3">
                    {/* -- forgotten image -- */}
                    <div className=" hidden md:flex col-span-6 lg:col-span-7 p-0">
                        <div className="authentication-image flex justify-center items-center">
                            <Image src={passwordimg} style={{ width: "auto", height: "auto" }} priority alt="image" />
                        </div>
                    </div>
                    {/* -- forgotten image -- */}

                    {/* forgot area */}
                    <div className="flex col-span-12 md:col-span-6 lg:col-span-5 items-center">
                        <div className="card__wrapper no-height">
                            <div className="authentication-top text-center mb-[20px]">
                                <Link href="#" className="authentication-logo logo-black">
                                    <Image style={{ width: "100%", height: "auto" }} src={logoSvg} alt="logo" />
                                </Link>
                                <Link href="#" className="authentication-logo logo-white">
                                    <Image style={{ width: "100%", height: "auto" }} src={logoWhite} alt="logo" />
                                </Link>
                                <h4 className="mb-[15px]">Forgot Password?</h4>
                                <p className="mb-[15px]">Please enter your email address, and {`we'll`} send you instructions to reset your
                                    password.</p>
                            </div>
                            {/* forgot cover form */}
                            <ForgotCoverForm />
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ForgotPasswordCoverMain;