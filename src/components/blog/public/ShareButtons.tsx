'use client';

import React, { useState, useEffect } from 'react';
import { Send, Share2, Copy, Check } from 'lucide-react';

interface ShareButtonsProps {
  url: string;
  title: string;
  vertical?: boolean;
}

export const ShareButtons: React.FC<ShareButtonsProps> = ({ url, title, vertical = false }) => {
  const [copied, setCopied] = useState(false);
  const [visitorId, setVisitorId] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      let vid = localStorage.getItem('lm_visitor_id');
      if (!vid) {
        vid = Math.random().toString(36).substring(2, 11);
        localStorage.setItem('lm_visitor_id', vid);
      }
      setVisitorId(vid);
    }
  }, []);

  // Append WhatsApp referral tracking parameter
  const whatsappShareUrl = visitorId ? `${url}?ref=wa_${visitorId}` : url;

  const encodedUrl = encodeURIComponent(url);
  const encodedWhatsappUrl = encodeURIComponent(whatsappShareUrl);
  const encodedTitle = encodeURIComponent(title);

  const shareLinks = [
    {
      name: 'Twitter',
      url: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      icon: <Send className="w-3.5 h-3.5" />,
      color: 'hover:bg-[#1da1f2]/10 hover:text-[#1da1f2] hover:border-[#1da1f2]/30'
    },
    {
      name: 'LinkedIn',
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      icon: <Share2 className="w-3.5 h-3.5" />,
      color: 'hover:bg-[#0a66c2]/10 hover:text-[#0a66c2] hover:border-[#0a66c2]/30'
    },
    {
      name: 'WhatsApp',
      url: `https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedWhatsappUrl}`,
      icon: <Share2 className="w-3.5 h-3.5 rotate-90" />,
      color: 'hover:bg-[#25d366]/10 hover:text-[#25d366] hover:border-[#25d366]/30'
    }
  ];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  if (vertical) {
    return (
      <div className="flex flex-col gap-2.5 items-center">
        {shareLinks.map((link) => (
          <a
            key={link.name}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            title={`Share on ${link.name}`}
            className={`w-9 h-9 flex items-center justify-center rounded-xl border border-[#E2E8F0] bg-white text-[#64748B] transition duration-300 ${link.color}`}
          >
            {link.icon}
          </a>
        ))}
        <button
          onClick={handleCopy}
          title="Copy Link"
          className={`w-9 h-9 flex items-center justify-center rounded-xl border border-[#E2E8F0] bg-white transition duration-300 ${
            copied ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A]'
          }`}
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2 border-t border-[#F1F5F9] pt-4">
      <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest"><Share2 className="w-3 h-3 text-primary" /> Share Article</div>
      <div className="flex flex-wrap items-center gap-2">
        {shareLinks.map((link) => (
          <a
            key={link.name}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-[10px] font-bold uppercase tracking-wider text-[#64748B] transition duration-300 ${link.color}`}
          >
            {link.icon}
            <span>{link.name}</span>
          </a>
        ))}
        <button
          onClick={handleCopy}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-[10px] font-bold uppercase tracking-wider transition duration-300 ${
            copied ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A]'
          }`}
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied!' : 'Copy Link'}</span>
        </button>
      </div>
    </div>
  );
};
export default ShareButtons;
