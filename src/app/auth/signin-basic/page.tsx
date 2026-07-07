import Link from 'next/link';
import React from 'react';
import SignInBasicForm from '@/form/auth/SignIn/basic-form';
import SocialLinks from '@/components/SocialLinks/SocialLinks';
import AuthSplitLayout from '@/components/auth/AuthSplitLayout';

const SignInBasicMain = () => {
  return (
    <AuthSplitLayout
      headline={
        <>
          Welcome back to
          <br />
          LeadsMind
        </>
      }
      formHeading="Sign in to your account"
      formSubheading="Welcome back! Please enter your details."
    >
      {/* Sign in basic form area*/}
      <SignInBasicForm />
      {/* Sign in basic end area*/}
      <p className="text-center text-sm !text-[#64748B] mt-4">
        <span>New on our platform? </span>
        <Link href="/auth/signup-basic">
          <span className="font-semibold text-[#4F46E5] hover:text-[#4338CA] transition-colors">Create an account</span>
        </Link>
      </p>
      <div className="flex items-center gap-3 my-4">
        <div className="flex-1 h-px bg-[#E2E8F0]" />
        <span className="text-[13px] font-medium text-[#94A3B8]">or</span>
        <div className="flex-1 h-px bg-[#E2E8F0]" />
      </div>
      {/* Social link*/}
      <div className="flex justify-center">
        <SocialLinks />
      </div>
    </AuthSplitLayout>
  );
};

export default SignInBasicMain;
