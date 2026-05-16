'use client';

import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Download, User, Mail, Calendar, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

/**
 * --- LEAMSMIND ATTENDEE ROSTER ---
 * Professional administrative view for session management and reporting.
 */

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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#4a5a82]" />
          <Input
            placeholder="Search attendees or sessions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11 bg-[#080f28]/60 border-white/5 text-[#eef2ff] rounded-xl focus:border-[#2563eb]/50"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Button variant="outline" className="flex-1 md:flex-none h-11 border-white/5 bg-white/[0.02] text-[#94a3c8] hover:text-[#eef2ff] rounded-xl gap-2 font-bold text-[12px] uppercase tracking-widest px-6">
            <Filter className="h-4 w-4" />
            Filters
          </Button>
          <Button 
            onClick={exportToCSV}
            className="flex-1 md:flex-none h-11 bg-[#2563eb] hover:bg-[#2563eb]/90 text-white rounded-xl gap-2 font-bold text-[12px] uppercase tracking-widest px-6 shadow-lg shadow-[#2563eb]/20"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Roster Table Orchestration */}
      <div className="rounded-2xl border border-white/5 bg-[#080f28]/40 overflow-hidden">
        <Table>
          <TableHeader className="bg-white/[0.02]">
            <TableRow className="border-white/5 hover:bg-transparent">
              <TableHead className="text-[10px] font-bold text-[#4a5a82] uppercase tracking-widest py-4">Attendee</TableHead>
              <TableHead className="text-[10px] font-bold text-[#4a5a82] uppercase tracking-widest py-4">Strategic Session</TableHead>
              <TableHead className="text-[10px] font-bold text-[#4a5a82] uppercase tracking-widest py-4">Registration</TableHead>
              <TableHead className="text-[10px] font-bold text-[#4a5a82] uppercase tracking-widest py-4">Status</TableHead>
              <TableHead className="text-[10px] font-bold text-[#4a5a82] uppercase tracking-widest py-4 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-20 opacity-40 italic text-[#4a5a82]">
                  No attendees matching your current criteria.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((attendee) => (
                <TableRow key={attendee.id} className="border-white/5 hover:bg-white/[0.02] transition-colors group">
                  <TableCell className="py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/5 group-hover:bg-[#2563eb]/10 group-hover:border-[#2563eb]/20 transition-all">
                        <User className="h-4 w-4 text-[#4a5a82] group-hover:text-[#3b82f6]" />
                      </div>
                      <div>
                        <p className="text-[13px] font-bold text-[#eef2ff]">{attendee.name}</p>
                        <p className="text-[11px] text-[#4a5a82]">{attendee.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <p className="text-[13px] font-bold text-[#94a3c8] font-space">{attendee.session_title}</p>
                  </TableCell>
                  <TableCell className="py-4 text-[#4a5a82] text-[12px] font-medium">
                    {format(new Date(attendee.registered_at), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell className="py-4">
                    <span className={cn(
                      "text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md border",
                      attendee.status === 'confirmed' ? "bg-[#10b981]/5 border-[#10b981]/10 text-[#10b981]" :
                      attendee.status === 'pending' ? "bg-[#f59e0b]/5 border-[#f59e0b]/10 text-[#f59e0b]" :
                      "bg-white/5 border-white/10 text-[#4a5a82]"
                    )}>
                      {attendee.status}
                    </span>
                  </TableCell>
                  <TableCell className="py-4 text-right">
                    <Button variant="ghost" className="h-8 w-8 rounded-lg p-0 text-[#4a5a82] hover:text-[#eef2ff] hover:bg-white/10">
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
