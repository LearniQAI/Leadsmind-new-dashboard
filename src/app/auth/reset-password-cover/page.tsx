import ResetPasswordCoverForm from '@/form/auth/reset-password-basic/cover-form';
import Image from 'next/image';
import Link from 'next/link';
import React from 'react';
import logoSvg from '../../../../public/assets/images/logo/logo.svg';
import logoWhite from '../../../../public/assets/images/logo/logo-white.svg';
import passwordimg from "../../../../public/assets/images/sign/my-passward.png";

const ResetPasswordCoverMain = () => {
    return (
        <>
            <div className="authentication-wrapper cover-authentication">
                <div className="authentication-inner grid grid-cols-12 gap-5 ps-3 pe-3">
                    {/* -- Reset image -- */}
                    <div className="hidden md:flex col-span-6 lg:col-span-7 p-0">
                        <div className="authentication-image flex justify-center items-center">
                            <Image src={passwordimg} style={{ width: "auto", height: "auto" }} priority alt="image" />
                        </div>
                    </div>
                    {/* -- Reset image -- */}

                    {/* -- reset password area start -- */}
                    <div className="flex col-span-12 md:col-span-6 lg:col-span-5 items-center">
                        <div className="card__wrapper no-height">
                            <div className="authentication-top text-center mb-[20px]">
                                <Link href="#" className="authentication-logo logo-black">
                                    <Image style={{ width: "100%", height: "auto" }} src={logoSvg} alt="logo" />
                                </Link>
                                <Link href="#" className="authentication-logo logo-white">
                                    <Image style={{ width: "100%", height: "auto" }} src={logoWhite} alt="logo" />
                                </Link>
                                <h4 className="mb-[15px]">Reset Password</h4>
                                <p className="mb-[15px]">for nairamuskan@manez.com</p>
                            </div>
                            {/* reset form */}
                            <ResetPasswordCoverForm />
                            {/* reset form */}
                        </div>
                    </div>
                    {/* -- reset password area start -- */}
                </div>
            </div>
        </>
    );
};

export default ResetPasswordCoverMain;