import { StaticImageData } from "next/image";

// Define an interface for the header email notification
export interface IEmailNotification {
    avatar: StaticImageData;
    profileLink: string;
    messageLink: string;
    message: string;
    time: string;
    status: "HRM" | "CRM";
};
// Define an interface for the header notification
export interface INotification {
    id: number;
    category: string;
    message: string;
    image: StaticImageData;
    time: string;
};
// Define an interface for the email
export interface IEmail {
    avatar: StaticImageData;
    name: string;
    time: string;
    description: string;
    star: boolean;
};

//Define an interface for the E-mail tabs
export interface IEmailTabs {
    label: string;
    icon: string;
    count: number | null;
}