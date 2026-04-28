

import { IEmailNotification, INotification } from "@/interface";
import avatar1 from "../../public/assets/images/avatar/avatar1.png";
import avatar2 from "../../public/assets/images/avatar/avatar2.png";
import avatar3 from "../../public/assets/images/avatar/avatar3.png";
import avatar4 from "../../public/assets/images/avatar/avatar4.png";
import avatar5 from "../../public/assets/images/avatar/avatar5.png";
import avatar6 from "../../public/assets/images/avatar/avatar6.png";
import avatar7 from "../../public/assets/images/avatar/avatar7.png";
import avatar8 from "../../public/assets/images/avatar/avatar8.png";

export const emailNotifications:IEmailNotification[] = [
    {
      avatar: avatar1,
      profileLink: "/employee-profile",
      messageLink: "/apps/email-read",
      message: "HRM: New policy updates available.",
      time: "1h ago",
      status: "HRM"
    },
    {
      avatar: avatar2,
      profileLink: "/employee-profile",
      messageLink: "/apps/email-read",
      message: "CRM: Monthly performance report.",
      time: "2h ago",
      status: "CRM"
    },
    {
      avatar: avatar3,
      profileLink: "/employee-profile",
      messageLink: "/apps/email-read",
      message: "HRM: Team meeting at 3 PM.",
      time: "3h ago",
      status: "HRM"
    },
    {
      avatar: avatar4,
      profileLink: "/employee-profile",
      messageLink: "/apps/email-read",
      message: "CRM: New client inquiry from ABC Corp.",
      time: "4h ago",
      status: "CRM"
    },
    {
      avatar: avatar5,
      profileLink: "/employee-profile",
      messageLink: "/apps/email-read",
      message: "HRM: Annual leave request approved.",
      time: "5h ago",
      status: "HRM"
    },
    {
      avatar: avatar6,
      profileLink: "/employee-profile",
      messageLink: "/apps/email-read",
      message: "CRM: Follow-up required for DEF Ltd.",
      time: "6h ago",
      status: "CRM"
    },
    {
      avatar: avatar7,
      profileLink: "/employee-profile",
      messageLink: "/apps/email-read",
      message: "HRM: Training session reminder.",
      time: "7h ago",
      status: "HRM"
    },
    {
      avatar: avatar8,
      profileLink: "/employee-profile",
      messageLink: "/apps/email-read",
      message: "CRM: Client feedback received.",
      time: "8h ago",
      status: "CRM"
    }
  ];
  
  export const notificationsData :INotification[]  = [
    {
        id: 1,
        category: "HRM",
        message: "New employee onboarding session at 10 AM.",
        time: "1h ago",
        image: avatar1
    },
    {
        id: 2,
        category: "CRM",
        message: "Upcoming meeting with ABC Corp at 2 PM.",
        time: "2h ago",
        image: avatar2
    },
    {
        id: 3,
        category: "HRM",
        message: "Performance review deadlines approaching.",
        time: "3h ago",
        image: avatar3
    },
    {
        id: 4,
        category: "CRM",
        message: "Follow-up call with XYZ Ltd scheduled for 4 PM.",
        time: "4h ago",
        image: avatar4
    },
    {
        id: 5,
        category: "HRM",
        message: "Reminder to submit timesheets by EOD.",
        time: "5h ago",
        image: avatar5
    }
];
