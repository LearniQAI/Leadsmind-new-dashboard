import { StaticImageData } from "next/image";
import React from "react";
import {
  IActivity,
  IAdminLeave,
  IAnnouncement,
  IAward,
  IDeal,
  IDocument,
  IEmployeeLeave,
  IExpese,
  IHoliday,
  ILead,
  IMeeting,
  IOfficeLoan,
  IOvertimeRecord,
  IPaylist,
  IPersonalLoan,
  IPromotion,
  IResignation,
  ITermination,
  ITimeSheet,
  ITraining,
  ITransfer,
  IWarningRecord,
} from "./table.interface";

//Define an interface for the context api data
export interface AppContextType {
  scrollDirection?: string;
  setScrollDirection?: React.Dispatch<React.SetStateAction<string>> | undefined;
  sideMenuOpen: boolean;
  setSideMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  sidebarHandle: () => void;
  toggleTheme: () => void;
  isCollapse: boolean;
  setIsCollapse: React.Dispatch<React.SetStateAction<boolean>>;
  theme: string;
  setTheme: React.Dispatch<React.SetStateAction<string>>;
}

//Define an interface for the product
export interface ProductsType {
  id: number;
  productImg: StaticImageData;
  productTitle: string;
  productSubTitle?: string;
  stock?: string;
  cartIcon?: string;
  cartEye?: string;
  cartHeart?: string;
  price?: number;
  priceOld?: number;
  ratings?: number;
  quantity?: number;
  trendingClass?: string;
  trendingValue?: string;
  newClass?: string;
  newValue?: string;
  discountClass?: string;
  discountValue?: string;
  totalCart?: number;
}

//Define an interface for the daynamic id type
export interface idType {
  id: number;
}

//Define an interface for the country
export interface ICountry {
  value: string;
  label: string;
}
//Define an interface for the Designation
export interface IDesignationsData {
  designation: string;
  department: string;
}
//Define an interface for the toast props
export interface IToastProps {
  open: boolean;
  setOpen: (value: boolean) => void;
}
// Define an interface for the modal state props
export interface statePropsType {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

// Define an interface for the employee modal state props
export interface employeestatePropsType {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  data: employeestatePropsType | any;
}
// Define an interface for the employee designation update modal state props
export interface designationStatePropsType {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  editData: IDesignationsData;
}
// Define an interface for the employee office loan update modal state props
export interface officeLoanStatePropsType {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  editData: IOfficeLoan;
}
// Define an interface for the employee personal loan update modal state props
export interface personalLoanStatePropsType {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  editData: IPersonalLoan;
}
// Define an interface for the employee personal loan update modal state props
export interface leaveEmployeeStatePropsType {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  editData: IEmployeeLeave;
}
// Define an interface for the expence update modal state props
export interface expenseStatePropsType {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  editData: IExpese;
}
// Define an interface for the admin leave update modal state props
export interface adminLeaveStatePropsType {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  editData: IAdminLeave;
}
// Define an interface for the holiday update modal state props
export interface holidayStatePropsType {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  editData: IHoliday;
}

// Define an interface for the holiday update modal state props
export interface traineeStatePropsType {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  editData: ITraining;
}

// Define an interface for the Resignation update modal state props
export interface resignationstatePropsType {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  editData: IResignation;
}
// Define an interface for the Promotion update modal state props
export interface promotionstatePropsType {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  editData: IPromotion;
}
// Define an interface for the timesheet update modal state props
export interface timesheetStatePropsType {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  editData: ITimeSheet;
}

// Define an interface for the Meeting update modal state props

export interface meetingStatePropsType {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  editData: IMeeting;
}

// Define an interface for the Transfer update modal state props

export interface transferStatePropsType {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  editData: ITransfer;
}
// Define an interface for the Overtime update modal state props
export interface overtimeStatePropsType {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  editData: IOvertimeRecord;
}

// Define an interface for the Termination update modal state props
export interface terminationStatePropsType {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  editData: ITermination;
}

// Define an interface for the Termination update modal state props
export interface documentstatePropsType {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  editData: IDocument;
}

// Define an interface for the Termination update modal state props
export interface announcementStatePropsType {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  editData: IAnnouncement;
}

// Define an interface for the Activity update modal state props
export interface activityStatePropsType {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  editData: IActivity;
}

// Define an interface for the Award update modal state props
export interface awardStatePropsType {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  editData: IAward;
}
// Define an interface for the warning update modal state props
export interface warningStatePropsType {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  editData: IWarningRecord;
}
// Define an interface for the lead update modal state props
export interface leadStatePropsType {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  editData: ILead;
}
// Define an interface for the deals update modal state props
export interface dealsStatePropsType {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  editData: IDeal;
}

// Define an interface for the Paylist update modal state props
export interface paylistStatePropsType {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  editData: IPaylist;
}
// Define an interface for the deals details modal state props
export interface dealsDetailsStatePropsType {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  editData: IDeal;
}