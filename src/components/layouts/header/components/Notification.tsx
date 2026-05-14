"use client";
import React from "react";
import Link from "next/link";
import { Bell, X, Activity, ArrowUpRight, Zap } from "lucide-react";
import { notificationsData } from "@/data/notification-data";

type TNotificationProps = {
  handleShowNotification: () => void;
  isOpenNotification: boolean;
};

const Notification = ({ handleShowNotification, isOpenNotification }: TNotificationProps) => {
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
        <span className="absolute top-2 right-2 w-2 h-2 bg-green rounded-full border-2 border-n800 group-hover:scale-110 transition-transform"></span>
      </button>

      {/* Dropdown */}
      {isOpenNotification && (
        <>
          <div className="fixed inset-0 z-40" onClick={handleShowNotification} />
          <div className="absolute top-full right-0 mt-3 w-[360px] bg-[#080f28] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-white/[0.01]">
              <div className="flex flex-col">
                <h5 className="text-[13px] font-bold text-t1 flex items-center gap-2 uppercase tracking-tight font-space">
                  <Activity size={14} className="text-green" /> Notifications <span className="text-green">({notificationsData.length})</span>
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
              {notificationsData.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-center mb-3 text-t4 opacity-20">
                    <Zap size={24} />
                  </div>
                  <p className="text-t3 text-[11px] font-bold uppercase tracking-widest">No new alerts</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {notificationsData.map((notification, index) => {
                    const isNew = index < 2;
                    return (
                      <Link
                        key={notification.id}
                        href={`/activities`}
                        onClick={handleShowNotification}
                        className={`flex items-center gap-3 p-3 rounded-xl transition-all group relative overflow-hidden ${
                          isNew ? 'bg-white/[0.02]' : 'hover:bg-white/[0.03]'
                        } border border-transparent hover:border-white/5`}
                      >
                        {isNew && (
                          <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-green"></div>
                        )}
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          notification.category === 'Lead' ? 'bg-cyan/10 text-cyan' : 'bg-purple/10 text-purple'
                        }`}>
                          <Zap size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className={`text-[9px] font-black tracking-[0.1em] px-1.5 py-0.5 rounded uppercase font-space ${
                              notification.category === 'Lead' ? 'bg-cyan/20 text-cyan' : 'bg-purple/20 text-purple'
                            }`}>
                              {notification.category}
                            </span>
                            <span className="text-[9px] text-t4 font-bold uppercase tracking-tighter">
                              {notification.time}
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
              <Link 
                href="/activities" 
                onClick={handleShowNotification}
                className="flex items-center justify-center gap-2 py-2 w-full rounded-xl bg-white/5 hover:bg-green/10 hover:text-green text-white text-[11px] font-bold uppercase tracking-widest transition-all shadow-sm border border-transparent hover:border-green/20"
              >
                Mark All as Read
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Notification;
