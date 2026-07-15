"use client"
import ErrorMessage from '@/components/error-message/ErrorMessage';
import { ISignUpForm } from '@/interface';
import { Checkbox, FormControlLabel } from '@mui/material';
import Link from 'next/link';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { setupWorkspace, setActiveWorkspace } from '@/app/actions/auth';
import { Eye, EyeOff } from 'lucide-react';

const inputClass =
  'w-full px-4 py-3 border-[1.5px] border-[#E2E8F0] rounded-[10px] text-[15px] text-[#0F172A] bg-white outline-none transition-colors duration-150 focus:border-[#4F46E5] focus:ring-4 focus:ring-[#4F46E5]/10 disabled:opacity-60';
const labelClass = 'block text-[13px] font-semibold text-[#374151] mb-1.5';

const SignUpBasicForm = () => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerificationSent, setIsVerificationSent] = useState(false);
  
  const router = useRouter();
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<ISignUpForm>();

  const onSubmit = async (values: ISignUpForm) => {
    setIsLoading(true);
    try {
      // Step 1: Sign up via Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: { full_name: values.name },
          emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/`,
        },
      });

      if (authError) {
        if (authError.message.toLowerCase().includes('already registered')) {
          toast.error('An account with this email already exists. Try logging in.');
        } else {
          toast.error(authError.message);
        }
        return;
      }

      if (!authData.user) {
        toast.error('Signup succeeded but no user was returned. Please try logging in.');
        return;
      }

      const userId = authData.user.id;
      const session = authData.session;

      // If no session is returned, it means email confirmation is required
      if (!session) {
        setIsVerificationSent(true);
        toast.success('Verification email sent! Please check your inbox.');
        return;
      }

      const nameParts = values.name.trim().split(' ');
      const firstName = nameParts[0] ?? values.email.split('@')[0];
      const lastName = nameParts.slice(1).join(' ');

      try {
        const result = await setupWorkspace({
          userId,
          email: values.email,
          firstName,
          lastName,
          workspaceName: `${values.name}'s Workspace`,
        });

        if (result.success && result.workspaceId) {
          await setActiveWorkspace(result.workspaceId);
        } else {
          console.warn('[SignupForm] setupWorkspace non-success:', result.error);
          // Don't block — dashboard handles missing workspace gracefully
        }
      } catch (setupErr) {
        console.warn('[SignupForm] setupWorkspace threw (non-blocking):', setupErr);
        // Still proceed — dashboard & auth.ts will auto-create workspace
      }

      toast.success('Account created! Welcome to LeadsMind.');
      router.push('/');
      router.refresh();
    } catch (error) {
      console.error('[SignupForm] Unexpected error:', error);
      toast.error(error instanceof Error ? error.message : 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  //password visibility handle
  const togglePasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  if (isVerificationSent) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-50 text-emerald-500">
          <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h4 className="mb-2 text-xl font-extrabold !text-[#0F172A]">Check your email</h4>
        <p className="mb-4 text-sm !text-[#64748B]">
          We&apos;ve sent a verification link to <strong className="!text-[#0F172A]">{getValues("email")}</strong>.
          Click the link in the email to activate your account.
        </p>
        <div className="p-4 mb-4 rounded-[10px] bg-[#F8FAFC] border border-[#E2E8F0] text-sm text-left">
          <p className="font-bold mb-2 !text-[#64748B] uppercase text-xs tracking-wide">Didn&apos;t receive the email?</p>
          <ul className="list-disc pl-4 space-y-1 !text-[#64748B]">
            <li>Check your spam folder</li>
            <li>Wait a few minutes (it can take time)</li>
            <li>Ensure your email address is correct</li>
          </ul>
        </div>
        <button
          className="w-full rounded-[10px] py-3.5 text-[15px] font-bold text-white shadow-[0_4px_12px_rgba(79,70,229,0.3)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(79,70,229,0.4)]"
          style={{ background: 'linear-gradient(135deg, #4F46E5, #6366F1)' }}
          onClick={() => setIsVerificationSent(false)}
        >
          ← Back to signup
        </button>
      </div>
    );
  }

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="flex flex-col gap-3 mb-5">
          <div className="from__input-box">
            <label htmlFor="nameEmail" className={labelClass}>Username</label>
            <div className="form__input">
              <input
                className={inputClass}
                id="nameEmail"
                type="text"
                disabled={isLoading}
                {...register("name", { required: "Username is required" })}
              />
              <ErrorMessage error={errors.name} />
            </div>
          </div>
          <div className="from__input-box">
            <label htmlFor="email" className={labelClass}>Email</label>
            <div className="form__input">
              <input
                className={inputClass}
                id="email"
                type="email"
                disabled={isLoading}
                {...register("email", { required: "Email is required" })}
              />
              <ErrorMessage error={errors.email} />
            </div>
          </div>
          <div className="from__input-box">
            <div className="flex justify-between items-center mb-1.5">
              <label htmlFor="passwordInput" className="text-[13px] font-semibold text-[#374151]">Password</label>
              <Link href="/auth/forgot-password-basic">
                <small className="text-xs font-medium text-[#4F46E5] hover:text-[#4338CA] transition-colors">Forgot Password?</small>
              </Link>
            </div>
            <div className="form__input relative">
              <input
                className={`${inputClass} pr-11`}
                type={isPasswordVisible ? "text" : "password"}
                id="passwordInput"
                disabled={isLoading}
                {...register("password", { required: "Password is required" })}
              />
              <div
                className="absolute right-3.5 top-1/2 -translate-y-1/2 cursor-pointer text-[#94A3B8] hover:text-[#4F46E5] transition-colors"
                onClick={togglePasswordVisibility}
              >
                {isPasswordVisible ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
              </div>
              <ErrorMessage error={errors.password} />
            </div>
          </div>
        </div>
        <div className="mb-4">
          <div className="form-check">
            <FormControlLabel control={
              <Checkbox
                className='custom-checkbox'
                disabled={isLoading}
                sx={{ color: '#CBD5E1', '&.Mui-checked': { color: '#4F46E5' } }}
                {...register("rememberMe")}
              />
            }
              label={<span className="text-[13px] font-medium text-[#374151]">Remember Me</span>}
            />
          </div>
        </div>
        <div>
          <button
            className="w-full rounded-[10px] py-3.5 text-[15px] font-bold text-white shadow-[0_4px_12px_rgba(79,70,229,0.3)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(79,70,229,0.4)] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            style={{ background: 'linear-gradient(135deg, #4F46E5, #6366F1)' }}
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? "Signing up..." : "Sign Up"}
          </button>
        </div>
      </form>
    </>
  );
};

export default SignUpBasicForm;
