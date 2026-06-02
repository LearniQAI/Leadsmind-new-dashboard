'use client';

import React, { useState, useEffect } from 'react';

interface AppearanceTabProps {
  workspaceId: string;
}

export default function AppearanceTab({ workspaceId }: AppearanceTabProps) {
  const [botName, setBotName] = useState('LENA');
  const [welcomeMessage, setWelcomeMessage] = useState('Hi there! I am LENA. How can I help you today?');
  const [primaryColor, setPrimaryColor] = useState('#6366F1');
  const [position, setPosition] = useState<'left' | 'right'>('right');
  const [quickReplies, setQuickReplies] = useState<string[]>([]);
  const [newReply, setNewReply] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await fetch(`/api/lena/config?workspaceId=${workspaceId}`);
        const data = await res.json();
        if (res.ok && data.config) {
          setBotName(data.config.bot_name || 'LENA');
          setWelcomeMessage(data.config.welcome_message || '');
          setPrimaryColor(data.config.primary_color || '#6366F1');
          setPosition(data.config.position || 'right');
          setQuickReplies(data.config.quick_replies || []);
        }
      } catch (err) {
        console.error('Failed to load config:', err);
      } finally {
        setLoading(false);
      }
    }
    loadConfig();
  }, [workspaceId]);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/lena/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          bot_name: botName,
          welcome_message: welcomeMessage,
          primary_color: primaryColor,
          position,
          quick_replies: quickReplies
        })
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Appearance settings saved successfully!' });
      } else {
        const err = await res.json();
        setMessage({ type: 'error', text: err.error || 'Failed to save settings.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error saving settings.' });
    } finally {
      setSaving(false);
    }
  };

  const addQuickReply = () => {
    if (!newReply.trim()) return;
    if (quickReplies.length >= 5) {
      alert('Maximum of 5 quick replies allowed.');
      return;
    }
    setQuickReplies([...quickReplies, newReply.trim()]);
    setNewReply('');
  };

  const removeQuickReply = (index: number) => {
    setQuickReplies(quickReplies.filter((_, i) => i !== index));
  };

  if (loading) {
    return <div className="h-40 bg-white/[0.02] animate-pulse rounded-xl" />;
  }

  return (
    <div className="flex flex-col lg:flex-row gap-8 items-start w-full">
      {/* Editor Panel */}
      <div className="flex-1 bg-[rgba(12,21,53,0.85)] border border-[rgba(255,255,255,0.07)] rounded-xl p-6 space-y-5">
        <h3 className="text-[14px] font-semibold text-[#eef2ff] mb-2 font-space-grotesk">
          Widget Settings
        </h3>

        {message && (
          <div className={`p-3 rounded-lg text-[12px] font-dm-sans ${
            message.type === 'success' ? 'bg-[#10b981]/15 text-[#34d399]' : 'bg-[#ef4444]/15 text-[#f87171]'
          }`}>
            {message.text}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.6px] text-[#4a5a82] mb-1.5 block">
              Bot Name
            </label>
            <input
              type="text"
              value={botName}
              onChange={(e) => setBotName(e.target.value)}
              className="bg-white/[0.05] border border-[rgba(255,255,255,0.07)] rounded-lg px-4 py-2 text-white text-[13px] focus:outline-none focus:border-[#2563eb] w-full"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.6px] text-[#4a5a82] mb-1.5 block">
              Welcome Message
            </label>
            <textarea
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              rows={3}
              className="bg-white/[0.05] border border-[rgba(255,255,255,0.07)] rounded-lg px-4 py-2 text-white text-[13px] focus:outline-none focus:border-[#2563eb] w-full resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.6px] text-[#4a5a82] mb-1.5 block">
                Primary Color
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-10 h-10 border-0 rounded bg-transparent cursor-pointer"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="bg-white/[0.05] border border-[rgba(255,255,255,0.07)] rounded-lg px-3 py-2 text-white text-[13px] focus:outline-none focus:border-[#2563eb] flex-1"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.6px] text-[#4a5a82] mb-1.5 block">
                Position
              </label>
              <div className="flex bg-white/[0.04] p-1 rounded-lg border border-[rgba(255,255,255,0.07)]">
                <button
                  type="button"
                  onClick={() => setPosition('left')}
                  className={`flex-1 py-1.5 text-[12px] font-semibold rounded-md transition-colors ${
                    position === 'left' ? 'bg-[#2563eb] text-white' : 'text-[#94a3c8] hover:text-[#eef2ff]'
                  }`}
                >
                  Left
                </button>
                <button
                  type="button"
                  onClick={() => setPosition('right')}
                  className={`flex-1 py-1.5 text-[12px] font-semibold rounded-md transition-colors ${
                    position === 'right' ? 'bg-[#2563eb] text-white' : 'text-[#94a3c8] hover:text-[#eef2ff]'
                  }`}
                >
                  Right
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.6px] text-[#4a5a82] mb-1.5 block">
              Quick Replies (Max 5)
            </label>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="Type reply option..."
                value={newReply}
                onChange={(e) => setNewReply(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addQuickReply()}
                className="bg-white/[0.05] border border-[rgba(255,255,255,0.07)] rounded-lg px-4 py-2 text-white text-[13px] focus:outline-none focus:border-[#2563eb] flex-1"
              />
              <button
                type="button"
                onClick={addQuickReply}
                className="bg-white/10 hover:bg-white/20 text-[13px] font-semibold text-white px-4 py-2 rounded-lg transition-colors"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {quickReplies.map((qr, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1.5 bg-[#2563eb]/10 border border-[#2563eb]/30 rounded-full px-3 py-1 text-[11.5px] text-[#60a5fa]"
                >
                  <span>{qr}</span>
                  <button
                    type="button"
                    onClick={() => removeQuickReply(i)}
                    className="hover:text-red-400 font-bold"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {quickReplies.length === 0 && (
                <span className="text-[11.5px] text-[#4a5a82] italic">
                  No quick replies configured.
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-[13px] font-semibold px-6 py-2.5 rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Live Preview Panel */}
      <div className="w-full lg:w-[340px] flex flex-col items-center flex-shrink-0">
        <h4 className="text-[11px] font-bold uppercase tracking-[1.2px] text-[#4a5a82] mb-3 align-self-start">
          Live Preview
        </h4>
        <div className="w-[300px] h-[500px] bg-[#04091a] rounded-[32px] border-[6px] border-[#172458] shadow-2xl relative overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-[#0c1535] px-4 py-3 flex items-center gap-2.5 border-b border-white/5 flex-shrink-0">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold text-white uppercase" style={{ backgroundColor: primaryColor }}>
              {botName[0]}
            </div>
            <div>
              <div className="text-[13px] font-bold text-[#eef2ff] leading-none">
                {botName}
              </div>
              <div className="text-[10px] text-[#10b981] mt-0.5 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-[#10b981] rounded-full inline-block" />
                Online
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 p-3 overflow-y-auto space-y-3 flex flex-col justify-end">
            <div className="bg-[#0c1535] border border-white/5 text-[12px] text-[#eef2ff] px-3.5 py-2 rounded-xl max-w-[85%] self-start leading-relaxed">
              {welcomeMessage || 'How can I assist you today?'}
            </div>

            <div className="flex flex-wrap gap-1.5 mt-2 justify-start">
              {quickReplies.map((qr, idx) => (
                <div
                  key={idx}
                  className="bg-white/5 border border-white/10 hover:border-white/20 text-[#94a3c8] text-[10.5px] px-2.5 py-1 rounded-full cursor-default"
                >
                  {qr}
                </div>
              ))}
            </div>
          </div>

          {/* Reply Area */}
          <div className="bg-[#0c1535] p-2 border-t border-white/5 flex items-center gap-2 flex-shrink-0">
            <input
              type="text"
              placeholder="Ask me anything..."
              disabled
              className="bg-white/[0.03] border border-white/5 text-[11px] px-3 py-1.5 rounded-lg flex-1 outline-none text-[#eef2ff]"
            />
            <button
              type="button"
              disabled
              className="text-[11px] font-semibold text-white px-3 py-1.5 rounded-lg flex-shrink-0"
              style={{ backgroundColor: primaryColor }}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
