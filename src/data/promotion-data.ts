import { IPromotion } from "@/interface/table.interface";

// all img data
import img1 from "../../public/assets/images/avatar/avatar5.png";
import img2 from "../../public/assets/images/avatar/avatar9.png";
import img3 from "../../public/assets/images/avatar/avatar1.png";
import img4 from "../../public/assets/images/avatar/avatar15.png";
import img5 from "../../public/assets/images/avatar/avatar.png";

export const promotionData: IPromotion[] = [
  {
    promotedEmployee: "Emily Davis",
    designation: "Junior Accountant",
    promotionTitle: "Senior Accountant",
    promotionDate: "May 18, 2024",
    description: "Consistent Accuracy",
    employeeImg: img1,
  },
  {
    promotedEmployee: "Ethan Mitchell",
    designation: "Senior Developer",
    promotionTitle: "Lead Developer",
    promotionDate: "Jan 15, 2024",
    description: "Outstanding Performance",
    employeeImg: img2,
  },
  {
    promotedEmployee: "Jane Smith",
    designation: "Marketing Specialist",
    promotionTitle: "Marketing Manager",
    promotionDate: "Feb 20, 2024",
    description: "Leadership Skills",
    employeeImg: img3,
  },
  {
    promotedEmployee: "Michael Johnson",
    designation: "Sales Associate",
    promotionTitle: "Sales Team Leader",
    promotionDate: "Mar 10, 2024",
    description: "Exceeded Sales Targets",
    employeeImg: img4,
  },
  {
    promotedEmployee: "Robert Wilson",
    designation: "HR Coordinator",
    promotionTitle: "HR Manager",
    promotionDate: "Apr 5, 2024",
    description: "Excellent Team Management",
    employeeImg: img5,
  },
];
