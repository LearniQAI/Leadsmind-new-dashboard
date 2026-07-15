"use client";
import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Bell, X, CheckCircle2, Zap, Settings, Inbox, Archive, Check, DollarSign, User, Globe, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

type TNotificationProps = {
  handleShowNotification: () => void;
  isOpenNotification: boolean;
};

type TabType = 'All' | 'CRM' | 'Websites' | 'Automations' | 'System';

function formatTimeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

// Helper to group by date
function getGroupingLabel(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0 && date.getDate() === now.getDate()) return 'Today';
  if (diffDays === 1 || (diffDays === 0 && date.getDate() !== now.getDate())) return 'Yesterday';
  return 'Earlier This Week';
}

const Notification = ({ handleShowNotification, isOpenNotification }: TNotificationProps) => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<TabType>('All');

  useEffect(() => {
    const supabase = createClient();
    let userChannel: any;

    async function initNotifications() {
      if (userChannel) {
        supabase.removeChannel(userChannel);
        userChannel = null;
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('[Notification] Error fetching notifications:', error);
      } else if (data) {
        setNotifications(data);
      }
      setLoading(false);

      userChannel = supabase
        .channel(`user_db_notifications_${user.id}_${Math.random().toString(36).substring(7)}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              setNotifications((prev) => [payload.new, ...prev]);
              toast.info(payload.new.title, { description: payload.new.message });
            } else if (payload.eventType === 'UPDATE') {
              setNotifications((prev) => prev.map((n) => (n.id === payload.new.id ? payload.new : n)));
            } else if (payload.eventType === 'DELETE') {
              setNotifications((prev) => prev.filter((n) => n.id !== payload.old.id));
            }
          }
        )
        .subscribe();
    }

    initNotifications();

    return () => {
      if (userChannel) supabase.removeChannel(userChannel);
    };
  }, []);

  const handleMarkAllRead = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);

    if (error) {
      toast.error('Failed to mark notifications as read');
    } else {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      toast.success('All notifications marked as read');
    }
  };

  const handleMarkAsRead = async (id: string) => {
    setNotifications((prev) => prev.map(n => n.id === id ? { ...n, read: true } : n));
    const supabase = createClient();
    await supabase.from('notifications').update({ read: true }).eq('id', id);
  };

  const handleArchive = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setNotifications((prev) => prev.filter(n => n.id !== id));
    const supabase = createClient();
    await supabase.from('notifications').delete().eq('id', id);
    toast.success('Notification archived');
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const filteredNotifications = useMemo(() => {
    if (activeTab === 'All') return notifications;
    return notifications.filter(n => {
      if (activeTab === 'CRM' && (n.type === 'contact' || n.type === 'deal')) return true;
      if (activeTab === 'Websites' && n.type === 'website') return true;
      if (activeTab === 'Automations' && (n.type === 'automation' || n.type === 'message')) return true;
      if (activeTab === 'System' && n.type === 'system') return true;
      return false;
    });
  }, [notifications, activeTab]);

  const groupedNotifications = useMemo(() => {
    const groups: Record<string, typeof notifications> = { 'Today': [], 'Yesterday': [], 'Earlier This Week': [] };
    filteredNotifications.forEach(n => {
      const label = getGroupingLabel(n.created_at);
      if (groups[label]) groups[label].push(n);
    });
    return groups;
  }, [filteredNotifications]);

  const renderIcon = (type: string, isRead: boolean) => {
    // Rich notification icons based on type
    if (type === 'deal' || type === 'invoice') {
      return <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isRead ? 'bg-slate-100' : 'bg-green-100'} !text-green-600`}><DollarSign size={14} /></div>;
    }
    if (type === 'contact') {
      return <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isRead ? 'bg-slate-100' : 'bg-blue-100'} !text-blue-600`}><User size={14} /></div>;
    }
    if (type === 'website') {
      return <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isRead ? 'bg-slate-100' : 'bg-purple-100'} !text-purple-600`}><Globe size={14} /></div>;
    }
    if (type === 'system') {
      return <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isRead ? 'bg-slate-100' : 'bg-orange-100'} !text-orange-600`}><AlertCircle size={14} /></div>;
    }
    return <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isRead ? 'bg-slate-100' : 'bg-slate-200'} !text-slate-600`}><Zap size={14} /></div>;
  };

  return (
    <div className="relative">
      <button
        onClick={handleShowNotification}
        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95 relative group ${
          isOpenNotification ? 'bg-primary/10 !text-primary' : '!text-slate-500 hover:!text-slate-800 hover:bg-slate-50'
        }`}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white group-hover:scale-110 transition-transform"></span>
        )}
      </button>

      <AnimatePresence>
        {isOpenNotification && (
          <>
            <div className="fixed inset-0 z-40" onClick={handleShowNotification} />
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -10 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="absolute top-full right-0 mt-3 w-[400px] bg-white border border-dash-border rounded-[20px] shadow-[0_28px_64px_rgba(15,23,42,0.18)] z-50 overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="px-5 pt-4 pb-3 border-b border-[#EEF2F7] bg-white flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h5 className="text-[14px] font-bold !text-slate-800">Notifications</h5>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-red-50 !text-red-600 text-[10px] font-bold">{unreadCount} unread</span>
                    )}
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full ml-1" title="Live Updates"></div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={handleMarkAllRead}
                      className="p-1.5 hover:bg-slate-50 rounded-lg !text-slate-400 hover:!text-slate-700 transition-colors"
                      title="Mark all read"
                    >
                      <CheckCircle2 size={16} />
                    </button>
                    <button className="p-1.5 hover:bg-slate-50 rounded-lg !text-slate-400 hover:!text-slate-700 transition-colors">
                      <Settings size={16} />
                    </button>
                    <button 
                      onClick={handleShowNotification}
                      className="p-1.5 hover:bg-slate-50 rounded-lg !text-slate-400 hover:!text-slate-700 transition-colors ml-1"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar bg-dash-surface border border-dash-border p-1 rounded-xl">
                  {(['All', 'CRM', 'Websites', 'Automations', 'System'] as TabType[]).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-3 py-1.5 rounded-lg text-[12px] font-bold whitespace-nowrap transition-all motion-reduce:transition-none ${
                        activeTab === tab ? 'bg-white !text-dash-accent shadow-sm' : '!text-dash-textMuted hover:!text-dash-text'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notification List */}
              <div className="common-scrollbar max-h-[440px] overflow-y-auto bg-white">
                {loading ? (
                  <div className="py-16 flex flex-col items-center justify-center text-center">
                    <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin mb-3"></div>
                    <p className="!text-slate-400 text-[12px] font-medium">Loading activity...</p>
                  </div>
                ) : filteredNotifications.length === 0 ? (
                  <div className="py-20 flex flex-col items-center justify-center text-center px-6">
                    <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mb-4 !text-slate-300">
                      <Inbox size={24} />
                    </div>
                    <h4 className="!text-slate-800 font-bold text-[14px]">You're all caught up 🎉</h4>
                    <p className="!text-slate-500 text-[12px] mt-1">No new activity in your workspace.</p>
                  </div>
                ) : (
                  <div className="pb-2">
                    {Object.entries(groupedNotifications).map(([groupLabel, groupItems]) => {
                      if (groupItems.length === 0) return null;
                      return (
                        <div key={groupLabel} className="mb-2">
                          <div className="px-5 py-2 sticky top-0 bg-dash-surface/90 backdrop-blur border-y border-dash-border/60 z-10">
                            <span className="text-[10px] font-bold !text-slate-500 uppercase tracking-wider">{groupLabel}</span>
                          </div>
                          <div>
                            {groupItems.map((notification) => {
                              const isNew = !notification.read;
                              return (
                                <div
                                  key={notification.id}
                                  className={`group relative flex items-start gap-3.5 px-5 py-3 transition-colors ${
                                    isNew ? 'bg-dash-accent/[0.05] border-l-4 border-l-dash-accent' : 'bg-white border-l-4 border-l-transparent hover:bg-slate-50'
                                  }`}
                                  onMouseEnter={() => { if(isNew) handleMarkAsRead(notification.id) }}
                                >
                                  {renderIcon(notification.type, !isNew)}
                                  
                                  <div className="flex-1 min-w-0 pt-0.5">
                                    <div className="flex items-center justify-between gap-2 mb-0.5">
                                      <p className={`text-[13px] font-semibold truncate ${isNew ? '!text-slate-900' : '!text-slate-700'}`}>
                                        {notification.title || notification.type}
                                      </p>
                                      <span className="text-[10px] !text-slate-400 whitespace-nowrap font-medium flex-shrink-0">
                                        {formatTimeAgo(notification.created_at)}
                                      </span>
                                    </div>
                                    <p className={`text-[12px] leading-snug line-clamp-2 ${isNew ? '!text-slate-600' : '!text-slate-500'}`}>
                                      {notification.message}
                                    </p>
                                    
                                    {/* Action buttons on hover */}
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-white shadow-sm border border-slate-200 rounded-lg p-1">
                                      {notification.link && (
                                        <Link 
                                          href={notification.link}
                                          onClick={handleShowNotification}
                                          className="px-2 py-1 hover:bg-slate-50 rounded text-[10px] font-bold !text-slate-600 uppercase tracking-wider"
                                        >
                                          Open
                                        </Link>
                                      )}
                                      {!isNew && (
                                        <button 
                                          onClick={(e) => handleMarkAsRead(notification.id)}
                                          className="p-1 hover:bg-slate-50 rounded !text-slate-400 hover:!text-emerald-600 transition-colors"
                                          title="Mark read"
                                        >
                                          <Check size={14} />
                                        </button>
                                      )}
                                      <button 
                                        onClick={(e) => handleArchive(notification.id, e)}
                                        className="p-1 hover:bg-slate-50 rounded !text-slate-400 hover:!text-red-500 transition-colors"
                                        title="Archive"
                                      >
                                        <Archive size={14} />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-3 border-t border-[#EEF2F7] bg-slate-50/50">
                <Link 
                  href="/activities"
                  onClick={handleShowNotification}
                  className="flex items-center justify-center py-2 w-full rounded-xl text-[12px] font-semibold !text-slate-600 hover:!text-slate-900 hover:bg-slate-100 transition-colors"
                >
                  View All Notifications →
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Notification;
