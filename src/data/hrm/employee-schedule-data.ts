import { IEmployeeSchedule } from "@/interface/table.interface";

import img1 from "../../../public/assets/images/avatar/avatar5.png";
import img2 from "../../../public/assets/images/avatar/avatar9.png";
import img3 from "../../../public/assets/images/avatar/avatar1.png";
import img4 from "../../../public/assets/images/avatar/avatar15.png";
import img5 from "../../../public/assets/images/avatar/avatar.png";
import img6 from "../../../public/assets/images/avatar/avatar2.png";
import img7 from "../../../public/assets/images/avatar/avatar3.png";
import img8 from "../../../public/assets/images/avatar/avatar4.png";
import img9 from "../../../public/assets/images/avatar/avatar6.png";

export const employeeScheduleData: IEmployeeSchedule[] = [
  {
    employeeImg: img1,
    employee: "Alice Cooper",
    schedule: [
      {
        date: "11th May",
        day: "Saturday",
        event: "Bob Marley",
        details: "All Day Out",
      },
      {
        date: "12th May",
        day: "Sunday",
        event: "Shift",
        details: "9 am - 6 pm",
      },
      {
        date: "13th May",
        day: "Monday",
        event: "Shift",
        details: "8:30 am - 6 pm",
        additional: "Early",
      },
      {
        date: "14th May",
        day: "Tuesday",
        event: "Shift",
        details: "9 am - 6 pm",
      },
      {
        date: "15th May",
        day: "Wednesday",
        event: "Shift",
        details: "9 am - 6 pm",
      },
      {
        date: "16th May",
        day: "Thursday",
        event: "Christmas Day",
        details: "All Day",
      },
      {
        date: "17th May",
        day: "Friday",
        event: "Weekly Holiday",
        details: "All Day",
      },
    ],
  },
  {
    employeeImg: img2,
    employee: "John Doe",
    schedule: [
      {
        date: "11th May",
        day: "Saturday",
        event: "Training",
        details: "All Day",
      },
      {
        date: "12th May",
        day: "Sunday",
        event: "Shift",
        details: "8 am - 4 pm",
      },
      {
        date: "13th May",
        day: "Monday",
        event: "Shift",
        details: "8:30 am - 6 pm",
        additional: "Morning",
      },
      {
        date: "14th May",
        day: "Tuesday",
        event: "Shift",
        details: "Absent",
      },
      {
        date: "15th May",
        day: "Wednesday",
        event: "Team Meeting",
        details: "10 am - 12 pm",
      },
      { date: "16th May", day: "Thursday", event: "Leave", details: "All Day" },
      { date: "17th May", day: "Friday", event: "Holiday", details: "All Day" },
    ],
  },
  {
    employeeImg: img3,
    employee: "Jane Smith",
    schedule: [
      {
        date: "11th May",
        day: "Saturday",
        event: "Day Off",
        details: "All Day",
      },
      {
        date: "12th May",
        day: "Sunday",
        event: "Shift",
        details: "Absent",
      },
      {
        date: "13th May",
        day: "Monday",
        event: "Shift",
        details: "10 am - 7 pm",
      },
      {
        date: "14th May",
        day: "Tuesday",
        event: "Shift",
        details: "9 am - 6 pm",
      },
      {
        date: "15th May",
        day: "Wednesday",
        event: "Workshop",
        details: "2 pm - 4 pm",
      },
      {
        date: "16th May",
        day: "Thursday",
        event: "Shift",
        details: "8 am - 4 pm",
      },
      { date: "17th May", day: "Friday", event: "Holiday", details: "All Day" },
    ],
  },
  {
    employeeImg: img4,
    employee: "Robert Johnson",
    schedule: [
      {
        date: "11th May",
        day: "Saturday",
        event: "Shift",
        details: "9 am - 5 pm",
      },
      {
        date: "12th May",
        day: "Sunday",
        event: "Training",
        details: "10 am - 3 pm",
      },
      {
        date: "13th May",
        day: "Monday",
        event: "Shift",
        details: "8:30 am - 6 pm",
      },
      {
        date: "14th May",
        day: "Tuesday",
        event: "Holiday",
        details: "All Day",
      },
      {
        date: "15th May",
        day: "Wednesday",
        event: "Workshop",
        details: "11 am - 1 pm",
      },
      {
        date: "16th May",
        day: "Thursday",
        event: "Shift",
        details: "9 am - 6 pm",
      },
      {
        date: "17th May",
        day: "Friday",
        event: "Weekly Holiday",
        details: "All Day",
      },
    ],
  },
  {
    employeeImg: img5,
    employee: "Emily Davis",
    schedule: [
      {
        date: "11th May",
        day: "Saturday",
        event: "Shift",
        details: "8 am - 4 pm",
      },
      { date: "12th May", day: "Sunday", event: "Leave", details: "All Day" },
      {
        date: "13th May",
        day: "Monday",
        event: "Shift",
        details: "9 am - 6 pm",
      },
      {
        date: "14th May",
        day: "Tuesday",
        event: "Meeting",
        details: "10 am - 12 pm",
      },
      {
        date: "15th May",
        day: "Wednesday",
        event: "Training",
        details: "1 pm - 5 pm",
      },
      {
        date: "16th May",
        day: "Thursday",
        event: "Workshop",
        details: "All Day",
      },
      {
        date: "17th May",
        day: "Friday",
        event: "Shift",
        details: "7 am - 3 pm",
      },
    ],
  },
  {
    employeeImg: img6,
    employee: "Bob Marli",
    schedule: [
      {
        date: "11th May",
        day: "Saturday",
        event: "Workshop",
        details: "2 pm - 5 pm",
      },
      {
        date: "12th May",
        day: "Sunday",
        event: "Workshop",
        details: "2 pm - 5 pm",
      },
      { date: "13th May", day: "Monday", event: "Day Off", details: "All Day" },
      {
        date: "14th May",
        day: "Tuesday",
        event: "Weekly Holiday",
        details: "All Day",
      },
      {
        date: "15th May",
        day: "Wednesday",
        event: "Training",
        details: "10 am - 3 pm",
      },
      { date: "16th May", day: "Thursday", event: "Leave", details: "All Day" },
      {
        date: "17th May",
        day: "Friday",
        event: "Shift",
        details: "9 am - 6 pm",
      },
    ],
  },
  {
    employeeImg: img7,
    employee: "Devid Wiliam",
    schedule: [
      {
        date: "11th May",
        day: "Saturday",
        event: "Training",
        details: "10 am - 3 pm",
      },
      { date: "12th May", day: "Sunday", event: "Leave", details: "All Day" },
      {
        date: "13th May",
        day: "Monday",
        event: "Meeting",
        details: "11 am - 1 pm",
      },
      {
        date: "14th May",
        day: "Tuesday",
        event: "Shift",
        details: "9 am - 6 pm",
      },
      {
        date: "15th May",
        day: "Wednesday",
        event: "Holiday",
        details: "All Day",
      },
      {
        date: "16th May",
        day: "Thursday",
        event: "Workshop",
        details: "2 pm - 5 pm",
      },
      {
        date: "17th May",
        day: "Friday",
        event: "Weekly Holiday",
        details: "All Day",
      },
    ],
  },
  {
    employeeImg: img8,
    employee: "Max Melon",
    schedule: [
      {
        date: "11th May",
        day: "Saturday",
        event: "Shift",
        details: "8 am - 4 pm",
      },
      { date: "12th May", day: "Sunday", event: "Day Off", details: "All Day" },
      {
        date: "13th May",
        day: "Monday",
        event: "Workshop",
        details: "2 pm - 5 pm",
      },
      {
        date: "14th May",
        day: "Tuesday",
        event: "Meeting",
        details: "11 am - 1 pm",
      },
      {
        date: "15th May",
        day: "Wednesday",
        event: "Shift",
        details: "9 am - 6 pm",
      },
      {
        date: "16th May",
        day: "Thursday",
        event: "Training",
        details: "10 am - 3 pm",
      },
      { date: "17th May", day: "Friday", event: "Holiday", details: "All Day" },
    ],
  },
  {
    employeeImg: img9,
    employee: "Boogi Man",
    schedule: [
      { date: "11th May", day: "Saturday", event: "Leave", details: "All Day" },
      {
        date: "12th May",
        day: "Sunday",
        event: "Shift",
        details: "7 am - 3 pm",
      },
      { date: "13th May", day: "Monday", event: "Holiday", details: "All Day" },
      {
        date: "14th May",
        day: "Tuesday",
        event: "Training",
        details: "10 am - 3 pm",
      },
      {
        date: "15th May",
        day: "Wednesday",
        event: "Workshop",
        details: "2 pm - 5 pm",
      },
      {
        date: "16th May",
        day: "Thursday",
        event: "Day Off",
        details: "All Day",
      },
      {
        date: "17th May",
        day: "Friday",
        event: "Weekly Holiday",
        details: "All Day",
      },
    ],
  },
  {
    employeeImg: img1,
    employee: "Emily Davis",
    schedule: [
      {
        date: "11th May",
        day: "Saturday",
        event: "Weekly Holiday",
        details: "All Day",
      },
      {
        date: "12th May",
        day: "Sunday",
        event: "Training",
        details: "10 am - 3 pm",
      },
      {
        date: "13th May",
        day: "Monday",
        event: "Shift",
        details: "9 am - 6 pm",
      },
      {
        date: "14th May",
        day: "Tuesday",
        event: "Workshop",
        details: "2 pm - 5 pm",
      },
      {
        date: "15th May",
        day: "Wednesday",
        event: "Holiday",
        details: "All Day",
      },
      {
        date: "16th May",
        day: "Thursday",
        event: "Shift",
        details: "8 am - 4 pm",
      },
      { date: "17th May", day: "Friday", event: "Day Off", details: "All Day" },
    ],
  },
  {
    employeeImg: img2,
    employee: "Mariya Luica",
    schedule: [
      {
        date: "11th May",
        day: "Saturday",
        event: "Workshop",
        details: "2 pm - 5 pm",
      },
      {
        date: "12th May",
        day: "Sunday",
        event: "Workshop",
        details: "2 pm - 5 pm",
      },
      { date: "13th May", day: "Monday", event: "Day Off", details: "All Day" },
      {
        date: "14th May",
        day: "Tuesday",
        event: "Weekly Holiday",
        details: "All Day",
      },
      {
        date: "15th May",
        day: "Wednesday",
        event: "Training",
        details: "10 am - 3 pm",
      },
      { date: "16th May", day: "Thursday", event: "Leave", details: "All Day" },
      {
        date: "17th May",
        day: "Friday",
        event: "Shift",
        details: "9 am - 6 pm",
      },
    ],
  },
  {
    employeeImg: img3,
    employee: "Max Andalucia",
    schedule: [
      {
        date: "11th May",
        day: "Saturday",
        event: "Training",
        details: "10 am - 3 pm",
      },
      { date: "12th May", day: "Sunday", event: "Leave", details: "All Day" },
      {
        date: "13th May",
        day: "Monday",
        event: "Meeting",
        details: "11 am - 1 pm",
      },
      {
        date: "14th May",
        day: "Tuesday",
        event: "Shift",
        details: "9 am - 6 pm",
      },
      {
        date: "15th May",
        day: "Wednesday",
        event: "Holiday",
        details: "All Day",
      },
      {
        date: "16th May",
        day: "Thursday",
        event: "Workshop",
        details: "2 pm - 5 pm",
      },
      {
        date: "17th May",
        day: "Friday",
        event: "Weekly Holiday",
        details: "All Day",
      },
    ],
  },
  {
    employeeImg: img4,
    employee: "Kartu Kai",
    schedule: [
      {
        date: "11th May",
        day: "Saturday",
        event: "Shift",
        details: "8 am - 4 pm",
      },
      { date: "12th May", day: "Sunday", event: "Day Off", details: "All Day" },
      {
        date: "13th May",
        day: "Monday",
        event: "Workshop",
        details: "2 pm - 5 pm",
      },
      {
        date: "14th May",
        day: "Tuesday",
        event: "Meeting",
        details: "11 am - 1 pm",
      },
      {
        date: "15th May",
        day: "Wednesday",
        event: "Shift",
        details: "9 am - 6 pm",
      },
      {
        date: "16th May",
        day: "Thursday",
        event: "Training",
        details: "10 am - 3 pm",
      },
      { date: "17th May", day: "Friday", event: "Holiday", details: "All Day" },
    ],
  },
  {
    employeeImg: img5,
    employee: "Emain Eim",
    schedule: [
      {
        date: "11th May",
        day: "Saturday",
        event: "Training",
        details: "10 am - 3 pm",
      },
      {
        date: "12th May",
        day: "Sunday",
        event: "Shift",
        details: "9 am - 6 pm",
      },
      {
        date: "13th May",
        day: "Monday",
        event: "Weekly Holiday",
        details: "All Day",
      },
      {
        date: "14th May",
        day: "Tuesday",
        event: "Weekly Holiday",
        details: "All Day",
      },
      {
        date: "15th May",
        day: "Wednesday",
        event: "Leave",
        details: "All Day",
      },
      {
        date: "16th May",
        day: "Thursday",
        event: "Shift",
        details: "9 am - 6 pm",
      },
      { date: "17th May", day: "Friday", event: "Holiday", details: "All Day" },
    ],
  },
  {
    employeeImg: img6,
    employee: "Laura Clark",
    schedule: [
      {
        date: "11th May",
        day: "Saturday",
        event: "Day Off",
        details: "All Day",
      },
      {
        date: "12th May",
        day: "Sunday",
        event: "Meeting",
        details: "11 am - 1 pm",
      },
      {
        date: "13th May",
        day: "Monday",
        event: "Meeting",
        details: "11 am - 1 pm",
      },
      {
        date: "14th May",
        day: "Tuesday",
        event: "Training",
        details: "10 am - 3 pm",
      },
      {
        date: "15th May",
        day: "Wednesday",
        event: "Leave",
        details: "All Day",
      },
      {
        date: "16th May",
        day: "Thursday",
        event: "Workshop",
        details: "2 pm - 5 pm",
      },
      {
        date: "17th May",
        day: "Friday",
        event: "Workshop",
        details: "2 pm - 5 pm",
      },
    ],
  },
];
