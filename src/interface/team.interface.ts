import { StaticImageData } from "next/image";

// Define an interface for team
export interface SocialLinks {
    facebook: string;
    twitter: string;
    instagram?: string;
    linkedin: string;
    youtube?: string; 
    website?: string; 
}
export interface ContactDetails {
    phone: string;
    profileLink: string;
}
export interface ITeam {
    id: number;
    image: StaticImageData; 
    title: string;
    designation: string;
    profileLink: string;
    socialLinks: SocialLinks;
    contact: ContactDetails;
}

// Define an interface for team members in team style two, three, and four
export interface TeamStyleTwoThreeFourMember {
    id: number;
    title: string;
    designation: string;
    profileLink: string;
    image: StaticImageData; 
    socialLinks: SocialLinks;
}

//Define the type for a team project data type
export interface TeamMember  {
    id: number;
    avatar: StaticImageData;
  };
  
  export interface IProject {
    id: number;
    title: string;
    status: string;
    statusClass: string;
    openTask: number;
    completeTask: number;
    description: string;
    startDate: string;
    endDate: string;
    projectProgress: number;
    member?: number;
    coordinatorAvatar: StaticImageData;
    teamLeaderAvatar: StaticImageData;
    teamsAvatar: TeamMember[];
  };