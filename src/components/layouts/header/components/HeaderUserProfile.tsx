"use client";
import Image from 'next/image';
import Link from 'next/link';
import React from 'react';
import UserIcon from '@/svg/header-svg/Profile/UserIcon';
import ChatIcon from '@/svg/header-svg/Profile/ChatIcon';
import EmailIcon from '@/svg/header-svg/Profile/EmailIcon';
import LogOut from '@/svg/header-svg/Profile/LogOut';
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
      <div className="nav-item relative">
        <button
          onClick={handleShowUserDrowdown}
          className="flex items-center gap-3 hover:bg-white/[0.05] p-1.5 rounded-lg transition-colors group"
        >
          <div className="relative">
            {user?.avatarUrl ? (
              <Image
                src={user.avatarUrl}
                alt={user?.firstName || "user"}
                width={32}
                height={32}
                className="rounded-full object-cover w-8 h-8 border border-white/10"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-white font-black text-xs">
                {user?.firstName?.[0]?.toUpperCase() || 'U'}
              </div>
            )}
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green rounded-full border-2 border-n800"></span>
          </div>
          <div className="hidden sm:flex flex-col items-start leading-tight">
            <span className="text-[13px] font-space font-bold text-t1 group-hover:text-accent2 transition-colors">
              {user?.firstName || 'GulfBridge'}
            </span>
            <span className="text-[10px] text-t3 uppercase font-bold tracking-wider">Online</span>
          </div>
        </button>

        {isOpenUserDropdown && (
          <div className="absolute top-full right-0 mt-2 w-56 bg-[#080f28] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
            <div className="p-4 border-b border-white/5">
              <p className="text-[13px] font-space font-bold text-t1">{user?.firstName} {user?.lastName}</p>
              <p className="text-[11px] text-t3 truncate">{user?.email}</p>
            </div>
            <ul className="p-1">
              <li>
                <Link href="/dashboard/settings/account" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/[0.05] text-[13px] text-t2 hover:text-t1 transition-colors">
                  <UserIcon /> Profile Settings
                </Link>
              </li>
              <li>
                <Link href="/apps/app-chat" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/[0.05] text-[13px] text-t2 hover:text-t1 transition-colors">
                  <ChatIcon /> Direct Messages
                </Link>
              </li>
              <li>
                <Link href="/apps/email-inbox" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/[0.05] text-[13px] text-t2 hover:text-t1 transition-colors">
                  <EmailIcon /> Notifications
                </Link>
              </li>
              <li className="my-1 border-t border-white/5"></li>
              <li>
                <button
                  onClick={() => {
                    setIsLogoutModalOpen(true);
                    handleShowUserDrowdown();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red/10 text-[13px] text-t2 hover:text-red transition-colors"
                >
                  <LogOut /> Log Out
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