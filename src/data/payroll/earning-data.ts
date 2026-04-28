import { IEarning } from "@/interface/table.interface";

export const earningData: IEarning[] = [
  {
    earning: "Basic Salary",
    title: "-",
    type: "-",
    amount: 1150.0,
  },
  {
    earning: "Dearness Allowance (DA)",
    title: "Cost of living allowance",
    type: "Fixed",
    amount: 200.0,
  },
  {
    earning: "Transport Allowance (TA)",
    title: "Travel allowance",
    type: "Fixed",
    amount: 150.0,
  },
  {
    earning: "Mobile Allowance (MA)",
    title: "For client communication",
    type: "As Per Need",
    amount: 70.0,
  },
  {
    earning: "OverTime",
    title: "For extra work",
    type: "Fixed",
    amount: 100.0,
  },
  {
    earning: "Bonus (BNS)",
    title: "Festival",
    type: "Percentage",
    amount: 180.0,
  },
  {
    earning: "Other Payment",
    title: "For extra sell",
    type: "-",
    amount: 0.0,
  },
];
