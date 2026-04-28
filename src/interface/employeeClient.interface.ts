import { StaticImageData } from "next/image";

//Define an interface for the employee data
interface SocialLinks {
  facebook: string;
  twitter: string;
  linkedin: string;
  youtube: string;
  website: string;
}
export interface IEmployee {
  id: number;
  image: StaticImageData;
  name: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  userName?: string;
  employeeID?: string;
  joiningDate?: string;
  accountNumber?: string;
  address?: string;
  bankName?: string;
  accountHolderName?: string;
  branchName?: string;
  position: string;
  phone: string;
  socialLinks: SocialLinks;
}

export interface IEmployeeProfileDetails {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  employeeId: string;
  joiningDate: string;
  contactNumber: string;
  email: string;
  address: string;
  department: string;
  employeeDesignation: string;
}

//Define an interface for the client data
interface ClientSocialLinks {
  facebook: string;
  twitter: string;
  linkedin: string;
  youtube: string;
  website: string;
}
export interface IClient {
  id: number;
  image: StaticImageData;
  name: string;
  position: string;
  phone: string;
  socialLinks: ClientSocialLinks;
  company: string;
  address?: string;
  clientId?: string;
  userName?: string;
  email?: string;
  contactNumber?: string;
  lastName?: string;
  firstName?: string;
}

export interface IEmergenryContact {
  fullName: string;
  relationship: string;
  phoneNumber: string;
  phoneNumber2: string;
  emailAddress: string;
  address: string;
  secondaryFullName: string;
  secondaryRelationship: string;
  secondaryPhoneNumber: string;
  secondaryPhoneNumber2: string;
  secondaryEmailAddress: string;
  secondaryAddress: string;
}

export interface IEducationQualification {
  higherDegreeInstitutionName: string;
  higherDegree: string;
  higherDegreeStartingDate: string;
  higherDegreeCompleteDate: string;
  bachelorDegreeInstitutionName: string;
  bachelorDegree: string;
  bachelorDegreeStartingDate: string;
  bachelorDegreeCompleteDate: string;
  secondaryDegreeInstitutionName: string;
  secondaryDegree: string;
  secondaryDegreeStartingDate: string;
  secondaryDegreeCompleteDate: string;
}

// Company Information 1 for c1, Company Information 2 for c2, Company Information 3 for c3

export interface IWorkExperience {
  c1companyName: string;
  c1position: string;
  c1periodFrom: string;
  c1periodTo: string;
  c2companyName: string;
  c2position: string;
  c2periodFrom: string;
  c2periodTo: string;
  c3companyName: string;
  c3position: string;
  c3periodFrom: string;
  c3periodTo: string;
}

export interface IBankAccount {
  accountHolderName: string;
  accountNumber: string;
  bankName: string;
  branchName: string;
  swiftCode: string;
}

export interface IPassport {
  passportNumber: string;
  issueDate: string;
  expiryDate: string;
  country:string;
}

export interface ISocialMediaLinks {
  linkedin: string;
  x: string;
  facebook: string;
  instagram: string;
  whatsapp: string;
}
