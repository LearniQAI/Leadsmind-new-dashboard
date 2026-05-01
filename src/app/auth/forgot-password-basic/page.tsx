import Link from 'next/link';
import React from 'react';
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