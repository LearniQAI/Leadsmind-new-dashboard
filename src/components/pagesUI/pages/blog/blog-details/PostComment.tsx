
import Image from 'next/image';
import Link from 'next/link';
import React from 'react';
import { blogComments } from '@/data/blog-data';

const PostComment = () => {

    return (
        <>
            <div className="card__wrapper no-height">
                <div className="post-comment-wrapper">
                    <div className="comment-section">
                        {blogComments.map((comment) => (
                            <div className="post-comment" key={comment.id}>
                                <div className="media">
                                    <div className="thumbnail">
                                        <Link href="#">
                                            <Image src={comment.avatar} style={{width:"100%", height:"auto"}} priority alt="Author Images" />
                                        </Link>
                                    </div>
                                    <div className="media-body">
                                        <div className="author-info">
                                            <h5 className="title">
                                                <Link href="#">{comment.author}</Link>
                                            </h5>
                                            <ul className="bd-meta">
                                                <li className="has-separator">On: <span>{comment.date}</span></li>
                                                <li>
                                                    <div className="rating">
                                                        {[...Array(comment.rating)].map((_, i) => (
                                                            <Link href="#" key={i}><i className="fa fa-star"></i></Link>
                                                        ))}
                                                    </div>
                                                </li>
                                            </ul>
                                        </div>
                                        <div className="content">
                                            <p className="description">{comment.description}</p>
                                        </div>
                                        <div className="flex reply-button">
                                            <Link href="#"><i className="fa-sharp fa-regular fa-thumbs-up"></i><span>Helpful</span></Link>
                                            <Link href="#"><i className="fa-sharp fa-regular fa-flag-swallowtail"></i><span>Favorite</span></Link>
                                            <Link href="#"><i className="fa-sharp fa-regular fa-reply"></i><span>Reply</span></Link>
                                        </div>
                                        {comment.replies && comment.replies.length > 0 && (
                                            <div className="reply-comment post-comment">
                                                {comment.replies.map((reply) => (
                                                    <div className="media" key={reply.id}>
                                                        <div className="thumbnail">
                                                            <Link href="#">
                                                                <Image src={reply.avatar} style={{width:"100%", height:"auto"}} priority alt="Author Images" />
                                                            </Link>
                                                        </div>
                                                        <div className="media-body">
                                                            <div className="author-info">
                                                                <h5 className="title">
                                                                    <Link href="#">{reply.author}</Link>
                                                                </h5>
                                                                <ul className="bd-meta">
                                                                    <li className="has-separator">On: <span>{reply.date}</span></li>
                                                                    <li>
                                                                        <div className="rating">
                                                                            {[...Array(reply.rating)].map((_, i) => (
                                                                                <Link href="#" key={i}><i className="fa fa-star"></i></Link>
                                                                            ))}
                                                                        </div>
                                                                    </li>
                                                                </ul>
                                                            </div>
                                                            <div className="content">
                                                                <p className="description">{reply.description}</p>
                                                            </div>
                                                            <div className="flex reply-button">
                                                                <Link href="#"><i className="fa-sharp fa-regular fa-thumbs-up"></i><span>Helpful</span></Link>
                                                                <Link href="#"><i className="fa-sharp fa-regular fa-flag-swallowtail"></i><span>Favorite</span></Link>
                                                                <Link href="#"><i className="fa-sharp fa-regular fa-reply"></i><span>Reply</span></Link>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
};

export default PostComment;