import { useState } from 'react';
import CalendarSettingsModal from '../modals/CalendarSettingsModal';
import { createCalendar, updateCalendar } from '@/app/actions/calendar/calendars';
import { toast } from 'sonner';
import { Copy, Eye, LayoutGrid, MoreVertical, User, Users, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CalendarPagesViewProps {
  calendars: any[];
}

export default function CalendarPagesView({ calendars }: CalendarPagesViewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCalendar, setEditingCalendar] = useState<any>(null);

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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {calendars.map((cal) => (
          <div key={cal.id} className="bg-[var(--card)] border border-[var(--bdr)] rounded-[var(--r16)] overflow-hidden shadow-xl hover:border-[var(--accent)] transition-all group">
            {/* Engine Preview Header */}
            <div className="h-32 bg-[var(--n900)] flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent)] to-[var(--purple)] opacity-10 group-hover:opacity-20 transition-opacity" />
              <div className="w-16 h-16 rounded-2xl bg-[var(--n800)] border border-[var(--bdr)] flex items-center justify-center text-[var(--accent2)] shadow-2xl relative z-10">
                {getIcon(cal.calendar_type)}
              </div>
            </div>

            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-[16px] font-bold font-['Space_Grotesk'] text-[var(--t1)]">{cal.name}</h3>
                  <p className="text-[11px] font-black text-[var(--t4)] uppercase tracking-widest mt-1">
                    {cal.calendar_type.replace('_', ' ')} ENGINE
                  </p>
                </div>
                <button
                  onClick={() => handleEdit(cal)}
                  className="p-1.5 text-[var(--t4)] hover:text-[var(--t1)] hover:bg-[var(--n700)] rounded-[var(--r8)] transition-all"
                >
                  <MoreVertical size={16} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between text-[12px] font-medium">
                  <span className="text-[var(--t3)]">Duration</span>
                  <span className="text-[var(--t1)]">{cal.slot_duration} Minutes</span>
                </div>
                <div className="flex items-center justify-between text-[12px] font-medium">
                  <span className="text-[var(--t3)]">Meeting Mode</span>
                  <span className="text-[var(--t1)] uppercase tracking-tighter">{cal.meeting_mode.replace('_', ' ')}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-8">
                <Button
                  variant="outline"
                  onClick={() => copyToClipboard(cal.slug)}
                  className="bg-[var(--n900)] border-[var(--bdr)] text-[var(--t2)] text-[11px] font-bold uppercase tracking-widest h-10"
                >
                  <Copy size={14} className="mr-2" /> Copy Link
                </Button>
                <Button 
                  onClick={() => window.open(`${window.location.origin}/book/${cal.slug}`, '_blank')}
                  className="bg-[var(--accent)] hover:bg-[var(--accent2)] text-white text-[11px] font-bold uppercase tracking-widest h-10"
                >
                  <Eye size={14} className="mr-2" /> Preview
                </Button>
              </div>
            </div>

            <div className="px-6 py-3 bg-[var(--n900)] bg-opacity-50 border-t border-[var(--bdr)] flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)] animate-pulse" />
                <span className="text-[10px] font-bold text-[var(--t3)] uppercase">Active Link</span>
              </div>
              <button
                onClick={() => handleEdit(cal)}
                className="text-[var(--accent2)] hover:underline text-[10px] font-black uppercase tracking-widest"
              >
                Settings
              </button>
            </div>
          </div>
        ))}

        {/* Create New Engine Card */}
        <div
          onClick={handleCreate}
          className="border-2 border-dashed border-[var(--bdr)] rounded-[var(--r16)] p-6 flex flex-col items-center justify-center text-center gap-4 hover:border-[var(--accent)] hover:bg-[rgba(255,255,255,0.01)] transition-all cursor-pointer min-h-[350px] group"
        >
          <div className="w-12 h-12 rounded-full bg-[var(--n800)] border border-[var(--bdr)] flex items-center justify-center text-[var(--t4)] group-hover:text-[var(--accent2)] group-hover:border-[var(--accent)] transition-all">
            <Zap size={20} />
          </div>
          <div>
            <h4 className="text-[14px] font-bold text-[var(--t2)] group-hover:text-[var(--t1)]">New Booking Engine</h4>
            <p className="text-[11px] text-[var(--t4)] mt-1 max-w-[200px]">Create a new automated scheduling workflow for your team.</p>
          </div>
        </div>
      </div>

      <CalendarSettingsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        calendar={editingCalendar}
        onSave={handleSave}
      />
    </>
  );
}
