"use client";
import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Bell,
  X,
  Zap,
  Inbox,
  Archive,
  Check,
  DollarSign,
  User,
  Globe,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

type TNotificationProps = {
  handleShowNotification: () => void;
  isOpenNotification: boolean;
};

type TabType = "All" | "CRM" | "Websites" | "Automations" | "System";

function formatTimeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function getGroupingLabel(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0 && date.getDate() === now.getDate()) return "Today";
  if (diffDays === 1 || (diffDays === 0 && date.getDate() !== now.getDate())) return "Yesterday";
  return "Earlier this week";
}

const ICON_TONES: Record<string, { on: string; icon: React.ComponentType<any> }> = {
  deal: { on: "bg-emerald-50 text-emerald-600 ring-emerald-500/15", icon: DollarSign },
  invoice: { on: "bg-emerald-50 text-emerald-600 ring-emerald-500/15", icon: DollarSign },
  contact: { on: "bg-sky-50 text-sky-600 ring-sky-500/15", icon: User },
  website: { on: "bg-violet-50 text-violet-600 ring-violet-500/15", icon: Globe },
  system: { on: "bg-amber-50 text-amber-600 ring-amber-500/15", icon: AlertCircle },
};

const Notification = ({ handleShowNotification, isOpenNotification }: TNotificationProps) => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<TabType>("All");

  useEffect(() => {
    const supabase = createClient();
    let userChannel: any;

    async function initNotifications() {
      if (userChannel) {
        supabase.removeChannel(userChannel);
        userChannel = null;
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) {
        console.error("[Notification] Error fetching notifications:", error);
      } else if (data) {
        setNotifications(data);
      }
      setLoading(false);

      userChannel = supabase
        .channel(`user_db_notifications_${user.id}_${Math.random().toString(36).substring(7)}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
          (payload) => {
            if (payload.eventType === "INSERT") {
              setNotifications((prev) => [payload.new, ...prev]);
              toast.info(payload.new.title, { description: payload.new.message });
            } else if (payload.eventType === "UPDATE") {
              setNotifications((prev) => prev.map((n) => (n.id === payload.new.id ? payload.new : n)));
            } else if (payload.eventType === "DELETE") {
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
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);

    if (error) {
      toast.error("Failed to mark notifications as read");
    } else {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      toast.success("All notifications marked as read");
    }
  };

  const handleMarkAsRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    const supabase = createClient();
    await supabase.from("notifications").update({ read: true }).eq("id", id);
  };

  const handleArchive = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    const supabase = createClient();
    await supabase.from("notifications").delete().eq("id", id);
    toast.success("Notification archived");
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const filteredNotifications = useMemo(() => {
    if (activeTab === "All") return notifications;
    return notifications.filter((n) => {
      if (activeTab === "CRM" && (n.type === "contact" || n.type === "deal")) return true;
      if (activeTab === "Websites" && n.type === "website") return true;
      if (activeTab === "Automations" && (n.type === "automation" || n.type === "message")) return true;
      if (activeTab === "System" && n.type === "system") return true;
      return false;
    });
  }, [notifications, activeTab]);

  const groupedNotifications = useMemo(() => {
    const groups: Record<string, typeof notifications> = {
      Today: [],
      Yesterday: [],
      "Earlier this week": [],
    };
    filteredNotifications.forEach((n) => {
      const label = getGroupingLabel(n.created_at);
      if (groups[label]) groups[label].push(n);
    });
    return groups;
  }, [filteredNotifications]);

  const renderIcon = (type: string, isRead: boolean) => {
    const tone = ICON_TONES[type];
    const Icon = tone?.icon ?? Zap;
    return (
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset [&_svg]:size-[15px] ${
          isRead || !tone ? "bg-slate-100 text-slate-500 ring-slate-500/10" : tone.on
        }`}
      >
        <Icon />
      </span>
    );
  };

  return (
    <div className="relative">
      <button
        onClick={handleShowNotification}
        aria-label="Notifications"
        className={`group relative flex h-9 w-9 items-center justify-center rounded-xl transition-all active:scale-95 ${
          isOpenNotification
            ? "bg-sky-50 text-sky-600 ring-1 ring-inset ring-sky-500/20"
            : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
        }`}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border-2 border-white bg-rose-500 transition-transform group-hover:scale-110" />
        )}
      </button>

      <AnimatePresence>
        {isOpenNotification && (
          <>
            <div className="fixed inset-0 z-40" onClick={handleShowNotification} />
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -8 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="absolute right-0 top-full z-50 mt-3 flex w-[400px] flex-col overflow-hidden rounded-2xl border border-dash-border bg-white shadow-[0_24px_64px_-16px_rgba(15,23,42,0.28)]"
            >
              {/* Header */}
              <div className="flex flex-col gap-3.5 border-b border-dash-border px-5 pb-3.5 pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h5 className="font-display text-[15px] font-semibold tracking-[-0.01em] text-dash-text">
                      Notifications
                    </h5>
                    {unreadCount > 0 && (
                      <span className="rounded-full bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold text-sky-700">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="rounded-md px-2 py-1 text-[12px] font-semibold text-sky-600 transition-colors hover:bg-sky-50"
                      >
                        Mark all read
                      </button>
                    )}
                    <button
                      onClick={handleShowNotification}
                      aria-label="Close"
                      className="rounded-lg p-1.5 text-dash-textMuted transition-colors hover:bg-dash-surface hover:text-dash-text"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>

                {/* Tabs */}
                <div className="no-scrollbar flex items-center gap-1 overflow-x-auto rounded-xl bg-dash-surface p-1">
                  {(["All", "CRM", "Websites", "Automations", "System"] as TabType[]).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-all motion-reduce:transition-none ${
                        activeTab === tab
                          ? "bg-white text-sky-700 shadow-sm ring-1 ring-inset ring-black/5"
                          : "text-dash-textMuted hover:text-dash-text"
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              {/* List */}
              <div className="common-scrollbar max-h-[440px] overflow-y-auto bg-white">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="mb-3 h-6 w-6 animate-spin rounded-full border-2 border-sky-500/25 border-t-sky-500" />
                    <p className="text-[12px] font-medium text-dash-textMuted">Loading activity…</p>
                  </div>
                ) : filteredNotifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-dash-border bg-dash-surface text-dash-textMuted">
                      <Inbox size={22} />
                    </div>
                    <h4 className="text-[14px] font-semibold text-dash-text">You’re all caught up</h4>
                    <p className="mt-1 text-[12px] text-dash-textMuted">
                      No {activeTab === "All" ? "" : `${activeTab.toLowerCase()} `}activity to show.
                    </p>
                  </div>
                ) : (
                  Object.entries(groupedNotifications).map(([groupLabel, groupItems]) => {
                    if (groupItems.length === 0) return null;
                    return (
                      <div key={groupLabel}>
                        <div className="sticky top-0 z-10 bg-white/95 px-5 pb-1.5 pt-3.5 backdrop-blur">
                          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-dash-textMuted">
                            {groupLabel}
                          </span>
                        </div>
                        <div className="divide-y divide-dash-border">
                          {groupItems.map((notification) => {
                            const isNew = !notification.read;
                            return (
                              <div
                                key={notification.id}
                                className={`group relative flex items-start gap-3 px-5 py-3.5 transition-colors hover:bg-dash-surface/60 ${
                                  isNew ? "bg-sky-50/40" : ""
                                }`}
                                onMouseEnter={() => {
                                  if (isNew) handleMarkAsRead(notification.id);
                                }}
                              >
                                {isNew && (
                                  <span className="absolute left-0 top-0 h-full w-[3px] bg-sky-500" />
                                )}
                                {renderIcon(notification.type, !isNew)}

                                <div className="min-w-0 flex-1">
                                  <div className="flex items-start justify-between gap-3">
                                    <p className="text-[13px] font-semibold text-dash-text">
                                      {notification.title || notification.type}
                                    </p>
                                    {isNew && (
                                      <span className="shrink-0 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-700">
                                        New
                                      </span>
                                    )}
                                  </div>
                                  <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-dash-textMuted">
                                    {notification.message}
                                  </p>
                                  <span className="mt-1 block text-[11px] font-medium text-dash-textMuted/70">
                                    {formatTimeAgo(notification.created_at)}
                                  </span>
                                </div>

                                {/* Hover actions */}
                                <div className="absolute right-4 top-3.5 flex items-center gap-0.5 rounded-lg border border-dash-border bg-white p-0.5 opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
                                  {notification.link && (
                                    <Link
                                      href={notification.link}
                                      onClick={handleShowNotification}
                                      className="rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-dash-textMuted hover:bg-dash-surface hover:text-dash-text"
                                    >
                                      Open
                                    </Link>
                                  )}
                                  {!isNew && (
                                    <button
                                      onClick={() => handleMarkAsRead(notification.id)}
                                      className="rounded-md p-1 text-dash-textMuted transition-colors hover:bg-dash-surface hover:text-emerald-600"
                                      title="Mark read"
                                    >
                                      <Check size={14} />
                                    </button>
                                  )}
                                  <button
                                    onClick={(e) => handleArchive(notification.id, e)}
                                    className="rounded-md p-1 text-dash-textMuted transition-colors hover:bg-dash-surface hover:text-rose-500"
                                    title="Archive"
                                  >
                                    <Archive size={14} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-dash-border p-2.5">
                <Link
                  href="/activities"
                  onClick={handleShowNotification}
                  className="group flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-[12px] font-semibold text-dash-textMuted transition-colors hover:bg-dash-surface hover:text-dash-text"
                >
                  View all notifications
                  <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
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
