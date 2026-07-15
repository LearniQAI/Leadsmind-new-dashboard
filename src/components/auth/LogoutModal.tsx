"use client";

import React from "react";
import { Dialog, DialogContent, Zoom } from "@mui/material";
import { LogOut, X } from "lucide-react";
import { DashButton } from "@/components/dashboard-ui";

interface LogoutModalProps {
 open: boolean;
 onClose: () => void;
 onConfirm: () => void;
 isLoading?: boolean;
}

const LogoutModal: React.FC<LogoutModalProps> = ({ open, onClose, onConfirm, isLoading }) => {
 return (
  <Dialog 
   open={open} 
   onClose={onClose} 
   TransitionComponent={Zoom}
   PaperProps={{
    className: "rounded-2xl border border-dash-border shadow-2xl overflow-hidden",
    style: { maxWidth: '380px', width: '90%' }
   }}
  >
   <DialogContent className="p-0">
    <div className="relative p-7 text-center">
     {/* Close Button */}
     <button
      onClick={onClose}
      className="absolute right-3 top-3 p-2 !text-dash-textMuted hover:!text-dash-text hover:bg-dash-surface rounded-full transition-colors motion-reduce:transition-none"
     >
      <X size={18} />
     </button>

     {/* Icon Header */}
     <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-dash-surface !text-dash-textMuted">
      <LogOut size={24} strokeWidth={1.75} />
     </div>

     {/* Content */}
     <h3 className="mb-2 text-lg font-bold !text-dash-text">Log out?</h3>
     <p className="mb-6 text-[13px] !text-dash-textMuted leading-relaxed">
      You'll need to sign back in to access your dashboard.
     </p>

     {/* Actions */}
     <div className="flex items-center gap-3">
      <DashButton
       type="button"
       variant="secondary"
       className="flex-1"
       onClick={onClose}
       disabled={isLoading}
      >
       Cancel
      </DashButton>
      <DashButton
       type="button"
       variant="destructive"
       className="flex-1"
       onClick={onConfirm}
       disabled={isLoading}
      >
       {isLoading ? (
        <span className="flex items-center justify-center gap-2">
         <svg className="animate-spin h-4 w-4 motion-reduce:animate-none" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
         </svg>
         Logging out...
        </span>
       ) : "Log out"}
      </DashButton>
     </div>
    </div>
   </DialogContent>
  </Dialog>
 );
};

export default LogoutModal;
