import { StaticImageData } from "next/image";

// Define an interface for the office loan
export interface IOfficeLoan {
  bankName: string;
  amount: number;
  reason: string;
  monthYear: string;
  createdAt: string;
  emi: number;
  paid: number;
  loanType?: string;
  status: "Pending" | "Reject" | "Approved" | "Paid";
  bankImg?: StaticImageData;
}

// Define an interface for the biomattrics attendance
export interface IBiomattricsAttendance {
  id: string;
  employee: string;
  inTime: string;
  outTime: string;
  employeeImg?: StaticImageData;
}

// Define an interface for the Training
export interface ITraining {
  id: number;
  trainingTitle: string;
  trainer: string;
  employees: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  trainingDuration: string;
  time: string;
  cost: number;
  status: "Upcoming" | "Open" | "Complete" | "Cancel";
  trainerImg?: StaticImageData;
}
// Define an interface for the personal loan
export interface IPersonalLoan {
  employeeName: string;
  amount: number;
  monthYear: string;
  createdAt: string;
  oneTimeDeduct: "Yes" | "No";
  emi: number;
  paid: number;
  status: "Paid" | "Partial";
  employeeImg?: StaticImageData;
  reason?: string;
}
// Define an interface for the employee leave
export interface IEmployeeLeave {
  leaveType: string; // Type of leave (e.g., "Bereavement Leave")
  leaveDuration: string; // Duration of leave (e.g., "01 September 2024 - 03 September 2024")
  days: number; // Number of days
  reason: string;
  startDate?: string;
  endDate?: string;
  status: "Approved" | "Pending"; // Leave status
}
// Define an interface for the admin leave
export interface IAdminLeave {
  employeeName: string;
  designation: string;
  leaveType: string;
  leaveDuration: string;
  days: number;
  reason: string;
  status: "Approved" | "Pending";
  adminImg?: StaticImageData;
  startDate?: string;
  endDate?: string;
}
// Define an interface for the holiday
export interface IHoliday {
  date: string; // Date of the holiday (e.g., "1 December 2024")
  day: string; // Day of the week (e.g., "Sunday")
  holidayName: string; // Name of the holiday (e.g., "World AIDS Day")
}
// Define an interface for the time sheet
export interface ITimeSheet {
  employee: string;
  date: string;
  hours: number;
  remarks: string;
  employeeImg?: StaticImageData;
}
// Define an interface for the employee schedule
export interface ScheduleEntry {
  date: string;
  day: string;
  event: string;
  details: string;
  additional?: string;
}

export interface IEmployeeSchedule {
  employeeImg?: StaticImageData;
  employee: string;
  schedule: ScheduleEntry[];
}
// Define an interface for the overtime record
export interface IOvertimeRecord {
  name?: string | undefined;
  employee: string;
  date: string;
  hours: number;
  description: string;
  approvedBy: string;
  employeeImg?: StaticImageData;
  adminImg?: StaticImageData;
}
// Define an interface for the warning record
export interface IWarningRecord {
  employee: string;
  subject: string;
  warningDate: string;
  description: string;
  employeeImg?: StaticImageData;
}
// Define an interface for the lead
export interface ILead {
  createdDate: string;
  leadName: string;
  leadType?: string;
  currency?: string;
  description?: string;
  companyName: string;
  phone: string;
  email: string;
  owner: string;
  status: "Approved" | "Pending" | "Rejected" | "Contacted";
  employeeImg?: StaticImageData;
}
// Define an interface for the deal
export interface IDeal {
  id: string;
  dealName: string;
  phase: string;
  pipelineType?: string;
  sourceType?: string;
  currency?: string;
  startDate?: string;
  mobileNumber?: string;
  endDate?: string;
  dealAmount: number;
  email?: number;
  tags: string;
  expectedEndDate: string;
  owner: string;
  phone: string;
  chances: string;
  description?:string;
  status: "Won" | "Open" | "Lost";
}
// Define an interface for the deal statistic
export interface IDealStatistic {
  id: number;
  salesRep: string;
  category: string;
  email: string;
  location: string;
  date: string;
  employeeImg: StaticImageData | any | string;
}
// Define an interface for the contact
export interface IContact {
  name: string;
  phone: string;
  email: string;
  location: string;
  address?: string;
  userImg?: StaticImageData;
}
// Define an interface for the pipeline
export interface IPipeline {
  id: number;
  pipeline: string;
}
// Define an interface for the paylist
export interface IPaylist {
  employeeId: string;
  employeeName: string;
  designation: string;
  dearnessAllowance?: string;
  transportAllowance?: string;
  mobileAllowance?: string;
  phone?: string;
  providentFund?: string;
  securityDeposit?: string;
  personalLoan?: string;
  earlyLeaving?: string;
  bonusAllowance?: string;
  email: string;
  joiningDate: string;
  salaryMonthly: number;
  status: "Paid" | "Unpaid";
  employeeImg?: StaticImageData;
}
// Define an interface for the earning
export interface IEarning {
  earning: string; // The name or category of the earning
  title: string; // Description or title of the earning
  type: string; // Type of earning (e.g., Fixed, Percentage, As Per Need)
  amount: number; // Monetary value of the earning
}
// Define an interface for the deduction
export interface IDeduction {
  deduction: string; // Name or category of the deduction
  title: string; // Description or title of the deduction
  type: string; // Type of deduction (e.g., Fixed, Percentage)
  amount: number; // Monetary value of the deduction
}
// Define an interface for the expese
export interface IExpese {
  invoiceNumber: string; // Unique identifier for the invoice
  itemName: string; // Name of the purchased item
  purchasedBy: string; // Name of the person who made the purchase
  purchaseDate: string; // Date of the purchase
  amount: number; // Monetary amount of the purchase
  status: "Paid" | "Unpaid" | "Returned"; // Status of the purchase
  employeeImg?: StaticImageData;
}
// Define an interface for the company
export interface ICompany {
  id: number;
  name: string; // Name of the company
  location: string; // Location of the company
  phone?: string;
  mobile?: string;
  fax?: string;
  websites?: string;
  industry?: string;
  currencyType?: string;
  source?: string;
  description?: string;
  language?: string;
  country?: string;
  city?: string;
  zipCode?: string;
  state?: string;
  address?: string;
  email: string; // Email address
  owner: string; // Name of the owner
  rating: number; // Rating of the company
  tag: string; // Tag/category of the company
  status: "Active" | "Inactive" | "Pending"; // Status of the company
  companyImg?: StaticImageData;
}
// Define an interface for the activity
export interface IActivity {
  title: string;
  activityType: string;
  owner: string;
  createDate: string;
  deadline: string;
  employeeImg?: StaticImageData;
}
// Define an interface for the resignation
export interface IResignation {
  employee: string;
  resignationDate: string;
  lastWorkingDay: string;
  description?: string;
  reason: string;
  employeeImg?: StaticImageData;
}
// Define an interface for the promotion
export interface IPromotion {
  promotedEmployee: string;
  designation: string;
  promotionTitle: string;
  promotionDate: string;
  description: string;
  employeeImg?: StaticImageData;
}
// Define an interface for the award
export interface IAward {
  employee: string;
  awardType: string;
  date: string;
  gift: string;
  giftDate?: string;
  description: string;
  employeeImg?: StaticImageData;
}
// Define an interface for the meeting
export interface IMeeting {
  meetingTitle: string;
  meetingDate: string;
  meetingTime: string;
  meetingLocation: string;
}
// Define an interface for the ticket
export interface ITicket {
  ticketID: string;
  ticketTitle: string;
  priority: "Low" | "Medium" | "High";
  date: string;
  createdBy: string;
  lastReply: string;
  status: "Open" | "In Progress" | "Closed";
}
// Define an interface for the transfer
export interface ITransfer {
  prevBranch: string;
  newBranch: string;
  department: string;
  transferDate: string;
  description: string;
}
// Define an interface for the termination
export interface ITermination {
  employee: string;
  terminationType: string;
  noticeDate: string;
  terminationDate: string;
  description: string;
  employeeImg?: StaticImageData;
}
// Define an interface for the document
export interface IDocument {
  fileName: string;
  document: string;
  role: string;
  description: string;
  employeeImg?: StaticImageData;
}
// Define an interface for the PDocument
export interface IPDocument {
  fileName: string;
  type: string;
  size: string;
  uploadData: string;
}
// Define an interface for the announcement
export interface IAnnouncement {
  title: string;
  startDate: string;
  endDate: string;
  description: string;
}
// Define an interface for the admin attendance
export interface IAdminAttendance {
  employeeImg?: StaticImageData;
  name: string;
  date1: string;
  date2: string;
  date3: string;
  date4: string;
  date5: string;
  date6: string;
  date7: string;
  date8: string;
  date9: string;
  date10: string;
  date11: string;
  date12: string;
  date13: string;
  date14: string;
  date15: string;
  date16: string;
  date17: string;
  date18: string;
  date19: string;
  date20: string;
  date21: string;
  date22: string;
  date23: string;
  date24: string;
  date25: string;
  date26: string;
  date27: string;
  date28: string;
  date29: string;
  date30: string;
  date31: string;
}
// Define an interface for the invoice
export interface IInvoice {
  id: string;
  name: string;
  email: string;
  number: string;
  location: string;
  date: string;
  amount: number;
  status: "Paid" | "Unpaid" | "Cancel" | "Refund"; // Invoice status
  employeeImg?: StaticImageData;
}
// Define an interface for the head cell
export interface IHeadCell {
  id: string;
  numeric: boolean;
  disablePadding: boolean;
  label: string;
}
// Define an interface for the head cell schedule
export interface IHeadCellSchedule {
  id: string;
  numeric: boolean;
  disablePadding: boolean;
  label?: string;
  date?: string;
  dateTH?: string;
  month?: string;
  day?: string;
}

// interface for project create

export interface ICreateProject {
  projectName: string;
  startDate: string;
  deadline: string;
  priority: string;
  status: string;
}
