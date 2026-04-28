import avatarImg1 from "../../public/assets/images/avatar/avatar1.png";
import avatarImg2 from "../../public/assets/images/avatar/avatar2.png";
import avatarImg3 from "../../public/assets/images/avatar/avatar3.png";
import avatarImg4 from "../../public/assets/images/avatar/avatar4.png";
import avatarImg5 from "../../public/assets/images/avatar/avatar5.png";
import avatarImg6 from "../../public/assets/images/avatar/avatar6.png";
import avatarImg7 from "../../public/assets/images/avatar/avatar7.png";
import avatarImg8 from "../../public/assets/images/avatar/avatar8.png";
import avatarImg9 from "../../public/assets/images/avatar/avatar9.png";
import avatarImg10 from "../../public/assets/images/avatar/avatar10.png";
import avatarImg11 from "../../public/assets/images/avatar/avatar11.png";
import avatarImg12 from "../../public/assets/images/avatar/avatar12.png";
import avatarImg13 from "../../public/assets/images/avatar/avatar13.png";
import avatarImg14 from "../../public/assets/images/avatar/avatar14.png";
import avatarImg15 from "../../public/assets/images/avatar/avatar15.png";
import avatarImg16 from "../../public/assets/images/avatar/avatar16.png";
import avatarImg17 from "../../public/assets/images/avatar/avatar.png";
import { IProject } from "@/interface";


const projectData: IProject[] = [
    {
        id: 1,
        title: "Laravel Education App Development",
        status: "On Going",
        statusClass: "text-success",
        openTask: 5,
        completeTask: 10,
        description: "Laravel is a popular PHP framework known for its elegant syntax, powerful tools, and developer-friendly environment.",
        startDate: "05 January 2024",
        endDate: "14 April 2024",
        projectProgress:60,
        member: 20,
        coordinatorAvatar: avatarImg1,
        teamLeaderAvatar: avatarImg1,
        teamsAvatar: [
            { id: 1, avatar: avatarImg1 },
            { id: 2, avatar: avatarImg2 },
            { id: 3, avatar: avatarImg3 },
            { id: 4, avatar: avatarImg4 },
        ],
    },
    {
        id: 2,
        title: "React Native Mobile App Development",
        status: "On Going",
        statusClass: "text-success",
        openTask: 8,
        completeTask: 12,
        description: "Developing a cross-platform mobile application using React Native for a seamless user experience on both iOS and Android.",
        startDate: "15 February 2024",
        endDate: "30 June 2024",
        projectProgress:45,
        member: 15,
        coordinatorAvatar: avatarImg5,
        teamLeaderAvatar: avatarImg6,
        teamsAvatar: [
            { id: 1, avatar: avatarImg7 },
            { id: 2, avatar: avatarImg8 },
            { id: 3, avatar: avatarImg9 },
            { id: 4, avatar: avatarImg10 },
        ],
    },
    {
        id: 3,
        title: "E-commerce Website Redesign",
        status: "Behind Schedule",
        statusClass: "text-danger",
        openTask: 3,
        completeTask: 7,
        description: "Revamping the user interface and user experience of a leading e-commerce website to improve customer satisfaction and increase sales.",
        startDate: "10 March 2024",
        endDate: "25 June 2024",
        projectProgress:30,
        member: 10,
        coordinatorAvatar: avatarImg11,
        teamLeaderAvatar: avatarImg12,
        teamsAvatar: [
            { id: 1, avatar: avatarImg13 },
            { id: 2, avatar: avatarImg14 },
            { id: 3, avatar: avatarImg15 },
            { id: 4, avatar: avatarImg16 },
        ],
    },
    {
        id: 4,
        title: "AI-Powered Chatbot Development",
        status: "At Risk",
        statusClass: "text-warning",
        openTask: 6,
        completeTask: 8,
        description: "Building an AI-powered chatbot to enhance customer support capabilities and provide 24/7 assistance to users.",
        startDate: "20 January 2024",
        endDate: "15 May 2024",
        projectProgress:55,
        member: 8,
        coordinatorAvatar: avatarImg10,
        teamLeaderAvatar: avatarImg9,
        teamsAvatar: [
            { id: 1, avatar: avatarImg8 },
            { id: 2, avatar: avatarImg7 },
            { id: 3, avatar: avatarImg6 },
            { id: 4, avatar: avatarImg5 },
        ],
    },
    {
        id: 5,
        title: "Cloud Migration Initiative",
        status: "On Going",
        statusClass: "text-success",
        openTask: 4,
        completeTask: 11,
        description: "Migrating the company's IT infrastructure and applications to the cloud to improve scalability, security, and performance.",
        startDate: "01 February 2024",
        endDate: "30 July 2024",
        projectProgress:70,
        member: 15,
        coordinatorAvatar: avatarImg16,
        teamLeaderAvatar: avatarImg15,
        teamsAvatar: [
            { id: 1, avatar: avatarImg14 },
            { id: 2, avatar: avatarImg13 },
            { id: 3, avatar: avatarImg12 },
            { id: 4, avatar: avatarImg11 },
        ],
    },
    {
        id: 6,
        title: "Blockchain Integration Project",
        status: "Delayed",
        statusClass: "text-warning",
        openTask: 7,
        completeTask: 9,
        description: "Revamping the user interface and user experience of a leading e-commerce website to improve customer satisfaction and increase sales.",
        startDate: "10 January 2024",
        endDate: "15 May 2024",
        projectProgress:50,
        member: 10,
        coordinatorAvatar: avatarImg17,
        teamLeaderAvatar: avatarImg1,
        teamsAvatar: [
            { id: 1, avatar: avatarImg3 },
            { id: 2, avatar: avatarImg4 },
            { id: 3, avatar: avatarImg5 },
            { id: 4, avatar: avatarImg6 },
        ],
    },
    
];

export default projectData;
