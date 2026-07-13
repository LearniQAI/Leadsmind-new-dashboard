"use client";
import Image from 'next/image';
import Link from 'next/link';
import React, { useEffect, useRef } from 'react';
import { User, MessageSquare, Bell, LogOut as LogOutIcon } from 'lucide-react';
import { useDashboardContext } from '../../DashboardProvider';
import { handleLogout } from '@/app/actions/auth';
import LogoutModal from '@/components/auth/LogoutModal';
import { toast } from 'sonner';

type TUserProps = {
  handleShowUserDrowdown: () => void;
  isOpenUserDropdown: boolean;
};

const HeaderUserProfile = ({ handleShowUserDrowdown, isOpenUserDropdown }: TUserProps) => {
  const { user } = useDashboardContext();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = React.useState(false);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click / Escape — the dropdown previously had no way to
  // dismiss itself other than re-clicking the trigger.
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpenUserDropdown]);

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
        <button
          onClick={handleShowUserDrowdown}
          aria-haspopup="menu"
          aria-expanded={isOpenUserDropdown}
          className="flex items-center gap-3 hover:bg-dash-surface p-1.5 rounded-xl transition-colors group focus-visible:outline focus-visible:outline-2 focus-visible:outline-dash-accent focus-visible:outline-offset-2"
        >
          <div className="relative">
            {user?.avatarUrl ? (
              <Image
                src={user.avatarUrl}
                alt={user?.firstName || "user"}
                width={32}
                height={32}
                className="rounded-full object-cover w-8 h-8 border border-dash-border"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-dash-accent flex items-center justify-center text-white font-black text-xs">
                {user?.firstName?.[0]?.toUpperCase() || 'U'}
              </div>
            )}
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-dash-bg"></span>
          </div>
          <div className="hidden sm:flex flex-col items-start leading-tight">
            <span className="text-[13px] font-bold !text-dash-text group-hover:!text-dash-accent transition-colors">
              {user?.firstName || 'GulfBridge'}
            </span>
            <span className="text-[10px] !text-dash-textMuted uppercase font-bold tracking-wider">Online</span>
          </div>
        </button>

        {isOpenUserDropdown && (
          <div
            role="menu"
            className="absolute top-full right-0 mt-2 w-64 bg-dash-bg border border-dash-border rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Identity block — anchoring text, given more presence than the menu rows below */}
            <div className="flex items-center gap-3 p-4 bg-dash-surface border-b border-dash-border">
              {user?.avatarUrl ? (
                <Image
                  src={user.avatarUrl}
                  alt={user?.firstName || "user"}
                  width={44}
                  height={44}
                  className="rounded-full object-cover w-11 h-11 border border-dash-border flex-shrink-0"
                />
              ) : (
                <div className="w-11 h-11 rounded-full bg-dash-accent flex items-center justify-center text-white font-black text-base flex-shrink-0">
                  {user?.firstName?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-[14px] font-bold !text-dash-text truncate">{user?.firstName} {user?.lastName}</p>
                <p className="text-[12px] !text-dash-textMuted truncate">{user?.email}</p>
              </div>
            </div>

            <ul className="p-1.5">
              <li>
                <Link
                  href="/dashboard/settings/account"
                  role="menuitem"
                  onClick={handleShowUserDrowdown}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium !text-dash-text hover:bg-dash-accent/10 hover:!text-dash-accent transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-dash-accent focus-visible:outline-offset-2"
                >
                  <User size={16} className="flex-shrink-0" /> Profile Settings
                </Link>
              </li>
              <li>
                <Link
                  href="/conversations"
                  role="menuitem"
                  onClick={handleShowUserDrowdown}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium !text-dash-text hover:bg-dash-accent/10 hover:!text-dash-accent transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-dash-accent focus-visible:outline-offset-2"
                >
                  <MessageSquare size={16} className="flex-shrink-0" /> Direct Messages
                </Link>
              </li>
              <li>
                <Link
                  href="/activities"
                  role="menuitem"
                  onClick={handleShowUserDrowdown}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium !text-dash-text hover:bg-dash-accent/10 hover:!text-dash-accent transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-dash-accent focus-visible:outline-offset-2"
                >
                  <Bell size={16} className="flex-shrink-0" /> Notifications
                </Link>
              </li>
              <li className="my-1.5 border-t border-dash-border"></li>
              <li>
                <button
                  role="menuitem"
                  onClick={() => {
                    setIsLogoutModalOpen(true);
                    handleShowUserDrowdown();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold text-red-600 hover:bg-red-50 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-500 focus-visible:outline-offset-2"
                >
                  <LogOutIcon size={16} className="flex-shrink-0" /> Log Out
                </button>
              </li>
            </ul>
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
