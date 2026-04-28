import { StaticImageData } from "next/image";

//Define an interface for the trainer 
export interface ITrainer {
  name: string;
  userImg: StaticImageData | string;
}

//Define an interface for the dropdown items
export interface IDropdown  {
  label: string;
  link: string;
};

//Define an interface for the select common type
export interface ISelectorOption {
  value: string | number;
  label: string | number;
}
//Define an interface for the Holiday date
export interface IHolidayDates {
  label: string;
  value: number;
}