import BlogLeaveForm from '@/form/blog-leave-form';
import React from 'react';

const BlogLeave = () => {
    return (
        <>
            <div className="card__wrapper no-height">
                <div className="post-comment-form">
                    <div className="post-comments-title">
                        <h4 className="mb-[15px]">Leave a Comment</h4>
                        <span className="block mb-[25px]">Your email address will not be published. Required
                            fields are marked *</span>
                    </div>
                   <BlogLeaveForm/>
                </div>
            </div>
        </>
    );
};

export default BlogLeave;