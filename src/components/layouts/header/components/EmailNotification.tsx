"use client";
import Link from 'next/link';
import React from 'react';
import { MessageSquare } from 'lucide-react';

const EmailNotification = () => {
  return (
    <Link
      href="/conversations"
      className="w-9 h-9 rounded-xl flex items-center justify-center transition-all relative group text-t2 hover:text-t1 hover:bg-white/[0.05]"
      title="Open Chats"
    >
      <MessageSquare size={16} />
    </Link>
  );
};

export default EmailNotification;
