import Link from 'next/link';
import React from 'react';
import ResetPasswordBasicForm from '@/form/auth/reset-password-basic/basic-form';

const ResetPasswordBasicMain = () => {
    return (
        <>
            <div className="container-xxl">
                {/* -- reset password area start-- */}
                <div className="authentication-wrapper basic-authentication">
                    <div className="authentication-inner">
                        <div className="card__wrapper">
                            <div className="authentication-top text-center mb-[20px]">
                                <h4 className="mb-[15px]">Reset Password</h4>
                                <p className="mb-[15px]">for nairamuskan@leadsmind.com</p>
                            </div>
                            {/* reset form */}
                            <ResetPasswordBasicForm />
                            {/* reset form end*/}
                        </div>
                    </div>
                </div>
                {/* -- reset password area start-- */}
            </div>
        </>
    );
};

export default ResetPasswordBasicMain;