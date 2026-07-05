'use client';

import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Bot, User } from 'lucide-react';
import { lenaCapabilities, lenaChat } from './data';

function ChatPreview() {
  const [visibleCount, setVisibleCount] = useState(0);
  const [typing, setTyping] = useState(false);
  const started = useRef(false);

  const runSequence = () => {
    if (started.current) return;
    started.current = true;

    let i = 0;
    const step = () => {
      if (i >= lenaChat.length) return;
      const msg = lenaChat[i];
      const showTyping = msg.from === 'lena';
      const delay = showTyping ? 900 : 200;

      if (showTyping) setTyping(true);
      setTimeout(() => {
        setTyping(false);
        setVisibleCount((v) => v + 1);
        i += 1;
        setTimeout(step, 500);
      }, delay);
    };
    step();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      onViewportEnter={runSequence}
      transition={{ duration: 0.6 }}
      className="max-w-2xl mx-auto lm-glass rounded-2xl p-6 border-t-2 border-t-[#4F46E5]"
    >
      <div className="flex items-center gap-3 mb-5 pb-4 border-b border-white/10">
        <span className="w-9 h-9 rounded-full bg-[linear-gradient(135deg,#4F46E5_0%,#7C3AED_50%,#0891B2_100%)] flex items-center justify-center">
          <Bot className="w-4.5 h-4.5 text-white" />
        </span>
        <div>
          <div className="text-sm font-semibold text-white">LENA</div>
          <div className="text-[11px] text-[#10B981] flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" /> Online
          </div>
        </div>
      </div>

      <div className="space-y-3 min-h-[180px]">
        {lenaChat.slice(0, visibleCount).map((m, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={`flex gap-2.5 ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {m.from === 'lena' && (
              <span className="w-7 h-7 rounded-full bg-[#4F46E5]/20 text-[#818CF8] flex items-center justify-center shrink-0">
                <Bot className="w-3.5 h-3.5" />
              </span>
            )}
            <div
              className={`rounded-2xl px-4 py-2.5 text-sm max-w-[80%] ${
                m.from === 'user'
                  ? 'bg-[#4F46E5] text-white rounded-tr-sm'
                  : 'bg-white/10 text-white/85 rounded-tl-sm'
              }`}
            >
              {m.text}
            </div>
            {m.from === 'user' && (
              <span className="w-7 h-7 rounded-full bg-white/10 text-white/60 flex items-center justify-center shrink-0">
                <User className="w-3.5 h-3.5" />
              </span>
            )}
          </motion.div>
        ))}

        {typing && (
          <div className="flex gap-2.5 justify-start">
            <span className="w-7 h-7 rounded-full bg-[#4F46E5]/20 text-[#818CF8] flex items-center justify-center shrink-0">
              <Bot className="w-3.5 h-3.5" />
            </span>
            <div className="rounded-2xl rounded-tl-sm bg-white/10 px-4 py-3 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-white/50 lm-typing-dot" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-white/50 lm-typing-dot" style={{ animationDelay: '200ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-white/50 lm-typing-dot" style={{ animationDelay: '400ms' }} />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function Lena() {
  return (
    <section className="py-28 bg-[#0F172A] relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-[#7C3AED]/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-[#4F46E5]/15 rounded-full blur-[140px] pointer-events-none" />

      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl mx-auto text-center mb-16"
        >
          <div className="text-[#818CF8] font-bold uppercase tracking-[0.25em] text-xs mb-4">Powered by AI</div>
          <h2 className="text-3xl md:text-5xl font-bold !text-white leading-tight mb-5">
            Meet LENA — Your AI Business Assistant
          </h2>
          <p className="!text-white/50 leading-relaxed">
            LENA is built into every module. She writes content, answers support tickets,
            generates leads, and helps your team work faster — without leaving LeadsMind.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-16">
          {lenaCapabilities.map((c, i) => {
            const Icon = c.icon;
            return (
              <motion.div
                key={c.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.12 }}
                whileHover={{ y: -6 }}
                className="lm-glass rounded-2xl p-8 border-t-2 border-t-[#4F46E5] transition-shadow hover:shadow-2xl hover:shadow-[#4F46E5]/10"
              >
                <div className="w-11 h-11 rounded-xl bg-[#4F46E5]/15 text-[#818CF8] flex items-center justify-center mb-6">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold !text-white mb-3">{c.title}</h3>
                <p className="!text-white/50 leading-relaxed text-sm">{c.description}</p>
              </motion.div>
            );
          })}
        </div>

        <ChatPreview />
      </div>
    </section>
  );
}
