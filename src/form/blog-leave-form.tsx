"use client"
import ErrorMessage from '@/components/error-message/ErrorMessage';
import { IBlogLeaveFormData } from '@/interface';
import React from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

const BlogLeaveForm = () => {
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<IBlogLeaveFormData>();

    const onSubmit = async (data:IBlogLeaveFormData) => {
        try {
            toast.success("Form submitted successfully!");
            reset();
        } catch (error) {
            if (error instanceof Error) {
                toast.error(error.message);
            } else {
                toast.error("Something went wrong!");
            }
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid grid-cols-12 gap-y-5 gap-x-0 sm:gap-x-6 maxXs:gap-x-0">
                <div className="col-span-12 xl:col-span-6">
                    <div className="from__input-box">
                        <div className="form__input-title">
                            <label htmlFor="name">Full Name<span>*</span></label>
                        </div>
                        <div className="form__input">
                            <input
                                className="form-control"
                                id="name"
                                type="text"
                                {...register("name", { required: "Full Name is required" })}
                            />
                            <ErrorMessage error={errors.name}/>
                        </div>
                    </div>
                </div>
                <div className="col-span-12 xl:col-span-6">
                    <div className="from__input-box">
                        <div className="form__input-title">
                            <label htmlFor="email">Email<span>*</span></label>
                        </div>
                        <div className="form__input">
                            <input
                                className="form-control"
                                id="email"
                                type="email"
                                {...register("email", {
                                    required: "Email is required",
                                    pattern: {
                                        value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/,
                                        message: "Invalid email address",
                                    },
                                })}
                            />
                            <ErrorMessage error={errors.email}/>
                        </div>
                    </div>
                </div>
                <div className="col-span-12">
                    <div className="from__input-box">
                        <div className="form__input-title">
                            <label>Your Message<span>*</span></label>
                        </div>
                        <div className="form__input">
                            <textarea
                                placeholder="Type Comment here"
                                className="form-control"
                                {...register("message", { required: "Message is required" })}
                            ></textarea>
                            <ErrorMessage error={errors.message}/>
                        </div>
                    </div>
                </div>
                <div className="col-span-12 xl:col-span-6">
                    <div className="submit-btn">
                        <button type="submit" className="btn btn-primary">Post Comment</button>
                    </div>
                </div>
            </div>
        </form>
    );
};

export default BlogLeaveForm;
