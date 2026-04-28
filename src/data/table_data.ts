//  Meeting data table & type
export type Meeting = {
    title: string;
    date: string;
    time: string;
}
export const meetingData = [
    { title: "Project Kickoff", date: "June 1, 2024", time: "10:00 AM" },
    { title: "Weekly Team Sync", date: "June 5, 2024", time: "02:00 PM" },
    { title: "Client Presentation", date: "June 10, 2024", time: "11:00 AM" },
    { title: "Monthly Review", date: "June 15, 2024", time: "03:00 PM" },
    { title: "Weekly Review", date: "June 20, 2024", time: "11:00 AM" },
    { title: "Yearly Meeting", date: "June 22, 2024", time: "09:00 AM" },
    { title: "Strategy Planning", date: "June 28, 2024", time: "02:00 PM" },
];
//  Absent data table & type
export type AbsentEmployee ={
    employee: string;
    status: string;
}
export const absentData = [
    { employee: "John Doe", status: "Absent" },
    { employee: "Jane Smith", status: "Absent" },
    { employee: "Robert Johnson", status: "Absent" },
    { employee: "Emily Davis", status: "Absent" },
    { employee: "Michael Brown", status: "Absent" },
    { employee: "Sarah Wilson", status: "Absent" },
    { employee: "David Martinez", status: "Absent" },
    { employee: "Lisa Anderson", status: "Absent" },
    { employee: "James Lee", status: "Absent" },
    { employee: "Mary Perez", status: "Absent" },
    { employee: "Daniel King", status: "Absent" },
    { employee: "Barbara Hill", status: "Absent" },
    { employee: "Kevin Scott", status: "Absent" },
    { employee: "Laura Hernandez", status: "Absent" },
    { employee: "Brian Lopez", status: "Absent" },
];