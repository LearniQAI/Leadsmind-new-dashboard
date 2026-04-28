"use client"
import ErrorMessage from '@/components/error-message/ErrorMessage';
import { IForgotForm } from '@/interface';
import Link from 'next/link';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { forgotPassword } from '@/app/actions/auth';

const ForgotBasicForm = () => {
    const [isLoading, setIsLoading] = useState(false);
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<IForgotForm>();

    const onSubmit = async (data: IForgotForm) => {
        setIsLoading(true);
        try {
            const result = await forgotPassword(data.email);
            if (result.success) {
                toast.success("Reset link sent successfully. Please check your email.");
            } else {
                toast.error(result.error || "Something went wrong!");
            }
        } catch (error: unknown) {
            toast.error("Something went wrong!");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <form onSubmit={handleSubmit(onSubmit)}>
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
                            {...register("email", {
                                required: "Email is required",
                                pattern: {
                                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                                    message: "Invalid email address",
                                },
                            })}
                        />
                        <ErrorMessage error={errors.email} /> 
                    </div>
                </div>
                <div className="mb-4">
                    <button className="btn btn-primary w-full" type="submit" disabled={isLoading}>
                        {isLoading ? "Sending..." : "Send Reset Link"}
                    </button>
                </div>
                <div className="text-center">
                    <Link className="back-to-btn" href="/auth/signin-basic">Back to login</Link>
                </div>
            </form>
        </>
    );
};

export default ForgotBasicForm;
