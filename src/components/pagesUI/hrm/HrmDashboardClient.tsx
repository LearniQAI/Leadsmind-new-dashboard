"use client";
import React from "react";
import {
    Calendar,
    Clock,
    Zap
} from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import QuickActions from "@/components/dashboard/QuickActions";
import SummarySingleCard from "@/components/common/SummarySingleCard";
import { useDashboardContext } from "@/components/layouts/DashboardProvider";

interface HrmDashboardClientProps {
    stats: {
        employees: number;
        projects: number;
        completedProjects: number;
        clients: number;
        tickets: number;
        revenue: number;
    };
    upcomingMeetings: any[];
    recentTasks: any[];
}

const HrmDashboardClient = ({ stats, upcomingMeetings, recentTasks }: HrmDashboardClientProps) => {
    const { user } = useDashboardContext();
    const cardsData = [
        {
            iconClass: "fa-users",
            title: "Total Employees",
            value: stats.employees,
            description: "Active Members",
            color: "var(--accent2)"
        },
        {
            iconClass: "fa-briefcase",
            title: "Total Projects",
            value: stats.projects,
            description: "Current Pipeline",
            color: "var(--purple)"
        },
        {
            iconClass: "fa-check-circle",
            title: "Completed",
            value: stats.completedProjects,
            description: "Successfully Delivered",
            color: "var(--green)"
        },
        {
            iconClass: "fa-ticket",
            title: "Support Tickets",
            value: stats.tickets,
            description: "Open Tickets",
            color: "var(--red)",
            isIncrease: false
        },
        {
            iconClass: "fa-user-clock",
            title: "Attendance",
            value: "94%",
            description: "Daily average",
            color: "var(--cyan)"
        },
        {
            iconClass: "fa-file-invoice-dollar",
            title: "Payroll",
            value: "$124K",
            description: "Monthly cycle",
            color: "var(--amber)"
        },
        {
            iconClass: "fa-user-plus",
            title: "Open Vacancies",
            value: "12",
            description: "Recruitment active",
            color: "var(--indigo)"
        },
        {
            iconClass: "fa-graduation-cap",
            title: "Training",
            value: "84%",
            description: "Comp. rate",
            color: "var(--pink)"
        }
    ];

    return (
        <>
            {/* Page Header */}
            <div className="page-header">
                <div className="ph-left">
                    <h1>Hello, <span style={{ color: "var(--accent2)" }}>{user?.firstName || 'there'}</span> 👋</h1>
                    <p>Manage your team, projects, and workflows</p>
                </div>
                <div className="ph-right">
                    <button className="btn-ghost mr-2">
                        <i className="fa-solid fa-file-invoice mr-2"></i> Payroll Report
                    </button>
                    <button className="btn-primary">
                        <i className="fa-solid fa-plus mr-2"></i> Add Employee
                    </button>
                </div>
            </div>

            {/* Quick Actions Bar */}
            <QuickActions />

            <div className="app__slide-wrapper p-6">
                <div className="grid grid-cols-12 gap-5">
                    {/* Stats Cards - 8 Cards */}
                    <div className="col-span-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-2">
                        {cardsData.map((card, index) => (
                            <div key={index}>
                                <SummarySingleCard {...card} />
                            </div>
                        ))}
                    </div>

                    {/* Meeting Schedule & Recent Tasks */}
                    <div className="col-span-12 xxl:col-span-6">
                        <div className="card__wrapper">
                            <div className="flex items-center justify-between mb-6">
                                <h5 className="card__heading-title flex items-center gap-2">
                                    <Calendar size={18} className="text-accent2" /> Upcoming Meetings
                                </h5>
                                <Link href="/calendar" className="btn-ghost py-1 px-3 text-[11px]">View Calendar</Link>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="text-[11px] uppercase tracking-wider text-t3 border-b border-white/5">
                                            <th className="pb-3 font-semibold">Meeting Title</th>
                                            <th className="pb-3 font-semibold">Contact</th>
                                            <th className="pb-3 font-semibold">Time</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-[13px]">
                                        {upcomingMeetings.length === 0 ? (
                                            <tr>
                                                <td colSpan={3} className="py-10 text-center text-t3 uppercase text-[10px] font-bold tracking-widest">No upcoming meetings</td>
                                            </tr>
                                        ) : (
                                            upcomingMeetings.map((meeting, index) => (
                                                <tr key={index} className="border-b border-white/[0.02] last:border-0 hover:bg-white/[0.01]">
                                                    <td className="py-3 font-semibold text-t1">{meeting.title}</td>
                                                    <td className="py-3 text-t2">{meeting.contacts ? `${meeting.contacts.first_name} ${meeting.contacts.last_name}` : 'Unknown'}</td>
                                                    <td className="py-3 text-accent font-space">{format(new Date(meeting.start_time), 'MMM dd, p')}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <div className="col-span-12 xxl:col-span-6">
                        <div className="card__wrapper">
                            <div className="flex items-center justify-between mb-6">
                                <h5 className="card__heading-title flex items-center gap-2">
                                    <Clock size={18} className="text-amber" /> Recent Tasks
                                </h5>
                                <Link href="/projects" className="btn-ghost py-1 px-3 text-[11px]">All Projects</Link>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="text-[11px] uppercase tracking-wider text-t3 border-b border-white/5">
                                            <th className="pb-3 font-semibold">Task Title</th>
                                            <th className="pb-3 font-semibold">Project</th>
                                            <th className="pb-3 font-semibold">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-[13px]">
                                        {recentTasks.length === 0 ? (
                                            <tr>
                                                <td colSpan={3} className="py-10 text-center text-t3 uppercase text-[10px] font-bold tracking-widest">No recent tasks</td>
                                            </tr>
                                        ) : (
                                            recentTasks.map((task, index) => (
                                                <tr key={index} className="border-b border-white/[0.02] last:border-0 hover:bg-white/[0.01]">
                                                    <td className="py-3 font-semibold text-t1">{task.title}</td>
                                                    <td className="py-3 text-t3 text-[11px]">{task.projects?.name || 'N/A'}</td>
                                                    <td className="py-3">
                                                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${task.status === 'done' ? 'bg-green/10 text-green' :
                                                                task.status === 'in_progress' ? 'bg-accent/10 text-accent' :
                                                                    'bg-amber/10 text-amber'
                                                            }`}>
                                                            {task.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default HrmDashboardClient;