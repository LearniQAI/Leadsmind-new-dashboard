"use client"
import ErrorMessage from '@/components/error-message/ErrorMessage';
import { ISignUpForm } from '@/interface';
import { Checkbox, FormControlLabel } from '@mui/material';
import Link from 'next/link';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';


const SignUpCoverForm = () => {
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ISignUpForm>();

    const onSubmit = async (data: ISignUpForm) => {
        try {
            toast.success("Sign Up successfully")
        } catch (error: unknown) {
            if (error instanceof Error) {
                toast.error(error.message);
            } else {
                toast.error("Something went wrong!");
            }
        }
    };
    //password visibility handle
    const togglePasswordVisibility = () => {
        setIsPasswordVisible(!isPasswordVisible);
    };
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
                        <Link href="/auth/auth-forgot-password-basic">
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
                    <button className="btn btn-primary w-full" type="submit">Sign Up</button>
                </div>
            </form>
        </>
    );
};

export default SignUpCoverForm;