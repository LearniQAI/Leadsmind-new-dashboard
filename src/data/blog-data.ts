
import { IBlog } from "@/interface";
import blogImg1 from "../../public/assets/images/blog/blog-image-1.png";
import blogImg2 from "../../public/assets/images/blog/blog-image-2.png";
import blogImg3 from "../../public/assets/images/blog/blog-image-3.png";
import blogImg4 from "../../public/assets/images/blog/blog-image-4.png";
import blogImg5 from "../../public/assets/images/blog/blog-image-5.png";
import blogImg6 from "../../public/assets/images/blog/blog-image-6.png";
import blogImg7 from "../../public/assets/images/blog/blog-image-7.png";
import blogImg8 from "../../public/assets/images/blog/blog-image-8.png";
//blog comment image
import avatarImg from "../../public/assets/images/avatar/avatar.png";
import avatarImg1 from "../../public/assets/images/avatar/avatar1.png";
import avatarImg2 from "../../public/assets/images/avatar/avatar2.png";
import avatarImg3 from "../../public/assets/images/avatar/avatar3.png";

export const blogData: IBlog[] = [
    {
        id: 1,
        image: blogImg1,
        blogTitle: "Navigating Modern Workforce Dynamics",
        authorName: "John Doe",
        date: "July 11, 2024",
        description: "Dive into the complexities of HRM with HR Insights, where each topicc"
    },
    {
        id: 2,
        image: blogImg2,
        blogTitle: "Strategies for a Motivated Workforce",
        authorName: "Jane Smith",
        date: "July 11, 2024",
        description: "Explore the best practices in HRM with HR Masters, where each strategy"
    },
    {
        id: 3,
        image: blogImg3,
        blogTitle: "The Future of Workforce Management",
        authorName: "Robert Brown",
        date: "July 11, 2024",
        description: "Unveil the latest in HRM technology with HR Tech Trends, where each innovation"
    },
    {
        id: 4,
        image: blogImg4,
        blogTitle: "Developing Tomorrow's Leaders Today",
        authorName: "Emily Johnson",
        date: "July 11, 2024",
        description: "Delve into leadership practices in HRM with Leadership Edge, where each principle"
    },
    {
        id: 5,
        image: blogImg5,
        blogTitle: "Enhancing CRM Efficiency: Top Strategies for Success",
        authorName: "Alex Johnson",
        date: "July 11, 2024",
        description: "Explore how efficient CRM systems can transform customer relationships and drive business marketing growth."
    },
    {
        id: 6,
        image: blogImg6,
        blogTitle: "What'sShaping the Future of Customer Management",
        authorName: "Alex Johnson",
        date: "July 11, 2024",
        description: "Stay ahead with the latest CRM trends that are set to revolutionize how businesses engage with customers."
    },
    {
        id: 7,
        image: blogImg7,
        blogTitle: "Maximizing ROI with CRM: Tips for Businesses",
        authorName: "Emily Johnson",
        date: "July 11, 2024",
        description: "Learn how to optimize CRM strategies to increase return on investment and enhance customer satisfaction."
    },
    {
        id: 8,
        image: blogImg8,
        blogTitle: "The Role of AI in Modern CRM Systems",
        authorName: " Robert Brown",
        date: "July 11, 2024",
        description: "Discover how AI is transforming CRM systems, enhancing automation, and improving customer insights."
    },
    {
        id: 9,
        image: blogImg1,
        blogTitle: "Navigating Modern Workforce Dynamics",
        authorName: "John Doe",
        date: "July 11, 2024",
        description: "Dive into the complexities of HRM with HR Insights, where each topicc"
    },
    {
        id: 10,
        image: blogImg2,
        blogTitle: "Strategies for a Motivated Workforce",
        authorName: "Jane Smith",
        date: "July 11, 2024",
        description: "Explore the best practices in HRM with HR Masters, where each strategy"
    },
    {
        id: 11,
        image: blogImg3,
        blogTitle: "The Future of Workforce Management",
        authorName: "Robert Brown",
        date: "July 11, 2024",
        description: "Unveil the latest in HRM technology with HR Tech Trends, where each innovation"
    },
    {
        id: 12,
        image: blogImg4,
        blogTitle: "Developing Tomorrow's Leaders Today",
        authorName: "Emily Johnson",
        date: "July 11, 2024",
        description: "Delve into leadership practices in HRM with Leadership Edge, where each principle"
    },

]


//blog comment data
export const blogComments = [
    {
        id: 1,
        avatar: avatarImg1,
        author: "Madison Turner",
        date: "Jul 11, 2024",
        rating: 5,
        description: "Implementing effective HRM strategies has significantly improved our employee engagement and productivity. The use of CRM tools has also enhanced our customer interactions, leading to higher satisfaction and retention rates. The integration of these systems has streamlined our operations and provided valuable insights into both employee and customer needs.",
        replies: [
            {
                id: 1,
                avatar: avatarImg,
                author: "Ellena M.Rice",
                date: "Jul 11, 2024",
                rating: 5,
                description: "I completely agree, Madison. The use of HRM and CRM systems has been transformative for our organization as well. The ability to track employee performance and customer feedback in real-time has provided us with the data needed to make informed decisions and improve our processes continuously."
            }
        ]
    },
    {
        id: 2,
        avatar: avatarImg3,
        author: "Mason Rodriguez",
        date: "Jul 11, 2024",
        rating: 5,
        description: "The integration of CRM systems has revolutionized our approach to customer service. We can now anticipate customer needs and tailor our services to meet those needs proactively. This has led to an increase in customer loyalty and positive feedback. Additionally, our HRM system has helped in efficiently managing our growing workforce and enhancing their overall satisfaction."
    },
    {
        id: 3,
        avatar: avatarImg2,
        author: "Ethan Mitchell",
        date: "Jul 11, 2024",
        rating: 5,
        description: "Our recent shift to a comprehensive HRM system has streamlined our processes significantly. Employee onboarding, performance tracking, and development programs are now more efficient and effective. The CRM system complements this by providing deeper insights into customer behavior, allowing us to offer more personalized experiences. Both systems have been crucial in driving our organizational growth."
    }
];