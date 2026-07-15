"use client";
import Image from 'next/image';
import UserAvatar from '@/components/ui/UserAvatar';
import Link from 'next/link';
import React, { useEffect, useRef } from 'react';
import { User, Settings, CreditCard, Bell, HelpCircle, LogOut as LogOutIcon, CheckCircle2 } from 'lucide-react';
import { useDashboardContext } from '../../DashboardProvider';
import { handleLogout } from '@/app/actions/auth';
import LogoutModal from '@/components/auth/LogoutModal';
import { toast } from 'sonner';

type TUserProps = {
  handleShowUserDrowdown: () => void;
  isOpenUserDropdown: boolean;
};

const HeaderUserProfile = ({ handleShowUserDrowdown, isOpenUserDropdown }: TUserProps) => {
  const { user, workspace } = useDashboardContext();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = React.useState(false);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpenUserDropdown) return;

    const handlePointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        handleShowUserDrowdown();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleShowUserDrowdown();
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpenUserDropdown, handleShowUserDrowdown]);

  const onConfirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      await handleLogout();
      toast.success("Logged out successfully");
      window.location.href = '/auth/signin-basic';
    } catch (error) {
      toast.error("Failed to log out. Please try again.");
      setIsLoggingOut(false);
    }
  };

  return (
    <>
      <div className="nav-item relative" ref={containerRef}>
        {/* Trigger */}
        <button
          onClick={handleShowUserDrowdown}
          aria-haspopup="menu"
          aria-expanded={isOpenUserDropdown}
          className="flex items-center gap-2.5 hover:bg-slate-50 p-1.5 rounded-xl transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary/20 border border-transparent hover:border-slate-200"
        >
          <UserAvatar 
            avatarUrl={user?.avatarUrl}
            oauthImage={user?.oauthImage}
            firstName={user?.firstName}
            lastName={user?.lastName}
            size="sm"
            showOnlineIndicator={true}
          />
          <div className="hidden sm:flex flex-col items-start leading-none gap-0.5">
            <span className="text-[12px] font-bold !text-slate-800">
              {user?.firstName || 'GulfBridge'}
            </span>
            <span className="text-[10px] !text-slate-500 font-medium">Workspace Owner</span>
          </div>
        </button>

        {/* Dropdown Menu */}
        {isOpenUserDropdown && (
          <div
            role="menu"
            className="absolute top-full right-0 mt-2 w-[320px] bg-white border border-[#EEF2F7] rounded-[20px] shadow-[0_20px_50px_rgba(15,23,42,0.12)] z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 origin-top-right"
          >
            {/* Header Section */}
            <div className="p-4 border-b border-[#EEF2F7] bg-slate-50/50">
              <div className="flex items-center justify-between mb-3">
                <div className="flex flex-col">
                  <span className="text-[12px] font-bold !text-slate-800">{workspace?.name || 'LeadsMind Workspace'}</span>
                </div>
                <div className="px-2 py-0.5 bg-blue-50 border border-blue-100 rounded-md text-[9px] font-black tracking-wider !text-blue-600 uppercase">
                  Pro Plan
                </div>
              </div>
              <div className="flex items-center gap-3">
                <UserAvatar 
                  avatarUrl={user?.avatarUrl}
                  oauthImage={user?.oauthImage}
                  firstName={user?.firstName}
                  lastName={user?.lastName}
                  size="lg"
                  className="shadow-sm"
                />
                <div className="min-w-0">
                  <p className="text-[14px] font-bold !text-slate-900 truncate leading-tight">{user?.firstName} {user?.lastName}</p>
                  <p className="text-[12px] !text-slate-500 truncate leading-tight mt-0.5">{user?.email}</p>
                </div>
              </div>
            </div>

            {/* Usage Metrics Section */}
            <div className="p-4 border-b border-[#EEF2F7]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold !text-slate-400 uppercase tracking-wider">Workspace Usage</span>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="font-medium !text-slate-600">Contacts</span>
                    <span className="!text-slate-400 font-medium">234 / 500</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1">
                    <div className="bg-primary h-1 rounded-full w-[46%]"></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="font-medium !text-slate-600">Automations</span>
                    <span className="!text-slate-400 font-medium">18 / 50</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1">
                    <div className="bg-primary h-1 rounded-full w-[36%]"></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="font-medium !text-slate-600">Websites</span>
                    <span className="!text-slate-400 font-medium">3 / 10</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1">
                    <div className="bg-primary h-1 rounded-full w-[30%]"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Menu Links */}
            <div className="p-1.5">
              <Link
                href="/dashboard/settings/account"
                onClick={handleShowUserDrowdown}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium !text-slate-700 hover:bg-slate-50 hover:!text-slate-900 transition-colors"
              >
                <Settings size={15} className="!text-slate-400" /> Profile Settings
              </Link>
              <Link
                href="/dashboard/settings/billing"
                onClick={handleShowUserDrowdown}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium !text-slate-700 hover:bg-slate-50 hover:!text-slate-900 transition-colors"
              >
                <CreditCard size={15} className="!text-slate-400" /> Billing
              </Link>
              <Link
                href="/activities"
                onClick={handleShowUserDrowdown}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium !text-slate-700 hover:bg-slate-50 hover:!text-slate-900 transition-colors"
              >
                <Bell size={15} className="!text-slate-400" /> Notifications
              </Link>
              <Link
                href="/help"
                onClick={handleShowUserDrowdown}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium !text-slate-700 hover:bg-slate-50 hover:!text-slate-900 transition-colors"
              >
                <HelpCircle size={15} className="!text-slate-400" /> Help Center
              </Link>
            </div>

            {/* System Status */}
            <div className="px-4 py-3 bg-slate-50/50 border-t border-b border-[#EEF2F7] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="!text-emerald-500" />
                <span className="text-[11px] font-medium !text-slate-600">All systems operational</span>
              </div>
            </div>

            {/* Logout Area */}
            <div className="p-1.5 bg-slate-50">
              <button
                onClick={() => {
                  setIsLogoutModalOpen(true);
                  handleShowUserDrowdown();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium !text-slate-600 hover:bg-red-50 hover:!text-red-600 transition-colors group"
              >
                <LogOutIcon size={15} className="!text-slate-400 group-hover:!text-red-500 transition-colors" /> Log Out
              </button>
            </div>
          </div>
        )}
      </div>

      <LogoutModal
        open={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={onConfirmLogout}
        isLoading={isLoggingOut}
      />
    </>
  );
};

export default HeaderUserProfile;
