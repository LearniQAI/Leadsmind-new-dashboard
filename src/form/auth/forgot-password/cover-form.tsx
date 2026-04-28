"use client"
import ErrorMessage from '@/components/error-message/ErrorMessage';
import { IForgotForm } from '@/interface';
import Link from 'next/link';
import React from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

const ForgotCoverForm = () => {
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<IForgotForm>();

    const onSubmit = async (data: IForgotForm) => {
        try {
            toast.success("Reset link sent successfully");
        } catch (error: unknown) {
            if (error instanceof Error) {
                toast.error(error.message);
            } else {
                toast.error("Something went wrong!");
            }
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
                    <button className="btn btn-primary w-full" type="submit">Send Reset Link</button>
                </div>
                <div className="text-center">
                    <Link className="back-to-btn" href="/auth/signin-cover">Back to login</Link>
                </div>
            </form>
        </>
    );
};

export default ForgotCoverForm;