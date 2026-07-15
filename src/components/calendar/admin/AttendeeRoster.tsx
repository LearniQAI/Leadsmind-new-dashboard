'use client';

import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Download, User, Mail, Calendar, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface Attendee {
  id: string;
  name: string;
  email: string;
  session_title: string;
  registered_at: string;
  status: 'confirmed' | 'pending' | 'waitlisted';
}

interface AttendeeRosterProps {
  initialAttendees: Attendee[];
}

export function AttendeeRoster({ initialAttendees }: AttendeeRosterProps) {
  const [search, setSearch] = React.useState('');
  const [attendees] = React.useState<Attendee[]>(initialAttendees);

  const filtered = attendees.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.email.toLowerCase().includes(search.toLowerCase()) ||
    a.session_title.toLowerCase().includes(search.toLowerCase())
  );

  const exportToCSV = () => {
    const headers = ['Name', 'Email', 'Session', 'Date', 'Status'];
    const rows = filtered.map(a => [
      a.name,
      a.email,
      a.session_title,
      format(new Date(a.registered_at), 'yyyy-MM-dd'),
      a.status
    ]);

    const csvContent = "data:text/csv;charset=utf-8,"
      + [headers, ...rows].map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `attendee_roster_${format(new Date(), 'yyyyMMdd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Management Toolbar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-[400px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 !text-dash-textMuted" />
          <Input
            placeholder="Search attendees or sessions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11 bg-white border-dash-border !text-dash-text rounded-xl focus:border-dash-accent"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Button variant="outline" className="flex-1 md:flex-none h-11 border-dash-border bg-white !text-dash-textMuted hover:!text-dash-text rounded-xl gap-2 font-bold text-[12px] px-6">
            <Filter className="h-4 w-4" />
            Filters
          </Button>
          <Button
            onClick={exportToCSV}
            className="flex-1 md:flex-none h-11 bg-dash-accent hover:bg-dash-accent/90 text-white rounded-xl gap-2 font-bold text-[12px] px-6 shadow-lg shadow-dash-accent/20 transition-colors motion-reduce:transition-none"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Roster Table Orchestration */}
      <div className="rounded-2xl border border-dash-border bg-white overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-dash-surface">
            <TableRow className="border-dash-border hover:bg-transparent">
              <TableHead className="text-[10px] font-bold !text-dash-textMuted py-4">Attendee</TableHead>
              <TableHead className="text-[10px] font-bold !text-dash-textMuted py-4">Strategic Session</TableHead>
              <TableHead className="text-[10px] font-bold !text-dash-textMuted py-4">Registration</TableHead>
              <TableHead className="text-[10px] font-bold !text-dash-textMuted py-4">Status</TableHead>
              <TableHead className="text-[10px] font-bold !text-dash-textMuted py-4 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-20 opacity-60 italic !text-dash-textMuted">
                  No attendees matching your current criteria.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((attendee) => (
                <TableRow key={attendee.id} className="border-dash-border hover:bg-dash-surface transition-colors motion-reduce:transition-none group">
                  <TableCell className="py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-dash-surface flex items-center justify-center border border-dash-border group-hover:bg-dash-accent/10 group-hover:border-dash-accent/20 transition-all motion-reduce:transition-none">
                        <User className="h-4 w-4 !text-dash-textMuted group-hover:text-dash-accent" />
                      </div>
                      <div>
                        <p className="text-[13px] font-bold !text-dash-text">{attendee.name}</p>
                        <p className="text-[11px] !text-dash-textMuted">{attendee.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <p className="text-[13px] font-bold !text-dash-textMuted">{attendee.session_title}</p>
                  </TableCell>
                  <TableCell className="py-4 !text-dash-textMuted text-[12px] font-medium">
                    {format(new Date(attendee.registered_at), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell className="py-4">
                    <span className={cn(
                      "text-[9px] font-bold px-2.5 py-1 rounded-md border capitalize",
                      attendee.status === 'confirmed' ? "bg-green/5 border-green/10 text-green" :
                      attendee.status === 'pending' ? "bg-amber-50 border-amber-200 text-amber-600" :
                      "bg-dash-surface border-dash-border !text-dash-textMuted"
                    )}>
                      {attendee.status}
                    </span>
                  </TableCell>
                  <TableCell className="py-4 text-right">
                    <Button variant="ghost" className="h-8 w-8 rounded-lg p-0 !text-dash-textMuted hover:!text-dash-text hover:bg-dash-border/60">
                      <Search className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
