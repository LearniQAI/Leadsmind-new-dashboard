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
    <div className="min-h-screen bg-dash-bg flex flex-col items-center justify-center p-6 text-dash-text relative overflow-hidden">
      {/* Background ambient glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-500/5 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-purple-500/5 blur-[150px] rounded-full pointer-events-none" />

      <div className="w-full max-w-lg bg-white border border-dash-border shadow-xl rounded-3xl p-8 relative z-10 transition-all duration-500 hover:border-dash-text/15">

        {/* Workspace Brand Logo / Initials */}
        <div className="flex flex-col items-center text-center mb-8">
          {settings.logo_url ? (
            <img
              src={settings.logo_url}
              alt={settings.workspace_name}
              className="w-16 h-16 rounded-2xl object-cover mb-4 border border-dash-border p-1 bg-dash-surface"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 text-xl font-black mb-4 select-none">
              {settings.workspace_name[0]?.toUpperCase()}
            </div>
          )}
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-dash-textMuted mb-1">Feedback Portal</h2>
          <h1 className="text-xl font-black uppercase tracking-tight text-dash-text">{settings.workspace_name}</h1>
        </div>

        {/* Rating Step */}
        {step === 'rating' && (
          <div className="space-y-8 text-center animate-fade-in">
            <div>
              <p className="text-sm text-dash-text/80">How was your recent experience with our business?</p>
              <p className="text-[10px] text-dash-textMuted mt-1 uppercase tracking-wider font-semibold">Your rating helps us improve our service</p>
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
                        : 'text-dash-border hover:text-dash-textMuted'
                    }`}
                  />
                </button>
              ))}
            </div>

            <p className="text-[10px] text-dash-textMuted uppercase tracking-widest font-black">
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
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
              <MessageSquare className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-black uppercase text-amber-600 tracking-wider">Internal Review Submission</h4>
                <p className="text-xs text-dash-text/80 mt-1">We are sorry to hear your experience wasn't ideal. Please submit your feedback below, and our management team will reach out directly to resolve this.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest text-dash-textMuted">Your Name (Optional)</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name..."
                  className="bg-dash-surface border-dash-border text-dash-text rounded-xl h-11 focus:border-blue-500 focus:bg-white transition-all text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="feedbackText" className="text-[10px] font-black uppercase tracking-widest text-dash-textMuted">What went wrong? *</Label>
                <Textarea
                  id="feedbackText"
                  required
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Tell us what we can do to improve..."
                  className="min-h-[120px] bg-dash-surface border-dash-border text-dash-text rounded-xl focus:border-blue-500 focus:bg-white transition-all text-sm leading-relaxed"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep('rating')}
                className="text-xs font-black uppercase text-dash-textMuted hover:text-dash-text rounded-xl"
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
            <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-black uppercase tracking-tight text-dash-text">Thank You!</h3>
              {rating !== null && rating >= 4 ? (
                <p className="text-sm text-dash-text/80">We appreciate your support! Could you please share your positive rating on our public channels to help others find us?</p>
              ) : (
                <p className="text-sm text-dash-text/80">Your feedback has been submitted directly to our leadership team. We take all concerns seriously and will look into this immediately.</p>
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
                    className="w-full flex items-center justify-between p-4 rounded-xl bg-dash-surface border border-dash-border hover:border-blue-300 hover:bg-blue-50 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center font-black text-red-600 text-sm">G</span>
                      <span className="text-xs font-black uppercase tracking-wider text-dash-text">Google Review Profile</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-dash-textMuted group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                  </a>
                )}
                {settings.facebook_review_url && (
                  <a
                    href={settings.facebook_review_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-between p-4 rounded-xl bg-dash-surface border border-dash-border hover:border-blue-300 hover:bg-blue-50 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center font-black text-blue-600 text-sm">F</span>
                      <span className="text-xs font-black uppercase tracking-wider text-dash-text">Facebook Review Page</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-dash-textMuted group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                  </a>
                )}
              </div>
            ) : null}

            <div className="pt-6 border-t border-dash-border flex items-center justify-center gap-2 text-[10px] text-dash-textMuted">
              <ShieldCheck className="w-4 h-4 text-dash-textMuted" />
              <span>Secure verified feedback loop</span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
