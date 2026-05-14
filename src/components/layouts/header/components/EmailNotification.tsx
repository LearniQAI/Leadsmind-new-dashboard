"use client";
import Link from 'next/link';
import React from 'react';
import { MessageSquare, X, Mail, ArrowRight } from 'lucide-react';
import { emailNotifications } from '@/data/notification-data';

type TEmailProps = {
  handleShowNotificationEmail: () => void;
  isOpenEmail: boolean
}

const EmailNotification = ({ handleShowNotificationEmail, isOpenEmail }: TEmailProps) => {
  return (
    <div className="relative">
      {/* Clickable Icon */}
      <button
        onClick={handleShowNotificationEmail}
        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all relative group ${
          isOpenEmail ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'text-t2 hover:text-t1 hover:bg-white/[0.05]'
        }`}
      >
        <MessageSquare size={16} />
        <span className="absolute top-2 right-2 w-2 h-2 bg-accent2 rounded-full border-2 border-n900 group-hover:scale-110 transition-transform"></span>
      </button>

      {/* Dropdown */}
      {isOpenEmail && (
        <>
          <div className="fixed inset-0 z-40" onClick={handleShowNotificationEmail} />
          <div className="absolute top-full right-0 mt-3 w-[360px] bg-[#080f28] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-white/[0.01]">
              <div className="flex flex-col">
                <h5 className="text-[13px] font-bold text-t1 flex items-center gap-2 uppercase tracking-tight font-space">
                  <Mail size={14} className="text-accent2" /> Messages <span className="text-accent2">({emailNotifications.length})</span>
                </h5>
                <p className="text-[9px] text-t3 uppercase font-black tracking-widest mt-0.5">Inbox Activity</p>
              </div>
              <button 
                onClick={handleShowNotificationEmail}
                className="p-1 hover:bg-white/5 rounded-lg text-t3 hover:text-t1"
              >
                <X size={16} />
              </button>
            </div>

            <div className="common-scrollbar max-h-[420px] overflow-y-auto p-2 bg-[#080f28]">
              {emailNotifications.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-center mb-3 text-t4 opacity-20">
                    <Mail size={24} />
                  </div>
                  <p className="text-t3 text-[11px] font-bold uppercase tracking-widest">No new messages</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {emailNotifications.map((notification, index) => (
                    <Link
                      key={index}
                      href="/apps/email-inbox"
                      onClick={handleShowNotificationEmail}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.03] border border-transparent hover:border-white/5 transition-all group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-accent2/10 flex items-center justify-center text-accent2 flex-shrink-0">
                        <span className="text-xs font-black font-space">
                          {notification.status?.[0]?.toUpperCase() || 'M'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[11px] font-bold text-t1 truncate">
                            {notification.status || 'System'}
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
                        <ArrowRight size={12} className="text-accent2" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="p-3 border-t border-white/5 bg-[#080f28]">
              <Link 
                href="/apps/email-inbox" 
                onClick={handleShowNotificationEmail}
                className="flex items-center justify-center gap-2 py-2 w-full rounded-xl bg-white/5 hover:bg-accent text-white text-[11px] font-bold uppercase tracking-widest transition-all shadow-sm"
              >
                View All Messages
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default EmailNotification;
