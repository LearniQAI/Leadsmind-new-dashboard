'use client';

import React, { useState } from 'react';
import { Star, MessageSquare, CheckCircle, ArrowRight, ShieldCheck, ThumbsUp, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { submitPrivateFeedback } from '@/app/actions/reputation_actions';

interface FeedbackClientProps {
  workspaceId: string;
  contactId: string;
  settings: {
    google_review_url: string;
    facebook_review_url: string;
    logo_url: string;
    workspace_name: string;
  };
}

export default function FeedbackClient({ workspaceId, contactId, settings }: FeedbackClientProps) {
  const [rating, setRating] = useState<number | null>(null);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  
  const [name, setName] = useState('');
  const [feedbackText, setFeedbackText] = useState('');
  const [hpField, setHpField] = useState(''); // honeypot — hidden from real users, bots tend to fill every field
  
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<'rating' | 'feedback' | 'success'>('rating');

  const handleRatingSelect = (selectedRating: number) => {
    setRating(selectedRating);
    if (selectedRating >= 4) {
      setStep('success');
      toast.success('Thank you for the positive rating!');
    } else {
      setStep('feedback');
    }
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === null) return;
    
    setSubmitting(true);
    try {
      const res = await submitPrivateFeedback(workspaceId, name, rating, feedbackText, hpField);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success('Feedback submitted privately. Thank you!');
        setStep('success');
      }
    } catch {
      toast.error('Failed to submit feedback');
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-[#04091a] flex flex-col items-center justify-center p-6 text-[#eef2ff] relative overflow-hidden">
      {/* Background ambient glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-600/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-purple-600/10 blur-[150px] rounded-full pointer-events-none" />

      <div className="w-full max-w-lg bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl rounded-3xl p-8 relative z-10 transition-all duration-500 hover:border-white/20">
        
        {/* Workspace Brand Logo / Initials */}
        <div className="flex flex-col items-center text-center mb-8">
          {settings.logo_url ? (
            <img 
              src={settings.logo_url} 
              alt={settings.workspace_name} 
              className="w-16 h-16 rounded-2xl object-cover mb-4 border border-white/10 p-1 bg-slate-950" 
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-xl font-black mb-4 select-none">
              {settings.workspace_name[0]?.toUpperCase()}
            </div>
          )}
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#4a5a82] mb-1">Feedback Portal</h2>
          <h1 className="text-xl font-black uppercase tracking-tight text-white">{settings.workspace_name}</h1>
        </div>

        {/* Rating Step */}
        {step === 'rating' && (
          <div className="space-y-8 text-center animate-fade-in">
            <div>
              <p className="text-sm text-slate-300">How was your recent experience with our business?</p>
              <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider font-semibold">Your rating helps us improve our service</p>
            </div>

            <div className="flex items-center justify-center gap-2 py-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => handleRatingSelect(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(null)}
                  className="p-2 transition-all duration-200 transform hover:scale-125 focus:outline-none"
                >
                  <Star 
                    className={`w-10 h-10 transition-colors ${
                      star <= (hoveredRating ?? 0)
                        ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.3)]'
                        : rating && star <= rating
                        ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.3)]'
                        : 'text-slate-600 hover:text-slate-400'
                    }`}
                  />
                </button>
              ))}
            </div>

            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">
              {hoveredRating === 5 && 'Excellent'}
              {hoveredRating === 4 && 'Good'}
              {hoveredRating === 3 && 'Average'}
              {hoveredRating === 2 && 'Poor'}
              {hoveredRating === 1 && 'Terrible'}
              {!hoveredRating && 'Tap a star to rate'}
            </p>
          </div>
        )}

        {/* Feedback Details Step (1-3 stars) */}
        {step === 'feedback' && (
          <form onSubmit={handleFeedbackSubmit} className="space-y-6 animate-fade-in">
            {/* Honeypot: hidden from real users via CSS + tabIndex, bots filling every field trip this */}
            <input
              type="text"
              name="lm_hp_field"
              value={hpField}
              onChange={(e) => setHpField(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', opacity: 0 }}
            />
            <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl flex items-start gap-3">
              <MessageSquare className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-black uppercase text-amber-400 tracking-wider">Internal Review Submission</h4>
                <p className="text-xs text-slate-300 mt-1">We are sorry to hear your experience wasn't ideal. Please submit your feedback below, and our management team will reach out directly to resolve this.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest text-[#4a5a82]">Your Name (Optional)</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name..."
                  className="bg-white/5 border-white/10 text-white rounded-xl h-11 focus:border-blue-500 focus:bg-slate-900 transition-all text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="feedbackText" className="text-[10px] font-black uppercase tracking-widest text-[#4a5a82]">What went wrong? *</Label>
                <Textarea
                  id="feedbackText"
                  required
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Tell us what we can do to improve..."
                  className="min-h-[120px] bg-white/5 border-white/10 text-white rounded-xl focus:border-blue-500 focus:bg-slate-900 transition-all text-sm leading-relaxed"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 pt-2">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setStep('rating')}
                className="text-xs font-black uppercase text-slate-400 hover:text-white rounded-xl"
              >
                Back
              </Button>
              <Button 
                type="submit" 
                disabled={submitting}
                className="btn-primary rounded-xl font-black uppercase text-xs px-8 h-11 flex items-center gap-2"
              >
                {submitting ? 'Submitting...' : 'Submit Feedback'}
                <Send className="w-3.5 h-3.5" />
              </Button>
            </div>
          </form>
        )}

        {/* Success / Redirection Step (4-5 stars or submitted private feedback) */}
        {step === 'success' && (
          <div className="text-center space-y-8 animate-fade-in">
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-400" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-black uppercase tracking-tight text-white">Thank You!</h3>
              {rating !== null && rating >= 4 ? (
                <p className="text-sm text-slate-300">We appreciate your support! Could you please share your positive rating on our public channels to help others find us?</p>
              ) : (
                <p className="text-sm text-slate-300">Your feedback has been submitted directly to our leadership team. We take all concerns seriously and will look into this immediately.</p>
              )}
            </div>

            {/* Public links for 4-5 stars */}
            {rating !== null && rating >= 4 && (settings.google_review_url || settings.facebook_review_url) ? (
              <div className="space-y-3 pt-2">
                {settings.google_review_url && (
                  <a 
                    href={settings.google_review_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 hover:border-blue-500/50 hover:bg-blue-600/10 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center font-black text-red-500 text-sm">G</span>
                      <span className="text-xs font-black uppercase tracking-wider text-slate-200">Google Review Profile</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                  </a>
                )}
                {settings.facebook_review_url && (
                  <a 
                    href={settings.facebook_review_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 hover:border-blue-500/50 hover:bg-blue-600/10 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-lg bg-blue-600/10 border border-blue-600/20 flex items-center justify-center font-black text-blue-500 text-sm">F</span>
                      <span className="text-xs font-black uppercase tracking-wider text-slate-200">Facebook Review Page</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                  </a>
                )}
              </div>
            ) : null}

            <div className="pt-6 border-t border-white/5 flex items-center justify-center gap-2 text-[10px] text-slate-400">
              <ShieldCheck className="w-4 h-4 text-slate-500" />
              <span>Secure verified feedback loop</span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
