export const useAttendanceHook = (tag: any) => {
  switch (tag) {
    case "Holiday":
      return "fa fa-star text-primary";
    case "Day Off":
      return "fa fa-calendar-week text-secondary";
    case "Present":
      return "fa fa-check text-success";
    case "Half Day":
      return "fa fa-star-half-alt text-info";
    case "Late":
      return "fa fa-exclamation-circle text-warning";
    case "Absent":
      return "fa fa-times text-danger";
    case "On Leave":
      return "fa fa-plane-departure text-link";
    default:
      return "";
  }
};
// "Paid" | "Unpaid" | "Cancel" | "Refund";
export const useTableStatusHook = (tag: any) => {
  switch (tag) {
    case "Pending":
      return "bg-warning";
    case "Reject":
      return "bg-danger";
    case "Rejected":
      return "bg-danger";
    case "Contacted":
      return "bg-info";
    case "Approved":
      return "bg-success";
    case "Active":
      return "bg-success";
    case "Inactive":
      return "bg-danger";
    case "Paid":
      return "bg-success";
    case "Unpaid":
      return "bg-secondary";
    case "Partial":
      return "bg-warning";
    case "Won":
      return "bg-success";
    case "Open":
      return "bg-primary";
    case "Lost":
      return "bg-danger";
    case "Returned":
      return "bg-warning";
    case "Upcoming":
      return "bg-warning";
    case "Complete":
      return "bg-success";
    case "Cancel":
      return "bg-danger";
    case "In Progress":
      return "bg-warning";
    case "Closed":
      return "bg-danger";
    case "Refund":
      return "bg-link";
    default:
      return "";
  }
};

export const useTablePrirotyHook = (tag: any) => {
  switch (tag) {
    case "Low":
      return "bg-danger";
    case "Medium":
      return "bg-warning";
    case "High":
      return "bg-success";
    default:
      return "";
  }
};

export const useTablePhaseHook = (tag: any) => {
  switch (tag) {
    case "Active":
      return "bg-info";
    case "Planned":
      return "bg-primary";
    case "Completed":
      return "bg-success";
    default:
      return "";
  }
};

export const useTableActivityStatusHook = (tag: any) => {
  switch (tag) {
    case "Training":
      return "bg-primary";
    case "Email":
      return "bg-link";
    case "Development":
      return "bg-primary";
    case "Call":
      return "bg-success";
    case "Support":
      return "bg-primary";
    case "Marketing":
      return "bg-primary";
    case "Task":
      return "bg-danger";
    case "Meeting":
      return "bg-warning";
    default:
      return "";
  }
};
export const useLocaitonStatusHook = (tag: any) => {
  switch (tag) {
    case "United States":
      return "bg-success";
    case "United Kingdom":
      return "bg-secondary";
    case "Germany":
      return "bg-primary";
    case "Canada":
      return "bg-danger";
    case "Australia":
      return "bg-info";
    default:
      return "";
  }
};

export const useScheduleStatusHook = (tag: any) => {
  switch (tag) {
    case "All Day Out":
      return "warning-bg";
    case "9 am - 6 pm":
      return "success-bg";
    case "Absent":
      return "danger-bg";
    case "8:30 am - 6 pm":
      return "theme-sec-bg";
    case "All Day":
      return "info-bg";
    case "Weekly Holiday":
      return "link-bg";
    default:
      return "";
  }
};
