"use client"
import ErrorMessage from '@/components/error-message/ErrorMessage';
import { IResetPasswordForm } from '@/interface';
import Link from 'next/link';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

const ResetPasswordCoverForm = () => {
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
    } = useForm<IResetPasswordForm>();

    const onSubmit = async (data: IResetPasswordForm) => {
        try {
            toast.success("Password reset successfully");
        } catch (error: unknown) {
            if (error instanceof Error) {
                toast.error(error.message);
            } else {
                toast.error("Something went wrong!");
            }
        }
    };
    //handle password visible toggle
    const togglePasswordVisibility = () => {
        setIsPasswordVisible(!isPasswordVisible);
    };

    const toggleConfirmPasswordVisibility = () => {
        setIsConfirmPasswordVisible(!isConfirmPasswordVisible);
    };
    return (
        <>
            <form onSubmit={handleSubmit(onSubmit)}>
                <div className="from__input-box">
                    <div className="form__input-title">
                        <label htmlFor="passwordInput">New Password</label>
                    </div>
                    <div className="form__input">
                        <input
                            className="form-control"
                            type={isPasswordVisible ? "text" : "password"}
                            id="passwordInput"
                            {...register("password", {
                                required: "Password is required",
                                minLength: { value: 6, message: "Password must be at least 6 characters" }
                            })}
                        />
                        <ErrorMessage error={errors.password} />
                        <div className="pass-icon" onClick={togglePasswordVisibility}>
                            <i className={`fa-sharp fa-light ${isPasswordVisible ? "fa-eye" : "fa-eye-slash"}`}></i>
                        </div>
                    </div>
                </div>
                <div className="from__input-box">
                    <div className="form__input-title">
                        <label htmlFor="passwordInput2">Confirm Password</label>
                    </div>
                    <div className="form__input">
                        <input
                            className="form-control"
                            type={isConfirmPasswordVisible ? "text" : "password"}
                            {...register("password2", {
                                required: "Please confirm your password",
                                validate: value => value === watch("password") || "Passwords do not match",
                            })}
                        />

                        <ErrorMessage error={errors.password2} />
                        <div className="pass-icon" onClick={toggleConfirmPasswordVisibility}>
                            <i className={`fa-sharp fa-light ${isConfirmPasswordVisible ? "fa-eye" : "fa-eye-slash"}`}></i>
                        </div>
                    </div>
                </div>
                <div className="mb-4">
                    <button className="btn btn-primary w-full" type="submit">Set new password</button>
                </div>
                <div className="text-center">
                    <Link href="/auth/signin-basic">Back to login</Link>
                </div>
            </form>
        </>
    );
};

export default ResetPasswordCoverForm;