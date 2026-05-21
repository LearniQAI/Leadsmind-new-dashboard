"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, X, Activity, ArrowUpRight, Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

type TNotificationProps = {
  handleShowNotification: () => void;
  isOpenNotification: boolean;
};

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

const Notification = ({ handleShowNotification, isOpenNotification }: TNotificationProps) => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const supabase = createClient();
    let userChannel: any;

    async function initNotifications() {
      // If a channel already exists (e.g., component re‑mounted), remove it before creating a new one
      if (userChannel) {
        supabase.removeChannel(userChannel);
        userChannel = null;
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch initial user notifications from database
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('[Notification] Error fetching notifications:', error);
      } else if (data) {
        setNotifications(data);
      }
      setLoading(false);

      // Subscribe to real-time updates for public.notifications table
      userChannel = supabase
        .channel(`user_db_notifications_${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              setNotifications((prev) => [payload.new, ...prev]);
              toast.info(`Notification: ${payload.new.title}`, {
                description: payload.new.message,
                action: payload.new.link ? {
                  label: "View",
                  onClick: () => window.location.href = payload.new.link
                } : undefined
              });
            } else if (payload.eventType === 'UPDATE') {
              setNotifications((prev) =>
                prev.map((n) => (n.id === payload.new.id ? payload.new : n))
              );
            } else if (payload.eventType === 'DELETE') {
              setNotifications((prev) =>
                prev.filter((n) => n.id !== payload.old.id)
              );
            }
          }
        )
        .subscribe();
    }

    initNotifications();

    return () => {
      if (userChannel) {
        supabase.removeChannel(userChannel);
      }
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
      console.error('[Notification] Error marking all as read:', error);
      toast.error('Failed to mark notifications as read');
    } else {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      toast.success('All notifications marked as read');
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="relative">
      {/* Clickable Icon */}
      <button
        onClick={handleShowNotification}
        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all relative group ${
          isOpenNotification ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'text-t2 hover:text-t1 hover:bg-white/[0.05]'
        }`}
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 w-2 h-2 bg-green rounded-full border-2 border-n800 group-hover:scale-110 transition-transform"></span>
        )}
      </button>

      {/* Dropdown */}
      {isOpenNotification && (
        <>
          <div className="fixed inset-0 z-40" onClick={handleShowNotification} />
          <div className="absolute top-full right-0 mt-3 w-[360px] bg-[#080f28] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-white/[0.01]">
              <div className="flex flex-col">
                <h5 className="text-[13px] font-bold text-t1 flex items-center gap-2 uppercase tracking-tight font-space">
                  <Activity size={14} className="text-green" /> Notifications <span className="text-green">({unreadCount})</span>
                </h5>
                <p className="text-[9px] text-t3 uppercase font-black tracking-widest mt-0.5">System Alerts</p>
              </div>
              <button 
                onClick={handleShowNotification}
                className="p-1 hover:bg-white/5 rounded-lg text-t3 hover:text-t1"
              >
                <X size={16} />
              </button>
            </div>

            <div className="common-scrollbar max-h-[420px] overflow-y-auto p-2 bg-[#080f28]">
              {loading ? (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <p className="text-t3 text-[11px] font-bold uppercase tracking-widest animate-pulse">Loading alerts...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-center mb-3 text-t4 opacity-20">
                    <Zap size={24} />
                  </div>
                  <p className="text-t3 text-[11px] font-bold uppercase tracking-widest">No new alerts</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {notifications.map((notification) => {
                    const isNew = !notification.read;
                    
                    // Style by notification type
                    let typeColors = 'bg-purple/10 text-purple';
                    let tagColors = 'bg-purple/20 text-purple';
                    if (notification.type === 'message') {
                      typeColors = 'bg-cyan/10 text-cyan';
                      tagColors = 'bg-cyan/20 text-cyan';
                    } else if (notification.type === 'contact') {
                      typeColors = 'bg-green/10 text-green';
                      tagColors = 'bg-green/20 text-green';
                    } else if (notification.type === 'deal') {
                      typeColors = 'bg-amber-500/10 text-amber-500';
                      tagColors = 'bg-amber-500/20 text-amber-500';
                    } else if (notification.type === 'system') {
                      typeColors = 'bg-rose-500/10 text-rose-500';
                      tagColors = 'bg-rose-500/20 text-rose-500';
                    }

                    return (
                      <Link
                        key={notification.id}
                        href={notification.link || `/activities`}
                        onClick={handleShowNotification}
                        className={`flex items-center gap-3 p-3 rounded-xl transition-all group relative overflow-hidden ${
                          isNew ? 'bg-white/[0.02]' : 'hover:bg-white/[0.03]'
                        } border border-transparent hover:border-white/5`}
                      >
                        {isNew && (
                          <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-green"></div>
                        )}
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${typeColors}`}>
                          <Zap size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className={`text-[9px] font-black tracking-[0.1em] px-1.5 py-0.5 rounded uppercase font-space ${tagColors}`}>
                              {notification.type || 'system'}
                            </span>
                            <span className="text-[9px] text-t4 font-bold uppercase tracking-tighter">
                              {formatTimeAgo(notification.created_at)}
                            </span>
                          </div>
                          <p className="text-[12px] text-t3 line-clamp-1 group-hover:text-t2 transition-colors">
                            {notification.message}
                          </p>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <ArrowUpRight size={12} className="text-t4" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-3 border-t border-white/5 bg-[#080f28]">
              <button 
                onClick={handleMarkAllRead}
                className="flex items-center justify-center gap-2 py-2 w-full rounded-xl bg-white/5 hover:bg-green/10 hover:text-green text-white text-[11px] font-bold uppercase tracking-widest transition-all shadow-sm border border-transparent hover:border-green/20"
              >
                Mark All as Read
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Notification;
