import Image from 'next/image';
import Link from 'next/link';
import React from 'react';
import avatarImg from "../../../../../public/assets/images/avatar/avatar.png";
import UserIcon from '@/svg/header-svg/Profile/UserIcon';
import ChatIcon from '@/svg/header-svg/Profile/ChatIcon';
import EmailIcon from '@/svg/header-svg/Profile/EmailIcon';
import AddAccountIcon from '@/svg/header-svg/Profile/AddAccountIcon';
import LogOut from '@/svg/header-svg/Profile/LogOut';
import { useDashboardContext } from '../../DashboardProvider';
import { handleLogout } from '@/app/actions/auth';
import LogoutModal from '@/components/auth/LogoutModal';
import { toast } from 'sonner';

type TUserProps={
  handleShowUserDrowdown:()=>void;
  isOpenUserDropdown:boolean;
}

const HeaderUserProfile = ({handleShowUserDrowdown, isOpenUserDropdown}:TUserProps) => {
  const { user } = useDashboardContext();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = React.useState(false);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const onConfirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      await handleLogout();
      toast.success("Logged out successfully");
      // handleLogout already redirects, but this is a safety fallback
      window.location.href = '/auth/signin-basic';
    } catch (error) {
      toast.error("Failed to log out. Please try again.");
      setIsLoggingOut(false);
    }
  };

  return (
    <>
      <div className="nav-item relative">
         {/* Clickable profile icon */}
        <Link id="userportfolio" href="#" onClick={handleShowUserDrowdown}>
          <div className="user__portfolio">
            <div className="user__portfolio-thumb">
              {user?.avatarUrl ? (
                <Image 
                  src={user.avatarUrl} 
                  alt={user?.firstName || "user"} 
                  width={40} 
                  height={40} 
                  className="rounded-full object-cover w-10 h-10 border border-white/10"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-white font-black text-sm shadow-inner border border-white/10">
                  {user?.firstName?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
            </div>
            <div className="user__content text-left ml-3">
              <h5 className="font-bold text-white text-sm max-w-[120px] truncate">{user?.firstName || 'User'}</h5>
              <span className="text-[10px] text-success font-bold uppercase tracking-widest flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                online
              </span>
            </div>
          </div>
        </Link>
        {/* Conditional rendering of the dropdown */}
        {isOpenUserDropdown && (
          <div className={`user__dropdown ${isOpenUserDropdown ? "user-enable" : " "}`}>
          <ul>
            <li>
              <Link href="/dashboard/settings/account">
              <UserIcon/>
                Profile</Link>
            </li>
            <li>
              <Link href="/apps/app-chat">
              <ChatIcon/>
                chat</Link>
            </li>
            <li>
              <Link href="/apps/email-inbox">
              <EmailIcon/>
                inbox
              </Link>
            </li>
            <li>
              <Link href="/auth/signup-basic">
              <AddAccountIcon/>
                add acount
              </Link>
            </li>
            <li>
              <button 
                onClick={() => {
                  setIsLogoutModalOpen(true);
                  handleShowUserDrowdown();
                }}
                className="flex items-center gap-2 w-full text-left"
              >
                <LogOut/>
                Log Out
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
