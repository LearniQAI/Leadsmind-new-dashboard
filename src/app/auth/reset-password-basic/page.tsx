import Link from 'next/link';
import React from 'react';
import logoSvg from '../../../../public/assets/images/logo/logo.svg';
import logoWhite from '../../../../public/assets/images/logo/logo-white.svg';
import Image from 'next/image';
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