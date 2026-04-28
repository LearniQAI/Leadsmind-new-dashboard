import img1 from "../../../public/assets/images/avatar/avatar5.png";
import img2 from "../../../public/assets/images/avatar/avatar9.png";
import img3 from "../../../public/assets/images/avatar/avatar1.png";
import img4 from "../../../public/assets/images/avatar/avatar15.png";
import img5 from "../../../public/assets/images/avatar/avatar.png";
import { IDealStatistic } from "@/interface/table.interface";

export const dealsStatics: IDealStatistic[] = [
  {
    id: 1,
    salesRep: "Parller Hok",
    category: "Development",
    email: "parller.hok@example.com",
    location: "United Kingdom",
    date: "Oct 15 - Dec 20, 2024",
    employeeImg: img1,
  },
  {
    id: 2,
    salesRep: "Anna Smith",
    category: "Marketing",
    email: "anna.smith@example.com",
    location: "United States",
    date: "Sep 01 - Nov 30, 2024",
    employeeImg: img2,
  },
  {
    id: 3,
    salesRep: "Liam Johnson",
    category: "Sales",
    email: "liam.johnson@example.com",
    location: "Canada",
    date: "Aug 10 - Oct 15, 2024",
    employeeImg: img3,
  },
  {
    id: 4,
    salesRep: "Emma Wilson",
    category: "Design",
    email: "emma.wilson@example.com",
    location: "Australia",
    date: "Jul 20 - Sep 25, 2024",
    employeeImg: img4,
  },
  {
    id: 5,
    salesRep: "James Brown",
    category: "Support",
    email: "james.brown@example.com",
    location: "Germany",
    date: "Jun 15 - Aug 30, 2024",
    employeeImg: img5,
  },
];
