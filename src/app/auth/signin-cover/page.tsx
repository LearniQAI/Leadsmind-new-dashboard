import Image from 'next/image';
import Link from 'next/link';
import React from 'react';
import signInImg from "../../../../public/assets/images/sign/sign-in.png";
import logoSvg from '../../../../public/assets/images/logo/logo.svg';
import logoWhite from '../../../../public/assets/images/logo/logo-white.svg';
import SignInCoverForm from '@/form/auth/SignIn/cover-form';
import SocialLinks from '@/components/SocialLinks/SocialLinks';

const SignInCoverMain = () => {
    return (
        <>
            {/* -- SignIn area start-- */}
            <div className="authentication-wrapper cover-authentication">
                <div className="authentication-inner grid grid-cols-12 gap-5 ps-3 pe-3">
                    {/* -- Sign In image -- */}
                    <div className="hidden md:flex col-span-6 lg:col-span-7 p-0">
                        <div className="authentication-image flex justify-center items-center">
                            <Image src={signInImg} style={{ width: "auto", height: "auto" }} priority alt="image" />
                        </div>
                    </div>
                    <div className="flex col-span-12 md:col-span-6 lg:col-span-5 items-center">
                        <div className="card__wrapper no-height">
                            <div className="authentication-top text-center mb-[20px]">
                                <Link href="#" className="authentication-logo logo-black">
                                    <Image style={{ width: "100%", height: "auto" }} src={logoSvg} alt="logo" />
                                </Link>
                                <Link href="#" className="authentication-logo logo-white">
                                    <Image style={{ width: "100%", height: "auto" }} src={logoWhite} alt="logo" />
                                </Link>
                                <h4 className="mb-[15px]">Welcome to Manez</h4>
                                <p className="mb-[15px]">Please sign-in to your account and start the adventure</p>
                            </div>
                            {/* Sign in cover form */}
                            <SignInCoverForm />
                            {/* Sign in cover form end */}
                            <p className="text-center">
                                <span>New on our platform? </span>
                                <Link href="/auth/signup-basic">
                                    <span>Create an account</span>
                                </Link>
                            </p>
                            <div className="divider mb-2.5 text-center">
                                <div className="divider-text">or</div>
                            </div>
                            {/* Social link*/}
                            <SocialLinks />
                        </div>
                    </div>

                </div>
            </div>
            {/* -- SignIn area end-- */}
        </>
    );
};

export default SignInCoverMain;