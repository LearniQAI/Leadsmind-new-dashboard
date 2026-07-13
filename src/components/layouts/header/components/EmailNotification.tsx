"use client";
import Link from 'next/link';
import React from 'react';
import { MessageSquare } from 'lucide-react';

const EmailNotification = () => {
  return (
    <Link
      href="/conversations"
      className="w-9 h-9 flex items-center justify-center !text-dash-textMuted hover:text-dash-accent hover:bg-dash-surface rounded-xl transition-all active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100"
      title="Open Chats"
    >
      <MessageSquare size={18} />
    </Link>
  );
};

export default EmailNotification;
