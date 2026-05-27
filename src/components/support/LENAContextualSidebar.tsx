'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { AlertCircle, ShieldAlert, Sparkles, X, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function LENAContextualSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab');

  const [isVisible, setIsVisible] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  const [isPurged, setIsPurged] = useState(false);
  const [view, setView] = useState<'analytics' | 'deliverability' | null>(null);

  useEffect(() => {
    // Determine active context based on pathname and search parameters
    if (pathname.startsWith('/campaigns')) {
      setView('analytics');
      setIsVisible(true);
    } else if (pathname.startsWith('/settings') && activeTab === 'domains') {
      setView('deliverability');
      setIsVisible(true);
    } else {
      setIsVisible(false);
      setView(null);
    }
  }, [pathname, activeTab]);

  const handlePurge = async () => {
    setIsPurging(true);
    // Simulate domain purging action (2 seconds)
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsPurging(false);
    setIsPurged(true);
    toast.success('Purged 847 inactive domains successfully!');
  };

  if (!isVisible || !view) return null;

  return (
    <>
      <style>{`
        .context-glass {
          background: rgba(8, 15, 40, 0.85);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(139, 92, 246, 0.25);
          box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.3), 0 0 20px 2px rgba(139, 92, 246, 0.1);
        }
        .slide-up-alert {
          animation: slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes slide-up {
          from { transform: translateY(30px) scale(0.95); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }
      `}</style>

      <div className="fixed bottom-24 right-6 z-[100] w-80 max-w-sm rounded-2xl context-glass p-5 text-white font-dm-sans slide-up-alert">
        <div className="flex justify-between items-start gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-purple-200">
              <Sparkles className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-[#8b5cf6]">LENA Proactive AI</span>
              <h5 className="text-xs font-bold text-white uppercase tracking-tight -mt-0.5">Workspace Diagnostic Notice</h5>
            </div>
          </div>
          <button 
            onClick={() => setIsVisible(false)}
            className="p-1 hover:bg-white/5 rounded-lg text-white/40 hover:text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {view === 'analytics' ? (
          <div className="space-y-3.5">
            <div className="flex gap-2.5 items-start">
              <AlertCircle className="w-4 h-4 text-amber shrink-0 mt-0.5" />
              <p className="text-[11.5px] leading-relaxed text-white/80 font-medium">
                Your click-through rate dropped <strong className="text-amber">8%</strong> because your subject lines averaged <strong className="text-white">12 words longer</strong> than your historic bests.
              </p>
            </div>
            <div className="flex justify-end pt-1">
              <button 
                onClick={() => {
                  toast.info('Suggesting copy optimizations inside LENA main chat...');
                  // Open main LENA Chat or display suggestion
                }}
                className="px-3 py-1.5 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white text-[10px] font-black uppercase tracking-wider rounded-lg transition-all"
              >
                Optimize Copy
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3.5">
            <div className="flex gap-2.5 items-start">
              <ShieldAlert className="w-4 h-4 text-red shrink-0 mt-0.5" />
              <p className="text-[11.5px] leading-relaxed text-white/80 font-medium">
                {isPurged 
                  ? "Your system bounce risk is now mitigated. 847 inactive domains have been purged from database suppressions."
                  : "Your system hard-bounce rate is sitting at 2.3%. I've flagged 847 inactive domains; would you like me to purge them now?"
                }
              </p>
            </div>
            {!isPurged && (
              <div className="flex justify-end gap-2 pt-1">
                <button
                  disabled={isPurging}
                  onClick={handlePurge}
                  className="px-3.5 py-1.5 bg-red hover:bg-red/90 disabled:opacity-50 text-white text-[10px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center gap-1.5"
                >
                  {isPurging ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Purging...
                    </>
                  ) : (
                    <>
                      <Check className="w-3 h-3" />
                      Purge Domains
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
