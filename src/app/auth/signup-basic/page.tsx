import Link from 'next/link';
import React from 'react';
import SocialLinks from '@/components/SocialLinks/SocialLinks';
import SignUpBasicForm from '@/form/auth/SignUp/basic-form';
import AuthSplitLayout from '@/components/auth/AuthSplitLayout';

const SignUpBasicMain = () => {
  return (
    <AuthSplitLayout
      headline={
        <>
          Join 500+ African
          <br />
          businesses on LeadsMind
        </>
      }
      formHeading="Create your free account"
      formSubheading="Start your 14-day free trial today."
    >
      {/* Sign up basic form */}
      <SignUpBasicForm />
      {/* Sign up basic form end*/}
      <p className="text-center text-sm !text-[#64748B] mt-4">
        <span>Already have an account? </span>
        <Link href="/auth/signin-basic">
          <span className="font-semibold text-[#4F46E5] hover:text-[#4338CA] transition-colors">Sign in</span>
        </Link>
      </p>
      <div className="flex items-center gap-3 my-4">
        <div className="flex-1 h-px bg-[#E2E8F0]" />
        <span className="text-[13px] font-medium text-[#94A3B8]">or</span>
        <div className="flex-1 h-px bg-[#E2E8F0]" />
      </div>
      {/* social link */}
      <div className="flex justify-center">
        <SocialLinks />
      </div>
    </AuthSplitLayout>
  );
};

export default SignUpBasicMain;
