import Breadcrumb from "@/common/Breadcrumb/breadcrumb";

import { idType } from "@/interface/common.interface";
import Image from "next/image";
import Link from "next/link";
import React from "react";
import avatarImg from "../../../../../../public/assets/images/avatar/avatar.png";
import PostComment from "./PostComment";
import BlogLeave from "./BlogLeave";
import SidebarRecentPost from "./SidebarRecentPost";
import SidebarCategories from "./SidebarCategories";
import SidebarTags from "./SidebarTags";
import SidebarContact from "./SidebarContact";
import { blogData } from "@/data/blog-data";

const BlogDetailsMainArea = ({ id }: idType) => {
  const blog: any = blogData.find((item) => item.id == id);
  return <>
    {/* -- App side area start -- */}
    <div className="app__slide-wrapper">
      <Breadcrumb breadTitle="Blog Details" subTitle="Home" />

      <div className="grid grid-cols-12 gap-x-6 maxXs:gap-x-0">
        <div className="col-span-12 xl:col-span-8">
          <div className="card__wrapper no-height">
            <div className="post-details-wrapper">
              <div className="post-details-content">
                <div className="post-details-top-content mb-[30px]">
                  <h3 className="post-details-title mb-[15px]">Revolutionizing HRM and CRM: {blog?.blogTitle}</h3>
                  <div className="post-details-meta">
                    <ul>
                      <li><Link href="#" className="flex items-center"><Image src={avatarImg} priority alt="author" /><span className="me-1">By</span> Ellena M.Rice</Link></li>
                      <li><Link href="#"><i className="icon-calendar-check"></i> Jul 11, 2024</Link></li>
                      <li><Link href="#"><i className="icon-comment"></i> 02 Comments</Link></li>
                    </ul>
                  </div>
                </div>
                <div className="post-details-thumb mb-[30px]">
                  <Link href="#"><Image src={blog?.image} style={{ width: "100%", height: "auto" }} priority alt="image" /></Link>
                </div>
                <p className="mb-15">Effective Human Resource Management (HRM) and Customer Relationship
                  Management (CRM) are pivotal in driving organizational success. Our strategies
                  focus on optimizing employee performance and enhancing customer satisfaction. By
                  leveraging advanced analytics and personalized approaches, we ensure that both
                  your workforce and customer base are engaged and valued. Our team is committed
                  to providing the best practices in HRM and CRM to help your business thrive in a
                  competitive market.</p>
                <p className="mb-[20px]">In {`today's`} dynamic business environment, having a robust HRM system
                  in place is crucial. It not only manages employee data but also fosters a
                  culture of continuous improvement and engagement. Similarly, a well-implemented
                  CRM system helps in understanding customer needs and building long-lasting
                  relationships. These systems work hand-in-hand to create a cohesive strategy
                  that aligns with your business goals.</p>
                <div className="post-details-blockquote mb-[30px]">
                  <blockquote>
                    <h4 className="blockquote-title">The purpose of effective HRM and CRM systems is
                      to foster and encourage strong workforce and customer relationships.
                    </h4>
                    <p className="flex justify-end"><span>John Doe, HR & CRM Expert</span>
                    </p>
                  </blockquote>
                </div>
                <div className="post-details-list-wrap">
                  <h4 className="mb-2.5">HRM and CRM Strategies</h4>
                  <p className="mb-[20px]">Implementing successful HRM and CRM strategies involves a deep
                    understanding of both employee and customer dynamics. Our approach includes
                    detailed analysis and tailored solutions that address specific needs. We
                    provide training, support, and tools necessary to manage and nurture these
                    relationships effectively.</p>
                  <div className="post-details-list mb-[20px]">
                    <ul>
                      <li>
                        <span className="list-icon">
                          <i className="fa-solid fa-check"></i>
                        </span>
                        Expertise in Workforce Management
                      </li>
                      <li>
                        <span className="list-icon">
                          <i className="fa-solid fa-check"></i>
                        </span>
                        Excellence in Customer Relations
                      </li>
                      <li>
                        <span className="list-icon">
                          <i className="fa-solid fa-check"></i>
                        </span>
                        Innovative CRM Solutions
                      </li>
                    </ul>
                  </div>
                  <p>We are a team of dedicated HRM and CRM professionals, united by our
                    commitment to excellence in managing and nurturing both employees and
                    customers. With years of collective experience across diverse industries, we
                    provide top-notch solutions for effective workforce and customer
                    relationship management. Our goal is to empower your business with the tools
                    and strategies needed to succeed in an ever-evolving market.</p>
                </div>
              </div>
            </div>
          </div>
          {/* blog post */}
          <PostComment />
          {/* blog leave form */}
          <BlogLeave />
        </div>
        <div className="col-span-12 lg:col-span-5 xl:col-span-4">
          <div className="position-sticky">
            <div className="card__wrapper no-height">
              <aside className="sidebar-wrapper">
                <div className="sidebar-widget-wrapper mb-[30px]">
                  <SidebarRecentPost />
                  <div className="sidebar-widget-divider"></div>
                  <SidebarCategories />
                  <div className="sidebar-widget-divider"></div>
                  <SidebarTags />
                </div>
                <SidebarContact />
              </aside>

            </div>
          </div>
        </div>
      </div>
    </div>
    {/* -- App side area end -- */}
  </>;
};

export default BlogDetailsMainArea;
