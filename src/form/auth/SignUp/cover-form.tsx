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

const SignUpCoverForm = () => {
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
          const switchResult = await setActiveWorkspace(result.workspaceId);
          if (!switchResult.success) {
            console.warn('[SignupCoverForm] setActiveWorkspace failed (non-blocking):', switchResult.error);
          }
        }
      } catch (setupErr) {
        console.warn('[SignupCoverForm] setupWorkspace threw (non-blocking):', setupErr);
      }

      toast.success('Account created! Welcome to LeadsMind.');
      router.push('/');
      router.refresh();
    } catch (error) {
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
        <h4 className="mb-2">Check your email</h4>
        <p className="mb-4">
          We&apos;ve sent a verification link to <strong>{getValues("email")}</strong>.
          Click the link in the email to activate your account.
        </p>
        <button className="btn btn-primary w-full" onClick={() => setIsVerificationSent(false)}>
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
              <Checkbox className='custom-checkbox' {...register("rememberMe")} />
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

export default SignUpCoverForm;
