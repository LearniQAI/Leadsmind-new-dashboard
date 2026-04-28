"use client"
import Breadcrumb from '@/common/Breadcrumb/breadcrumb';
import { blogData } from '@/data/blog-data';
import ArrowSvg from '@/svg/ArrowSvg';
import { IBlog } from '@/interface';
import Image from 'next/image';
import Link from 'next/link';
import React, { useState } from 'react';

const BlogMainArea = () => {
    // Set initial state to show 8 items
    const [visibleBlogs, setVisibleBlogs] = useState(8);

    // Function to load all blog data
    const loadMore = () => {
        setVisibleBlogs(blogData.length);
    };
    return (
        <>
            {/* -- App side area start -- */}
            <div className="app__slide-wrapper">
                <Breadcrumb breadTitle='Blog' subTitle='Home' />
                {/* blog item*/}
                <div className="grid grid-cols-12 gap-y-5 gap-x-6 maxXs:gap-x-0">
                    {
                        blogData.slice(0, visibleBlogs).map((item: IBlog) => (
                            <div key={item.id} className="col-span-12 md:col-span-6 lg:col-span-4 xxl:col-span-3">
                                <article className="bd-blog-wrapper">
                                    <div className="bd-blog-thumb">
                                        <Link href={`/pages/blog/blog-details/${item.id}`}>
                                            <Image src={item.image} priority style={{ width: "100%", height: "auto" }} alt="image" />
                                        </Link>
                                    </div>
                                    <div className="bd-blog-content">
                                        <div className="bd-blog-meta-list">
                                            <div className="bd-blog-meta-item has-seperator">
                                                <span className="meta-icon">
                                                    <i className="fa-solid fa-user"></i>
                                                </span>
                                                <span className="meta-text"><Link className="meta-author" href={`/pages/blog/blog-details/${item.id}`}>{item.authorName}</Link></span>
                                            </div>
                                            <div className="bd-blog-meta-item">
                                                <span className="meta-icon">
                                                    <i className="fa-sharp fa-light fa-calendar"></i>
                                                </span>
                                                <span className="meta-text"><Link href={`/pages/blog/blog-details/${item.id}`}>{item.date}</Link></span>
                                            </div>
                                        </div>
                                        <h4 className="bd-blog-title"><Link href={`/pages/blog/blog-details/${item.id}`}>{item.blogTitle}</Link></h4>
                                        <p>{item.description}</p>
                                        <div className="btn-text-icon relative">
                                            <Link href={`/pages/blog/blog-details/${item.id}`}>
                                                <span>Read More</span>
                                                <i><ArrowSvg /></i>
                                            </Link>
                                        </div>
                                    </div>
                                </article>
                            </div>
                        ))
                    }
                </div>
                 <div className="text-center flex justify-center mt-[40px] mb-[20px]">
                    {/* Conditionally render button */}
                    {visibleBlogs < blogData.length && (
                        <button type="button" className="btn btn-primary" onClick={loadMore}>Load More</button>
                    )}
                </div>
            </div>
            {/* -- App side area end -- */}
        </>
    );
};

export default BlogMainArea;