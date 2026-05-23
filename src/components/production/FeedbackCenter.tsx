'use client';

import React, { useState } from 'react';
import { MessageSquarePlus, Bug, Lightbulb, Send } from 'lucide-react';
import { submitPlatformFeedback } from '@/app/actions/production-workspace';

export function FeedbackCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState('bug');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    
    await submitPlatformFeedback({
      feedback_type: type,
      content,
      route_context: window.location.pathname,
      browser_info: { userAgent: navigator.userAgent }
    });
    
    setStatus('success');
    setTimeout(() => {
      setIsOpen(false);
      setStatus('idle');
      setContent('');
    }, 2000);
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 p-4 bg-accent hover:bg-accent-hover text-white rounded-full shadow-2xl transition-all hover:scale-105 z-50 group"
      >
        <MessageSquarePlus size={24} />
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end justify-end p-6">
          <div className="bg-n800 border border-white/10 rounded-3xl p-6 w-[400px] shadow-2xl animate-in slide-in-from-bottom-10">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-space font-bold text-white text-lg">Send Feedback</h3>
              <button onClick={() => setIsOpen(false)} className="text-t4 hover:text-white transition-colors">Close</button>
            </div>

            {status === 'success' ? (
              <div className="py-12 text-center">
                <p className="text-emerald-400 font-bold mb-2">Thank you!</p>
                <p className="text-t4 text-sm">Your feedback helps harden LeadsMind.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex gap-2">
                  <button type="button" onClick={() => setType('bug')} className={`flex-1 py-2 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest transition-colors ${type === 'bug' ? 'bg-red-500/20 border-red-500/30 text-red-400' : 'bg-n900 border-white/5 text-t4 hover:text-white'}`}>
                    <Bug size={14} /> Issue
                  </button>
                  <button type="button" onClick={() => setType('feature_request')} className={`flex-1 py-2 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest transition-colors ${type === 'feature_request' ? 'bg-blue-500/20 border-blue-500/30 text-blue-400' : 'bg-n900 border-white/5 text-t4 hover:text-white'}`}>
                    <Lightbulb size={14} /> Request
                  </button>
                </div>
                
                <textarea 
                  required
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Describe the issue or feature request in detail..."
                  className="w-full bg-n900 border border-white/10 rounded-xl p-4 text-sm text-white placeholder:text-t4 focus:border-accent/50 focus:outline-none resize-none h-[120px]"
                />

                <button 
                  disabled={status === 'submitting'}
                  type="submit" 
                  className="w-full py-3 bg-white text-n900 hover:bg-white/90 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                >
                  {status === 'submitting' ? 'Submitting...' : <><Send size={16} /> Submit Report</>}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
