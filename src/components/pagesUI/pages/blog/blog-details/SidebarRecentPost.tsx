import { blogData } from '@/data/blog-data';
import Image from 'next/image';
import Link from 'next/link';
import React from 'react';

const SidebarRecentPost = () => {
    return (
        <>
            <div className="sidebar-widget widget">
                <h4 className="sidebar-widget-title mb-[25px]">Recent Post</h4>
                <div className="sidebar-widget-post">
                    {
                        blogData.slice(0, 3).map((item) => (
                            <div className="recent-post" key={item.id}>
                                <div className="recent-post-thumb me-2.5">
                                    <Link href={`/pages/blog/blog-details/${item.id}`}>
                                        <Image src={item?.image} style={{width:"100%", height:"100%"}} priority alt="image" />
                                    </Link>
                                </div>
                                <div className="recent-post-content">
                                    <div className="recent-post-author">
                                        <span className="inline-block mb-[5px]"><Link href="#">{item?.authorName}</Link></span>
                                    </div>
                                    <h6 className="recent-post-title">
                                        <Link href={`/pages/blog/blog-details/${item.id}`}>{item?.blogTitle}</Link>
                                    </h6>
                                    <span className="recent-post-date">
                                        <Link href={`/pages/blog/blog-details/${item.id}`}><span><i
                                            className="icon-calendar-check"></i></span> {item.date}</Link>
                                    </span>
                                </div>
                            </div>
                        ))
                    }
                </div>
            </div>
        </>
    );
};

export default SidebarRecentPost;