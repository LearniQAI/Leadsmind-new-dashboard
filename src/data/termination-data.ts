import { ITermination } from "@/interface/table.interface";

import img1 from "../../public/assets/images/avatar/avatar5.png";
import img2 from "../../public/assets/images/avatar/avatar9.png";
import img3 from "../../public/assets/images/avatar/avatar1.png";
import img4 from "../../public/assets/images/avatar/avatar15.png";
import img5 from "../../public/assets/images/avatar/avatar.png";

export const terminationData: ITermination[] = [
  {
    employee: "Emily Davis",
    terminationType: "Layoff",
    noticeDate: "Apr 01, 2024",
    terminationDate: "Apr 15, 2024",
    description: "Position eliminated due to company downsizing.",
    employeeImg: img1,
  },
  {
    employee: "Ethan Mitchell",
    terminationType: "Voluntary",
    noticeDate: "Jan 05, 2024",
    terminationDate: "Jan 20, 2024",
    description: "Employee resigned to pursue further studies.",
    employeeImg: img2,
  },
  {
    employee: "Jane Smith",
    terminationType: "Involuntary",
    noticeDate: "Feb 10, 2024",
    terminationDate: "Feb 25, 2024",
    description: "Employee terminated due to policy violations.",
    employeeImg: img3,
  },
  {
    employee: "Michael Johnson",
    terminationType: "Mutual Agreement",
    noticeDate: "May 10, 2024",
    terminationDate: "May 25, 2024",
    description: "Termination agreed upon by both parties.",
    employeeImg: img4,
  },
  {
    employee: "Robert Wilson",
    terminationType: "Retirement",
    noticeDate: "Mar 15, 2024",
    terminationDate: "Mar 31, 2024",
    description: "Employee retired after 30 years of service.",
    employeeImg: img5,
  },
];
