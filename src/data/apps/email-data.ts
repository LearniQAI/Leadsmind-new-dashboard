import avatar1 from "../../../public/assets/images/avatar/avatar.png";
import avatar2 from "../../../public/assets/images/avatar/avatar1.png";
import avatar3 from "../../../public/assets/images/avatar/avatar2.png";
import avatar4 from "../../../public/assets/images/avatar/avatar3.png";
import avatar5 from "../../../public/assets/images/avatar/avatar4.png";
import avatar6 from "../../../public/assets/images/avatar/avatar5.png";
import avatar7 from "../../../public/assets/images/avatar/avatar6.png";
import {  IEmail, IEmailTabs } from "@/interface";


 export const primaryEmailTabs: IEmailTabs[] = [
    { label: 'NEW MAIL', icon: 'icofont-envelope', count: null },
    { label: 'INBOX', icon: 'fa-light fa-inbox', count: 55 },
    { label: 'ALL MAIL', icon: 'fa-regular fa-folder', count: null },
    { label: 'SENT', icon: 'fa-solid fa-paper-plane-top', count: 35 },
    { label: 'DRAFT', icon: 'fa-sharp fa-regular fa-file', count: 15 },
    { label: 'TRASH', icon: 'fa-light fa-trash-can', count: 35 },
    { label: 'IMPORTANT', icon: 'fa-regular fa-bookmark', count: null },
    { label: 'STARRTED', icon: 'fa-regular fa-star', count: null },
  ];

  export const secondaryEmailTabs: IEmailTabs[] = [
    { label: 'UNREAD', icon: 'fa-regular fa-envelope', count: 10 },
    { label: 'SPAM', icon: 'fa-light fa-circle-exclamation', count: 7 },
    { label: 'UPDATE', icon: 'fa-regular fa-download', count: null },
    { label: 'NOTES', icon: 'fa-light fa-notebook', count: 10 },
  ];

  export const emailData:IEmail[] = [
    { avatar: avatar2, name: "Madison Turner", description: "Unlock the Power of Your Data with Our Dynamic Dashboard Template", time: "04:08 PM", star: true },
    { avatar: avatar3, name: "Mason Rodriguez", description: "Visual Analytics Suite Transforming Raw Data into Actionable Insights", time: "03:54 PM", star: false },
    { avatar: avatar4, name: "Lily Campbell", description: "Executive Command Center Elevate Decision-Making with our Intuitive Dashboard Template", time: "10:15 PM", star: true },
    { avatar: avatar5, name: "Carter White", description: "Metrics Mastery Dashboard Harness Key Performance Indicators for Strategic Advantage", time: "07:59 PM", star: false },
    { avatar: avatar6, name: "Olivia Bennett", description: "Real-Time Performance Tracker Stay Ahead with Instantaneous Data Monitoring and Analysis", time: "09:46 PM", star: true },
    { avatar: avatar6, name: "Aiden Carter", description: "Strategic Analytics Dashboard Drive Growth and Efficiency through Data-Driven Decision Making", time: "07:09 PM", star: true },
    { avatar: avatar7, name: "Sophia Miller", description: "All the Lorem Ipsum generators on the Internet tend to repeat predefined chunks as necessary.", time: "02:36 PM", star: false },
    { avatar: avatar7, name: "Lucas Anderson", description: "Business Intelligence Hub Empowering Your Organization with Intelligent Insights", time: "08:15 AM", star: false },
    { avatar: avatar6, name: "Ava Brooks", description: "Navigate Through Your Data Landscape Seamlessly", time: "09:19 PM", star: true },
    { avatar: avatar1, name: "Logan Foster", description: "Interactive Metrics Dashboard Engage with Your Key Metrics in an Interactive Environment", time: "05:43 PM", star: true },
    { avatar: avatar6, name: "Chloe King", description: "Insightful Metrics Dashboard Enhance Business Performance through Comprehensive Data Metrics", time: "01:55 PM", star: true },
    { avatar: avatar3, name: "Jackson Perry", description: "Transforming Complex Data into Clear, Visual Narratives", time: "00:15 PM", star: false },
    { avatar: avatar4, name: "Emma Phillips", description: "Performance Analytics Hub Drive Growth through Comprehensive Performance Metrics", time: "11:53 PM", star: true },
];