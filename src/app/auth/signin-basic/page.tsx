import Link from 'next/link';
import React from 'react';
import SignInBasicForm from '@/form/auth/SignIn/basic-form';
import SocialLinks from '@/components/SocialLinks/SocialLinks';

const SignInBasicMain = () => {
    return (
        <>
            <div className="container-xxl">
                {/* -- SignIn area start-- */}
                <div className="authentication-wrapper basic-authentication">
                    <div className="authentication-inner">
                        <div className="card__wrapper">
                            <div className="authentication-top text-center mb-[20px]">
                                <div className="flex items-center justify-center gap-1 mb-[15px]">
                                    <span className="text-3xl font-black tracking-tight text-primary uppercase">Le</span>
                                    <div className="relative w-8 h-8 bg-gradientPrimary rounded-full flex items-center justify-center">
                                        <div className="w-2.5 h-2.5 bg-white rounded-full shadow-lg" />
                                    </div>
                                    <span className="text-3xl font-black tracking-tight text-primary uppercase">dsmind</span>
                                </div>
                                <p className="mb-[15px] text-body-light">Please sign-in to your account and start the adventure</p>
                            </div>
                            {/* Sign in basic form area*/}
                            <SignInBasicForm />
                            {/* Sign in basic end area*/}
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
                {/* -- SignIn area end-- */}
            </div>
        </>
    );
};

export default SignInBasicMain;