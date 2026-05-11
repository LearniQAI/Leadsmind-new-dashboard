"use client";

import React from "react";
import { Dialog, DialogContent, Zoom } from "@mui/material";
import { LogOut, X } from "lucide-react";

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
    className: "rounded-2xl border-none shadow-2xl overflow-hidden",
    style: { maxWidth: '400px', width: '90%' }
   }}
  >
   <DialogContent className="p-0">
    <div className="relative p-8 text-center">
     {/* Close Button */}
     <button 
      onClick={onClose}
      className="absolute right-4 top-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
     >
      <X size={20} />
     </button>

     {/* Icon Header */}
     <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-50 text-red-500 shadow-inner">
      <LogOut size={40} strokeWidth={1.5} />
     </div>

     {/* Content */}
     <h3 className="mb-3 text-2xl font-bold text-gray-900">Wait, Logging Out?</h3>
     <p className="mb-8 text-gray-500 leading-relaxed">
      Are you sure you want to end your session? You'll need to sign back in to access your dashboard and workspaces.
     </p>

     {/* Actions */}
     <div className="flex flex-col gap-3">
      <button 
       onClick={onConfirm}
       disabled={isLoading}
       className="w-full py-3.5 rounded-xl bg-red-500 text-white font-semibold shadow-lg shadow-red-500/25 hover:bg-red-600 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
      >
       {isLoading ? (
        <span className="flex items-center justify-center gap-2">
         <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
         </svg>
         Logging out...
        </span>
       ) : "Yes, Log Me Out"}
      </button>
      <button 
       onClick={onClose}
       disabled={isLoading}
       className="w-full py-3.5 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 active:scale-[0.98] transition-all"
      >
       Stay Logged In
      </button>
     </div>
    </div>
   </DialogContent>
  </Dialog>
 );
};

export default LogoutModal;
