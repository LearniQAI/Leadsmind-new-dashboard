import React from 'react';
import signUpImg from "../../../../public/assets/images/sign/sign-up.png";
import logoImg from "../.././../../public/assets/images/logo/logo.svg";
import logoWhite from '../../../../public/assets/images/logo/logo-white.svg';
import Image from 'next/image';
import Link from 'next/link';
import SignUpCoverForm from '@/form/auth/SignUp/cover-form';
import SocialLinks from '@/components/SocialLinks/SocialLinks';

const SignUpCoverMain = () => {
    return (
        <>
            <div className="authentication-wrapper cover-authentication">
                <div className="authentication-inner grid grid-cols-12 gap-5 ps-3 pe-3">
                    {/* -- Sign Up image -- */}
                    <div className="hidden md:flex col-span-6 lg:col-span-7 p-0">
                        <div className="authentication-image flex justify-center items-center">
                            <Image src={signUpImg} priority alt="image" />
                        </div>
                    </div>
                    {/* -- Sign Up image -- */}

                    {/* -- SignUp -- */}
                    <div className="flex col-span-12 md:col-span-6 lg:col-span-5 items-center">
                        <div className="card__wrapper no-height">
                            <div className="authentication-top text-center mb-[20px]">
                                <Link href="#" className="authentication-logo logo-black">
                                    <Image src={logoImg} style={{ width: "100%", height: "auto" }} alt="logo" />
                                </Link>
                                <Link href="#" className="authentication-logo logo-white">
                                    <Image src={logoWhite} style={{ width: "100%", height: "auto" }} alt="logo" />
                                </Link>
                                <h4 className="mb-[15px]">Welcome to Manez</h4>
                                <p className="mb-[15px]">Please sign-in to your account and start the adventure</p>
                            </div>
                            {/* Sign Up Cover form */}
                            <SignUpCoverForm />
                            {/* Sign Up Cover end*/}
                            <p className="text-center">
                                <span>New on our platform? </span>
                                <Link href="/auth/signup-basic">
                                    <span>Create an account</span>
                                </Link>
                            </p>
                            <div className="divider mb-2.5 text-center">
                                <div className="divider-text">or</div>
                            </div>
                            {/* social link */}
                            <SocialLinks />
                        </div>
                    </div>
                    {/* -- Login -- */}
                </div>
            </div>
        </>
    );
};

export default SignUpCoverMain;