import { StaticImageData } from "next/image";

//Define an interface for the blog
export interface IBlog  {
    id: number;
    image: StaticImageData;
    blogTitle: string;
    authorName: string;
    date: string;
    description: string;
}

// Define an interface for the blog create form
export interface IBlogCreateForm {
    blogName2: string;
    purchaseDate: string;
    blogStatus: string;
    blogDescription: string;
}

//Define an interface for the blog leave form
export type IBlogLeaveFormData = {
    name: string;
    email: string;
    message: string;
  };

