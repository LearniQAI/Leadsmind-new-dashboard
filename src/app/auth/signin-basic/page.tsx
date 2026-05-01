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
                                <h4 className="mb-[15px]">Welcome to LeadsMind</h4>
                                <p className="mb-[15px]">Please sign-in to your account and start the adventure</p>
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