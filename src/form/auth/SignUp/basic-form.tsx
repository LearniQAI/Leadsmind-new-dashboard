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
          emailRedirectTo: 'https://www.leadsmind.io/auth/callback?next=/',
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
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-500/10 text-emerald-500 shadow-xl shadow-emerald-500/5">
          <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h4 className="mb-2">Check your email</h4>
        <p className="mb-4">
          We&apos;ve sent a verification link to <strong>{getValues("email")}</strong>. 
          Click the link in the email to activate your account.
        </p>
        <div className="p-4 mb-4 rounded bg-gray-100 text-sm text-left">
          <p className="font-bold mb-2 text-gray-500 uppercase">Didn&apos;t receive the email?</p>
          <ul className="list-disc pl-4 space-y-1 text-gray-600">
            <li>Check your spam folder</li>
            <li>Wait a few minutes (it can take time)</li>
            <li>Ensure your email address is correct</li>
          </ul>
        </div>
        <button 
          className="btn btn-primary w-full"
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
        <div className="from__input-box">
          <div className="form__input-title">
            <label htmlFor="nameEmail">Username</label>
          </div>
          <div className="form__input">
            <input
              className="form-control"
              id="nameEmail"
              type="text"
              disabled={isLoading}
              {...register("name", { required: "Username is required" })}
            />
            <ErrorMessage error={errors.name} />
          </div>
        </div>
        <div className="from__input-box">
          <div className="form__input-title">
            <label htmlFor="email">Email</label>
          </div>
          <div className="form__input">
            <input
              className="form-control"
              id="email"
              type="email"
              disabled={isLoading}
              {...register("email", { required: "Email is required" })}
            />
            <ErrorMessage error={errors.email} />
          </div>
        </div>
        <div className="from__input-box">
          <div className="form__input-title flex justify-between">
            <label htmlFor="passwordInput">Password</label>
            <Link href="/auth/forgot-password-basic">
              <small>Forgot Password?</small>
            </Link>
          </div>
          <div className="form__input">
            <input
              className="form-control"
              type={isPasswordVisible ? "text" : "password"}
              id="passwordInput"
              disabled={isLoading}
              {...register("password", { required: "Password is required" })}
            />
            <ErrorMessage error={errors.password} />
            <div className="pass-icon" onClick={togglePasswordVisibility}>
              <i className={`fa-sharp fa-light ${isPasswordVisible ? "fa-eye" : "fa-eye-slash"}`}></i>
            </div>
          </div>
        </div>
        <div className="mb-4">
          <div className="form-check">
            <FormControlLabel control={
              <Checkbox className='custom-checkbox' disabled={isLoading} {...register("rememberMe")} />
            }
              label="Remember Me"
            />
          </div>
        </div>
        <div className="mb-4">
          <button className="btn btn-primary w-full" type="submit" disabled={isLoading}>
            {isLoading ? "Signing up..." : "Sign Up"}
          </button>
        </div>
      </form>
    </>
  );
};

export default SignUpBasicForm;
