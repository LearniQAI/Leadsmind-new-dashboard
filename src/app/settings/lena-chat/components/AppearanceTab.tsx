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
    return <div className="h-40 bg-dash-surface animate-pulse motion-reduce:animate-none rounded-xl" />;
  }

  return (
    <div className="flex flex-col lg:flex-row gap-8 items-start w-full">
      {/* Editor Panel */}
      <div className="flex-1 bg-white border border-dash-border rounded-xl p-6 space-y-5 shadow-sm">
        <h3 className="text-[14px] font-semibold !text-dash-text mb-2">
          Widget settings
        </h3>

        {message && (
          <div className={`p-3 rounded-lg text-[12px] ${
            message.type === 'success' ? 'bg-green/10 text-green' : 'bg-red/10 text-red'
          }`}>
            {message.text}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-semibold !text-dash-textMuted mb-1.5 block">
              Bot name
            </label>
            <input
              type="text"
              value={botName}
              onChange={(e) => setBotName(e.target.value)}
              className="bg-white border border-dash-border rounded-lg px-4 py-2 !text-dash-text text-[13px] focus:outline-none focus:border-dash-accent transition-colors motion-reduce:transition-none w-full"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold !text-dash-textMuted mb-1.5 block">
              Welcome message
            </label>
            <textarea
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              rows={3}
              className="bg-white border border-dash-border rounded-lg px-4 py-2 !text-dash-text text-[13px] focus:outline-none focus:border-dash-accent transition-colors motion-reduce:transition-none w-full resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-semibold !text-dash-textMuted mb-1.5 block">
                Primary color
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-10 h-10 border border-dash-border rounded bg-white cursor-pointer"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="bg-white border border-dash-border rounded-lg px-3 py-2 !text-dash-text text-[13px] focus:outline-none focus:border-dash-accent transition-colors motion-reduce:transition-none flex-1"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold !text-dash-textMuted mb-1.5 block">
                Position
              </label>
              <div className="flex bg-dash-surface p-1 rounded-lg border border-dash-border">
                <button
                  type="button"
                  onClick={() => setPosition('left')}
                  className={`flex-1 py-1.5 text-[12px] font-semibold rounded-md transition-colors motion-reduce:transition-none ${
                    position === 'left' ? 'bg-dash-accent text-white' : '!text-dash-textMuted hover:!text-dash-text'
                  }`}
                >
                  Left
                </button>
                <button
                  type="button"
                  onClick={() => setPosition('right')}
                  className={`flex-1 py-1.5 text-[12px] font-semibold rounded-md transition-colors motion-reduce:transition-none ${
                    position === 'right' ? 'bg-dash-accent text-white' : '!text-dash-textMuted hover:!text-dash-text'
                  }`}
                >
                  Right
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold !text-dash-textMuted mb-1.5 block">
              Quick replies (max 5)
            </label>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="Type reply option..."
                value={newReply}
                onChange={(e) => setNewReply(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addQuickReply()}
                className="bg-white border border-dash-border rounded-lg px-4 py-2 !text-dash-text text-[13px] focus:outline-none focus:border-dash-accent transition-colors motion-reduce:transition-none flex-1"
              />
              <button
                type="button"
                onClick={addQuickReply}
                className="bg-dash-surface hover:bg-dash-border/60 border border-dash-border text-[13px] font-semibold !text-dash-text px-4 py-2 rounded-lg transition-colors motion-reduce:transition-none"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {quickReplies.map((qr, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1.5 bg-dash-accent/10 border border-dash-accent/30 rounded-full px-3 py-1 text-[11.5px] text-dash-accent"
                >
                  <span>{qr}</span>
                  <button
                    type="button"
                    onClick={() => removeQuickReply(i)}
                    className="hover:text-red font-bold"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {quickReplies.length === 0 && (
                <span className="text-[11.5px] !text-dash-textMuted italic">
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
            className="bg-dash-accent hover:bg-dash-accent/90 text-white text-[13px] font-semibold px-6 py-2.5 rounded-lg transition-colors motion-reduce:transition-none disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </div>

      {/* Live Preview Panel */}
      <div className="w-full lg:w-[340px] flex flex-col items-center flex-shrink-0">
        <h4 className="text-[11px] font-bold !text-dash-textMuted mb-3 align-self-start">
          Live preview
        </h4>
        <div className="w-[300px] h-[500px] bg-white rounded-[32px] border-[6px] border-dash-border shadow-2xl relative overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-dash-surface px-4 py-3 flex items-center gap-2.5 border-b border-dash-border flex-shrink-0">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold text-white uppercase" style={{ backgroundColor: primaryColor }}>
              {botName[0]}
            </div>
            <div>
              <div className="text-[13px] font-bold !text-dash-text leading-none">
                {botName}
              </div>
              <div className="text-[10px] text-green mt-0.5 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green rounded-full inline-block" />
                Online
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 p-3 overflow-y-auto space-y-3 flex flex-col justify-end">
            <div className="bg-dash-surface border border-dash-border text-[12px] !text-dash-text px-3.5 py-2 rounded-xl max-w-[85%] self-start leading-relaxed">
              {welcomeMessage || 'How can I assist you today?'}
            </div>

            <div className="flex flex-wrap gap-1.5 mt-2 justify-start">
              {quickReplies.map((qr, idx) => (
                <div
                  key={idx}
                  className="bg-dash-surface border border-dash-border hover:border-dash-accent/30 transition-colors motion-reduce:transition-none !text-dash-textMuted text-[10.5px] px-2.5 py-1 rounded-full cursor-default"
                >
                  {qr}
                </div>
              ))}
            </div>
          </div>

          {/* Reply Area */}
          <div className="bg-dash-surface p-2 border-t border-dash-border flex items-center gap-2 flex-shrink-0">
            <input
              type="text"
              placeholder="Ask me anything..."
              disabled
              className="bg-white border border-dash-border text-[11px] px-3 py-1.5 rounded-lg flex-1 outline-none !text-dash-text"
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
