import { useState } from 'react';
import CalendarSettingsModal from '../modals/CalendarSettingsModal';
import RoundRobinPoolModal from '../modals/RoundRobinPoolModal';
import ResourceManagerModal from '../modals/ResourceManagerModal';
import { createCalendar, updateCalendar } from '@/app/actions/calendar/calendars';
import { toast } from 'sonner';
import { Building2, Copy, Eye, LayoutGrid, MoreVertical, User, Users, Zap } from 'lucide-react';
import { DashButton } from '@/components/dashboard-ui';

interface CalendarPagesViewProps {
  calendars: any[];
}

export default function CalendarPagesView({ calendars }: CalendarPagesViewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCalendar, setEditingCalendar] = useState<any>(null);
  const [teamCalendar, setTeamCalendar] = useState<any>(null);
  // Task 71 — workspace-wide, not per-calendar, so it's a standalone entry
  // point rather than a per-card button like round-robin's "Manage team".
  const [isResourceModalOpen, setIsResourceModalOpen] = useState(false);

  const copyToClipboard = (slug: string) => {
    const url = `${window.location.origin}/book/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success('Booking link copied to clipboard');
  };

  const handleCreate = () => {
    setEditingCalendar(null);
    setIsModalOpen(true);
  };

  const handleEdit = (cal: any) => {
    setEditingCalendar(cal);
    setIsModalOpen(true);
  };

  const handleSave = async (data: any) => {
    let res;
    if (editingCalendar) {
      res = await updateCalendar(editingCalendar.id, data);
    } else {
      res = await createCalendar(data);
    }

    if (res.success) {
      toast.success(editingCalendar ? 'Engine updated' : 'New engine created successfully');
    } else {
      toast.error(res.error || 'Failed to save engine');
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'personal': return <User size={18} />;
      case 'round_robin': return <Zap size={18} />;
      case 'collective': return <Users size={18} />;
      default: return <LayoutGrid size={18} />;
    }
  };

  return (
    <>
      <div className="flex justify-end mb-5">
        <DashButton variant="secondary" size="sm" onClick={() => setIsResourceModalOpen(true)}>
          <Building2 size={14} /> Rooms, desks &amp; equipment
        </DashButton>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {calendars.map((cal) => (
          <div key={cal.id} className="bg-white border border-dash-border rounded-2xl overflow-hidden shadow-sm hover:border-dash-accent transition-all motion-reduce:transition-none group">
            {/* Engine Preview Header */}
            <div className="h-32 bg-dash-surface flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-dash-accent to-purple opacity-10 group-hover:opacity-20 transition-opacity motion-reduce:transition-none" />
              <div className="w-16 h-16 rounded-2xl bg-white border border-dash-border flex items-center justify-center text-dash-accent shadow-sm relative z-10">
                {getIcon(cal.calendar_type)}
              </div>
            </div>

            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-[16px] font-bold !text-dash-text">{cal.name}</h3>
                  <p className="text-[11px] font-bold !text-dash-textMuted mt-1 capitalize">
                    {cal.calendar_type.replace('_', ' ')} engine
                  </p>
                </div>
                <button
                  onClick={() => handleEdit(cal)}
                  className="p-1.5 !text-dash-textMuted hover:!text-dash-text hover:bg-dash-surface rounded-lg transition-all motion-reduce:transition-none"
                >
                  <MoreVertical size={16} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between text-[12px] font-medium">
                  <span className="!text-dash-textMuted">Duration</span>
                  <span className="!text-dash-text">{cal.slot_duration} Minutes</span>
                </div>
                <div className="flex items-center justify-between text-[12px] font-medium">
                  <span className="!text-dash-textMuted">Meeting Mode</span>
                  <span className="!text-dash-text capitalize">{cal.meeting_mode.replace('_', ' ')}</span>
                </div>
              </div>

              {cal.calendar_type === 'round_robin' && (
                <DashButton variant="secondary" size="sm" onClick={() => setTeamCalendar(cal)} className="mt-5 w-full">
                  <Users size={14} /> Manage team
                </DashButton>
              )}

              <div className="grid grid-cols-2 gap-3 mt-8">
                <DashButton variant="secondary" size="sm" onClick={() => copyToClipboard(cal.slug)}>
                  <Copy size={14} /> Copy link
                </DashButton>
                <DashButton variant="primary" size="sm" onClick={() => window.open(`${window.location.origin}/book/${cal.slug}`, '_blank')}>
                  <Eye size={14} /> Preview
                </DashButton>
              </div>
            </div>

            <div className="px-6 py-3 bg-dash-surface border-t border-dash-border flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green animate-pulse motion-reduce:animate-none" />
                <span className="text-[10px] font-bold !text-dash-textMuted">Active link</span>
              </div>
              <button
                onClick={() => handleEdit(cal)}
                className="text-dash-accent hover:underline text-[10px] font-bold"
              >
                Settings
              </button>
            </div>
          </div>
        ))}

        {/* Create New Engine Card */}
        <div
          onClick={handleCreate}
          className="border-2 border-dashed border-dash-border rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-4 hover:border-dash-accent hover:bg-dash-surface transition-all motion-reduce:transition-none cursor-pointer min-h-[350px] group"
        >
          <div className="w-12 h-12 rounded-full bg-white border border-dash-border flex items-center justify-center !text-dash-textMuted group-hover:text-dash-accent group-hover:border-dash-accent transition-all motion-reduce:transition-none">
            <Zap size={20} />
          </div>
          <div>
            <h4 className="text-[14px] font-bold !text-dash-textMuted group-hover:!text-dash-text">New booking engine</h4>
            <p className="text-[11px] !text-dash-textMuted mt-1 max-w-[200px]">Create a new automated scheduling workflow for your team.</p>
          </div>
        </div>
      </div>

      <CalendarSettingsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        calendar={editingCalendar}
        onSave={handleSave}
      />

      <RoundRobinPoolModal
        isOpen={!!teamCalendar}
        onClose={() => setTeamCalendar(null)}
        calendarId={teamCalendar?.id ?? null}
        calendarName={teamCalendar?.name ?? ''}
      />

      <ResourceManagerModal isOpen={isResourceModalOpen} onClose={() => setIsResourceModalOpen(false)} />
    </>
  );
}
