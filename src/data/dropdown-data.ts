import {
  IDropdown,
  IHolidayDates,
  ISelectorOption,
  ITrainer,
} from "@/interface";

export const dropdownItems: IDropdown[] = [
  { label: "Action", link: "#" },
  { label: "More Action", link: "#" },
  { label: "Another Action", link: "#" },
];

export const trainersData: ITrainer[] = [
  { name: "Ethan Mitchell", userImg: "/assets/images/avatar/avatar1.png" },
  { name: "Madison Turner", userImg: "/assets/images/avatar/avatar2.png" },
  { name: "Mason Rodriguez", userImg: "/assets/images/avatar/avatar3.png" },
  { name: "Lily Campbell", userImg: "/assets/images/avatar/avatar4.png" },
  { name: "Carter White", userImg: "/assets/images/avatar/avatar5.png" },
  { name: "Olivia Bennett", userImg: "/assets/images/avatar/avatar6.png" },
];

export const singleSelectorData: ISelectorOption[] = [
  { value: "personal", label: "Personal" },
  { value: "organization", label: "Organization" },
];

export const companyData: ISelectorOption[] = [
  { value: "SwiftTech Solutions", label: "SwiftTech Solutions" },
  { value: "BlueWave Group", label: "BlueWave Group" },
  { value: "Summit Inc.", label: "Summit Inc." },
  { value: "Nexus Corporation", label: "Nexus Corporation" },
  { value: "Stellar Ltd.", label: "Stellar Ltd." },
];
export const currencyData: ISelectorOption[] = [
  { value: "USD", label: "$ USD" },
  { value: "EURO", label: "€ EURO" },
  { value: "RUBLE", label: "₽ RUBLE " },
  { value: "POUND", label: "£ POUND" },
  { value: "BTC", label: "₿ BTC" },
];
export const trainingTitles: ISelectorOption[] = [
  { value: 1, label: "Creating RESTful APIs with PHP" },
  { value: 2, label: "PHP for WordPress Development" },
  { value: 3, label: "Full-Stack Web Development Bootcamp" },
  { value: 4, label: "Introduction to Cloud Computing with AWS" },
  { value: 5, label: "Version Control with Git and GitHub" },
  { value: 6, label: "Integrating Third-Party APIs with PHP" },
  { value: 7, label: "PHP and Laravel Security Best Practices" },
  { value: 8, label: "HTML and CSS: The Complete Guide" },
  { value: 9, label: "SEO Best Practices with HTML5" },
  { value: 10, label: "Custom Theme Development in WordPress" },
];

export const holidayDates: IHolidayDates[] = [
  {
    label: "Monday",
    value: 1,
  },
  {
    label: "Tuesday",
    value: 2,
  },
  {
    label: "Wednesday",
    value: 3,
  },
  {
    label: "Thursday",
    value: 4,
  },
  {
    label: "Friday",
    value: 5,
  },
  {
    label: "Saturday",
    value: 6,
  },
  {
    label: "Sunday",
    value: 7,
  },
];
//add deals dropdown data
export const pipelineData: ISelectorOption[] = [
  { value: "Campaign", label: "Campaign" },
  { value: "Sells", label: "Sells" },
  { value: "Marketing", label: "Marketing " },
  { value: "Calls", label: "Calls" },
  { value: "TVC", label: "TVC" },
];
export const dealsStatusDropdownData: ISelectorOption[] = [
  { value: "Open", label: "Open" },
  { value: "Lost", label: "Lost" },
  { value: "Won", label: "Won" },
];

//event category enum
export const eventCategoryData: ISelectorOption[] = [
  { value: "technology", label: "Technology" },
  { value: "science", label: "Science" },
  { value: "art", label: "Art" },
  { value: "education", label: "Education" },
  { value: "sports", label: "Sports" },
];

export const languagesData: ISelectorOption[] = [
  { label: "English", value: "en" },
  { label: "Bengali", value: "bn" },
  { label: "Spanish", value: "es" },
  { label: "French", value: "fr" },
  { label: "German", value: "de" },
  { label: "Chinese", value: "zh" },
  { label: "Hindi", value: "hi" },
  { label: "Arabic", value: "ar" },
  { label: "Russian", value: "ru" },
  { label: "Portuguese", value: "pt" },
  { label: "Italian", value: "it" },
  { label: "Japanese", value: "ja" },
  { label: "Korean", value: "ko" },
  { label: "Dutch", value: "nl" },
  { label: "Swedish", value: "sv" },
  { label: "Turkish", value: "tr" },
  { label: "Greek", value: "el" },
  { label: "Polish", value: "pl" },
  { label: "Thai", value: "th" },
  { label: "Vietnamese", value: "vi" },
];

export const contactMethodsData: ISelectorOption[] = [
  { label: "Call", value: "call" },
  { label: "Email", value: "email" },
  { label: "SMS", value: "sms" },
  { label: "WhatsApp", value: "whatsapp" },
  { label: "Telegram", value: "telegram" },
  { label: "Skype", value: "skype" },
  { label: "Facebook", value: "facebook" },
  { label: "Instagram", value: "instagram" },
  { label: "Twitter", value: "twitter" },
  { label: "LinkedIn", value: "linkedin" },
  { label: "Snapchat", value: "snapchat" },
  { label: "In-person", value: "in_person" },
  { label: "Zoom", value: "zoom" },
  { label: "Web chat", value: "web_chat" },
  { label: "Fax", value: "fax" },
];

export const employeeDropdownData: ISelectorOption[] = [
  { label: 1, value: "John Smith" },
  { label: 2, value: "Jane Doe" },
  { label: 3, value: "Alice Johnson" },
  { label: 4, value: "Bob Brown" },
  { label: 5, value: "Charlie Davis" },
  { label: 6, value: "David Miller" },
  { label: 7, value: "Eve Wilson" },
  { label: 8, value: "Frank Moore" },
  { label: 9, value: "Grace Taylor" },
  { label: 10, value: "Hannah Anderson" },
  { label: 11, value: "Ivy Thomas" },
  { label: 12, value: "Jack Martinez" },
  { label: 13, value: "Karen Lee" },
  { label: 14, value: "Leo Clark" },
  { label: 15, value: "Mona Lewis" },
  { label: 16, value: "Karen Lee" },
  { label: 17, value: "Mona Lewis" },
  { label: 18, value: "Frank Moore" },
  { label: 19, value: "Karen Lee" },
  { label: 20, value: "Frank Moore" },
];

export const purchaseStatusOptions: ISelectorOption[] = [
  { label: "1", value: "Paid" },
  { label: "2", value: "Unpaid" },
  { label: "3", value: "Returned" },
];

export const trainingStatuses: ISelectorOption[] = [
  { value: "Open", label: "1" },
  { value: "Upcoming", label: "2" },
  { value: "Complete", label: "3" },
  { value: "Cancel", label: "4" },
];

export const priorityData: ISelectorOption[] = [
  { value: "Low", label: "Low" },
  { value: "Medium", label: "Medium" },
  { value: "High", label: "High" },
];
export const projectStatus: ISelectorOption[] = [
  { value: "Complete", label: "Complete" },
  { value: "On Going", label: "On Going" },
  { value: "Pending", label: "Pending" },
];

export const employeeDesignationData: ISelectorOption[] = [
  { label: "ITD", value: "Information Technology Department" },
  { label: "TD", value: "Technology Department" },
  { label: "SD", value: "Security Department" },
  { label: "NPD", value: "Network Operations Department" },
  { label: "SAD", value: "Systems Administration Department" },
  { label: "DMD", value: "Database Management Department" },
  { label: "SDD", value: "Software Development Department" },
  { label: "WDD", value: "Web Development Department" },
  { label: "PMO", value: "Project Management Office" },
  { label: "ITSP", value: "IT Support Department" },
  { label: "CD", value: "Consulting Department" },
];

export const genderData: ISelectorOption[] = [
  { value: "Male", label: "Male" },
  { value: "Female", label: "Female" },
  { value: "Others", label: "Others" },
];
export const yearData: ISelectorOption[] = [
  { value: "2024", label: "2024" },
  { value: "2022", label: "2022" },
  { value: "2021", label: "2021" },
  { value: "2020", label: "2020" },
];
