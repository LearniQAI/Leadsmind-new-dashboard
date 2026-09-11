'use client';

import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, CheckCircle2 } from 'lucide-react';
import { submitHelpFeedback } from '@/app/actions/help';
import { toast } from 'sonner';

interface HelpFeedbackProps {
  articleId: string;
  yesInitial: number;
  noInitial: number;
}

export default function HelpFeedback({ articleId, yesInitial, noInitial }: HelpFeedbackProps) {
  const [voted, setVoted] = useState(false);
  const [yesCount, setYesCount] = useState(yesInitial);
  const [noCount, setNoCount] = useState(noInitial);
  const [submitting, setSubmitting] = useState(false);

  const handleVote = async (isHelpful: boolean) => {
    if (voted || submitting) return;
    setSubmitting(true);
    const res = await submitHelpFeedback(articleId, isHelpful);
    setSubmitting(false);
    if (res.success) {
      setVoted(true);
      if (isHelpful) {
        setYesCount(prev => prev + 1);
      } else {
        setNoCount(prev => prev + 1);
      }
    } else {
      toast.error(res.error || 'Failed to submit feedback.');
    }
  };

  return (
    <div className="bg-white border border-dash-border p-6 rounded-2xl flex flex-col items-center text-center space-y-4 shadow-sm">
      {voted ? (
        <div className="flex flex-col items-center space-y-2 py-2">
          <CheckCircle2 className="w-8 h-8 text-green animate-bounce" />
          <h4 className="text-sm font-bold !text-dash-text uppercase tracking-wider">Thank you for your feedback!</h4>
          <p className="text-xs !text-dash-textMuted">Your response helps us improve the LeadsMind system documentation.</p>
        </div>
      ) : (
        <>
          <h4 className="text-sm font-bold !text-dash-text uppercase tracking-wider">Was this article helpful?</h4>
          <p className="text-xs !text-dash-textMuted leading-relaxed max-w-xs">
            Let us know if this guide solved your workspace configuration query.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleVote(true)}
              disabled={submitting}
              className="flex items-center gap-2 text-xs font-bold text-green bg-green/10 hover:bg-green/20 border border-green/20 px-4.5 py-2.5 rounded-xl transition duration-200"
            >
              <ThumbsUp className="w-4 h-4" /> Helpful ({yesCount})
            </button>
            <button
              onClick={() => handleVote(false)}
              disabled={submitting}
              className="flex items-center gap-2 text-xs font-bold text-red bg-red/10 hover:bg-red/20 border border-red/20 px-4.5 py-2.5 rounded-xl transition duration-200"
            >
              <ThumbsDown className="w-4 h-4" /> Not Helpful ({noCount})
            </button>
          </div>
        </>
      )}
    </div>
  );
}
