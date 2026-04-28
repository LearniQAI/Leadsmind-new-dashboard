import { IDeduction } from "@/interface/table.interface";

export const deductionData: IDeduction[] = [
  {
    deduction: "Provident Fund (PF)",
    title: "After retirement",
    type: "Fixed",
    amount: 150.0,
  },
  {
    deduction: "Personal Loan (PL)",
    title: "As per amount",
    type: "Percentage",
    amount: 70.0,
  },
  {
    deduction: "Security Deposit (SD)",
    title: "After leaving this job",
    type: "Fixed",
    amount: 30.0,
  },
  {
    deduction: "Early Leaving (EL)",
    title: "Form early office leaving",
    type: "Percentage",
    amount: 100.0,
  },
];
