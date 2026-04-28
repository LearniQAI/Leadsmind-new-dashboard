import { IAward } from "@/interface/table.interface";

// all img data
import img1 from "../../public/assets/images/avatar/avatar5.png";
import img2 from "../../public/assets/images/avatar/avatar9.png";
import img3 from "../../public/assets/images/avatar/avatar1.png";
import img4 from "../../public/assets/images/avatar/avatar15.png";
import img5 from "../../public/assets/images/avatar/avatar.png";

export const awardData: IAward[] = [
  {
    employee: "Emily Davis",
    awardType: "Customer Service Star",
    date: "May 18, 2024",
    gift: "Dinner for Two",
    description: "Customer Service Excellence Award.",
    employeeImg: img1,
  },
  {
    employee: "Ethan Mitchell",
    awardType: "Employee of the Month",
    date: "Jan 15, 2024",
    gift: "$100 Gift Card",
    description: "Outstanding Customer Service Award.",
    employeeImg: img2,
  },
  {
    employee: "Jane Smith",
    awardType: "Best Team Leader",
    date: "Feb 20, 2024",
    gift: "Weekend Getaway",
    description: "Excellence in Leadership and Management.",
    employeeImg: img3,
  },
  {
    employee: "Michael Johnson",
    awardType: "Innovation Award",
    date: "Mar 10, 2024",
    gift: "Tablet",
    description: "Innovation in Process Improvement Award.",
    employeeImg: img4,
  },
  {
    employee: "Robert Wilson",
    awardType: "Sales Excellence",
    date: "Apr 5, 2024",
    gift: "Trophy",
    description: "Top Sales Performance Recognition Award.",
    employeeImg: img5,
  },
];
