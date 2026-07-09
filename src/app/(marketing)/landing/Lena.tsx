'use client';

import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Bot, User } from 'lucide-react';
import { lenaCapabilities, lenaChat } from './data';
import { SectionReveal, sectionRevealProps } from './motion';

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
      {...sectionRevealProps}
      onViewportEnter={runSequence}
      className="lena-chat-shell max-w-[680px] mx-auto rounded-[24px] p-8"
    >
      <div className="flex items-center gap-3 mb-5 pb-4 border-b border-white/10">
        <span className="w-9 h-9 rounded-full bg-[linear-gradient(135deg,#4F46E5_0%,#7C3AED_50%,#0891B2_100%)] flex items-center justify-center">
          <Bot className="w-4.5 h-4.5 text-white" />
        </span>
        <div>
          <div className="text-sm font-semibold text-white">LENA</div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-2 h-2 rounded-full bg-[#10B981] lm-dot-pulse shadow-[0_0_8px_#10B981]" />
            <span className="text-[13px] !text-[#10B981]">Online — responding in real time</span>
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
              className={`px-[18px] py-3 text-sm max-w-[80%] ${
                m.from === 'user'
                  ? 'text-white rounded-[18px_18px_4px_18px]'
                  : 'bg-white/[0.06] border border-white/[0.08] text-[#E2E8F0] rounded-[18px_18px_18px_4px]'
              }`}
              style={
                m.from === 'user'
                  ? { background: 'linear-gradient(135deg, #4F46E5, #6366F1)' }
                  : undefined
              }
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
            <div className="rounded-[18px_18px_18px_4px] bg-white/[0.06] border border-white/[0.08] px-[18px] py-3 flex items-center gap-1">
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
    <section
      className="relative overflow-hidden py-[100px] px-6"
      style={{ background: 'linear-gradient(160deg, #0F172A 0%, #1a1060 40%, #0F172A 100%)' }}
    >
      {/* Decorative orbs */}
      <motion.div
        animate={{ y: [0, -15, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -top-[100px] -left-[100px] w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(99, 102, 241, 0.12), transparent 70%)' }}
      />
      <motion.div
        animate={{ y: [0, -15, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -bottom-[100px] -right-[100px] w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(139, 92, 246, 0.1), transparent 70%)' }}
      />
      {/* Radial glow behind headline */}
      <motion.div
        animate={{ y: [0, -15, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 800px 400px at 50% 0%, rgba(99, 102, 241, 0.15), transparent 70%)' }}
      />

      <SectionReveal className="max-w-[1100px] mx-auto relative z-10">
        <div className="max-w-2xl mx-auto text-center mb-16">
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-5"
            style={{ background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.4)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#4F46E5] lm-dot-pulse" />
            <span className="text-xs font-bold uppercase tracking-[0.12em] !text-[#A5B4FC]">Powered by AI</span>
          </div>

          <h2 className="text-[clamp(36px,5vw,56px)] font-extrabold !text-white leading-[1.15] tracking-[-0.02em] max-w-[700px] mx-auto mb-5">
            Meet{' '}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(135deg, #818CF8, #C084FC, #60A5FA)' }}
            >
              LENA
            </span>
            <br />
            Your AI Business Assistant
          </h2>

          <p className="text-[16px] !text-[#94A3B8] leading-[1.7] max-w-[560px] mx-auto">
            LENA is built into every module. She writes content, answers support tickets,
            generates leads, and helps your team work faster — without leaving LeadsMind.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-[1000px] mx-auto mb-14">
          {lenaCapabilities.map((c) => {
            const Icon = c.icon;
            return (
              <motion.div
                key={c.title}
                whileHover={{ y: -4 }}
                className="lena-card rounded-[20px] p-8 backdrop-blur-[12px] transition-all duration-300 bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.08)] hover:border-[rgba(99,102,241,0.4)] hover:shadow-[0_20px_40px_rgba(99,102,241,0.15)]"
              >
                <div
                  className="w-[52px] h-[52px] rounded-[14px] flex items-center justify-center mb-5"
                  style={{
                    background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
                    boxShadow: '0 8px 20px rgba(79, 70, 229, 0.3)',
                  }}
                >
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold !text-white mb-2">{c.title}</h3>
                <p className="text-sm !text-[#94A3B8] leading-[1.7]">{c.description}</p>
                <p
                  className="text-xs font-semibold !text-[#6366F1] mt-3 pt-3"
                  style={{ borderTop: '1px solid rgba(99, 102, 241, 0.2)' }}
                >
                  ✦ {c.stat}
                </p>
              </motion.div>
            );
          })}
        </div>

        <ChatPreview />
      </SectionReveal>
    </section>
  );
}
