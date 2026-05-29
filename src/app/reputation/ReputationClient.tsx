'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Star, MessageSquare, Globe, Search, Pencil, Trash2, MoreVertical,
  CheckCircle, Reply, Settings, Send, Layout, Copy, Check
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { getReputationSettings, saveReputationSettings, sendReviewRequest } from '@/app/actions/reputation_actions';
import { cn } from '@/lib/utils';

export default function ReputationClient({ 
  initialReviews, 
  workspaceId 
}: { 
  initialReviews: any[]; 
  workspaceId: string; 
}) {
  const [reviews, setReviews] = useState<any[]>(initialReviews);
  const [search, setSearch] = useState('');

  // Response Modal State
  const [respondOpen, setRespondOpen] = useState(false);
  const [respondTarget, setRespondTarget] = useState<any>(null);
  const [responseText, setResponseText] = useState('');
  const [responding, setResponding] = useState(false);

  // Delete Modal State
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);

  // Settings Modal State
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [googleUrl, setGoogleUrl] = useState('');
  const [facebookUrl, setFacebookUrl] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);

  // Campaign Modal State
  const [campaignOpen, setCampaignOpen] = useState(false);
  const [contacts, setContacts] = useState<any[]>([]);
  const [selectedContactId, setSelectedContactId] = useState('');
  const [selectedChannel, setSelectedChannel] = useState<'email' | 'sms' | 'whatsapp'>('email');
  const [sendingCampaign, setSendingCampaign] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(false);

  // Widget Embed Code Modal State
  const [widgetOpen, setWidgetOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Calculate statistics
  const avgRating = reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : '0.0';

  const reviewsVolumeTrend = reviews.length;
  
  const positiveCount = reviews.filter(r => r.rating >= 4).length;
  const negativeCount = reviews.filter(r => r.rating <= 3).length;

  // Load Settings & Contacts
  useEffect(() => {
    if (settingsOpen) {
      getReputationSettings().then(res => {
        if (res.data) {
          setGoogleUrl(res.data.google_review_url || '');
          setFacebookUrl(res.data.facebook_review_url || '');
        }
      });
    }
  }, [settingsOpen]);

  useEffect(() => {
    if (campaignOpen) {
      setLoadingContacts(true);
      import('@/app/actions/finance')
        .then(({ getContactsForInvoicing }) => getContactsForInvoicing(workspaceId))
        .then(res => {
          setContacts(res || []);
          setLoadingContacts(false);
        })
        .catch(() => {
          toast.error('Failed to load contacts');
          setLoadingContacts(false);
        });
    }
  }, [campaignOpen, workspaceId]);

  const handleRespond = async () => {
    if (!responseText.trim()) { toast.error('Please write a response'); return; }
    setResponding(true);
    try {
      const { respondToReview } = await import('@/app/actions/reputation_actions');
      const res = await respondToReview(respondTarget.id, responseText);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success('Response saved!');
        setReviews(prev => prev.map(r => r.id === respondTarget.id ? { ...r, reply_text: responseText, replied: true } : r));
        setRespondOpen(false);
        setResponseText('');
      }
    } catch {
      toast.error('Failed to save response');
    }
    setResponding(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { deleteReview } = await import('@/app/actions/reputation_actions');
      const res = await deleteReview(deleteTarget.id);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success('Review removed');
        setReviews(prev => prev.filter(r => r.id !== deleteTarget.id));
        setDeleteOpen(false);
      }
    } catch {
      toast.error('Delete failed');
    }
    setDeleting(false);
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    const res = await saveReputationSettings({ google_review_url: googleUrl, facebook_review_url: facebookUrl });
    setSavingSettings(false);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success('Review links updated successfully');
      setSettingsOpen(false);
    }
  };

  const handleSendCampaign = async () => {
    if (!selectedContactId) { toast.error('Please select a contact'); return; }
    setSendingCampaign(true);
    const res = await sendReviewRequest(selectedContactId, selectedChannel);
    setSendingCampaign(false);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success(`Review request dispatched via ${selectedChannel.toUpperCase()}!`);
      setCampaignOpen(false);
      setSelectedContactId('');
    }
  };

  const widgetIframeCode = `<iframe src="${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/widget/reviews?workspaceId=${workspaceId}" width="100%" height="220" style="border:none; border-radius: 24px; background: transparent;" frameborder="0"></iframe>`;

  const copyWidgetCode = () => {
    navigator.clipboard.writeText(widgetIframeCode);
    setCopied(true);
    toast.success('Embed code copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const filtered = reviews.filter(r =>
    !search || r.reviewer_name?.toLowerCase().includes(search.toLowerCase()) || r.body?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 text-slate-100">
      
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight text-white font-space-grotesk">
            Reputation <span className="text-[#3b82f6]">Manager</span>
          </h1>
          <p className="text-[11px] font-medium text-[#4a5a82] uppercase tracking-[0.2em] mt-1.5 font-dm-sans">
            Monitor, connect integrations, and trigger review campaigns.
          </p>
        </div>
        
        <div className="flex items-center flex-wrap gap-3">
          <Button 
            onClick={() => setWidgetOpen(true)} 
            variant="outline" 
            className="bg-white/5 border-white/5 hover:bg-white/10 text-white rounded-xl h-11 text-xs font-black uppercase tracking-widest flex items-center gap-2"
          >
            <Layout className="w-4 h-4 text-emerald-400" />
            Get Widget
          </Button>
          <Button 
            onClick={() => setSettingsOpen(true)} 
            variant="outline" 
            className="bg-white/5 border-white/5 hover:bg-white/10 text-white rounded-xl h-11 text-xs font-black uppercase tracking-widest flex items-center gap-2"
          >
            <Settings className="w-4 h-4 text-blue-400" />
            Links Setup
          </Button>
          <Button 
            onClick={() => setCampaignOpen(true)} 
            className="btn-primary rounded-xl h-11 text-xs font-black uppercase tracking-widest flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            Send Request
          </Button>
        </div>
      </div>

      {/* Overview Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white/5 border border-white/5 rounded-2xl p-6 relative overflow-hidden backdrop-blur-md">
          <div className="absolute top-[-50px] right-[-50px] w-24 h-24 bg-blue-500/10 rounded-full blur-2xl" />
          <p className="text-[10px] font-black uppercase tracking-widest text-[#4a5a82] mb-1">Average Score</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">{avgRating}</span>
            <span className="text-sm font-bold text-[#4a5a82]">/ 5.0</span>
          </div>
          <div className="flex items-center gap-0.5 mt-2">
            {[1, 2, 3, 4, 5].map(i => (
              <Star key={i} className={`w-3.5 h-3.5 ${i <= Math.round(Number(avgRating)) ? 'fill-amber-400 text-amber-400' : 'text-slate-700'}`} />
            ))}
          </div>
        </div>

        <div className="bg-white/5 border border-white/5 rounded-2xl p-6 relative overflow-hidden backdrop-blur-md">
          <p className="text-[10px] font-black uppercase tracking-widest text-[#4a5a82] mb-1">Total Reviews</p>
          <span className="text-3xl font-black text-white">{reviewsVolumeTrend}</span>
          <p className="text-[9px] text-[#4a5a82] font-semibold mt-2 uppercase tracking-wider">Sync fully operational</p>
        </div>

        <div className="bg-white/5 border border-white/5 rounded-2xl p-6 relative overflow-hidden backdrop-blur-md">
          <p className="text-[10px] font-black uppercase tracking-widest text-[#4a5a82] mb-1">Positive Reviews</p>
          <span className="text-3xl font-black text-emerald-400">{positiveCount}</span>
          <p className="text-[9px] text-emerald-400/80 font-bold mt-2 uppercase tracking-wider">
            {reviewsVolumeTrend > 0 ? ((positiveCount / reviewsVolumeTrend) * 100).toFixed(0) : 0}% Satisfaction
          </p>
        </div>

        <div className="bg-white/5 border border-white/5 rounded-2xl p-6 relative overflow-hidden backdrop-blur-md">
          <p className="text-[10px] font-black uppercase tracking-widest text-[#4a5a82] mb-1">Private Feedback</p>
          <span className="text-3xl font-black text-amber-400">{negativeCount}</span>
          <p className="text-[9px] text-amber-400/80 font-bold mt-2 uppercase tracking-wider">Held privately in CRM</p>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
        <Input 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
          placeholder="Search reviews by reviewer name or content..." 
          className="pl-11 h-12 bg-white/5 border-white/10 hover:border-white/20 text-white rounded-xl placeholder:text-slate-500 outline-none focus-visible:ring-0 focus-visible:border-blue-500/50 focus-visible:ring-offset-0 text-sm transition-all" 
        />
      </div>

      {/* Reviews Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filtered.length === 0 ? (
          <div className="col-span-full py-20 bg-white/[0.02] border-2 border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-blue-600/10 rounded-full flex items-center justify-center mb-6 border border-blue-500/20">
              <Star className="w-8 h-8 text-blue-400" />
            </div>
            <h3 className="text-sm font-black uppercase text-slate-400 tracking-widest">No Reviews Found</h3>
            <p className="text-slate-500 text-[10px] font-bold mt-2 uppercase tracking-widest">Connect review profiles or share your feedback link</p>
          </div>
        ) : filtered.map(review => (
          <div key={review.id} className="bg-white/5 border border-white/5 rounded-2xl p-6 flex flex-col justify-between hover:border-white/10 transition-all duration-300 shadow-xl relative group">
            
            <div>
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-black text-xs select-none">
                    {review.reviewer_name?.[0] || 'A'}
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white uppercase tracking-tight">{review.reviewer_name}</h4>
                    <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">
                      {review.review_date ? new Date(review.review_date).toLocaleDateString() : '—'}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider border shrink-0",
                    review.platform === 'google' 
                      ? "bg-red-500/5 text-red-400 border-red-500/10" 
                      : review.platform === 'facebook' 
                      ? "bg-blue-500/5 text-blue-400 border-blue-500/10" 
                      : "bg-amber-500/5 text-amber-400 border-amber-500/10"
                  )}>
                    {review.platform || 'internal'}
                  </span>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="h-7 w-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
                        <MoreVertical size={13} className="text-slate-400" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-[#0f172a] border border-white/10 shadow-2xl rounded-xl min-w-[150px] text-slate-200">
                      <DropdownMenuItem 
                        onClick={() => { setRespondTarget(review); setResponseText(review.reply_text || ''); setRespondOpen(true); }} 
                        className="flex items-center gap-2 cursor-pointer hover:bg-white/5 rounded-lg mx-1 px-3 py-2 text-xs"
                      >
                        <Reply size={13} className="text-blue-400" /> Respond
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => { setDeleteTarget(review); setDeleteOpen(true); }} 
                        className="flex items-center gap-2 cursor-pointer text-rose-400 hover:bg-rose-500/10 rounded-lg mx-1 px-3 py-2 text-xs"
                      >
                        <Trash2 size={13} /> Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Rating stars */}
              <div className="flex items-center gap-0.5 mb-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <Star key={i} className={`w-3.5 h-3.5 ${i <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-700'}`} />
                ))}
              </div>

              <p className="text-xs text-slate-300 leading-relaxed italic mb-4">
                "{review.body || 'No review message left.'}"
              </p>

              {/* Admin reply detail */}
              {review.reply_text && (
                <div className="p-3.5 bg-blue-500/5 border border-blue-500/10 rounded-xl mb-4">
                  <p className="text-[8px] font-black uppercase tracking-widest text-blue-400 mb-1">Your Response</p>
                  <p className="text-[11px] text-slate-300 leading-relaxed">{review.reply_text}</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-white/5 shrink-0">
              <span className={cn(
                "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[8.5px] font-black uppercase tracking-wider",
                review.replied 
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                  : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
              )}>
                {review.replied ? 'Responded' : 'Awaiting Reply'}
              </span>
              <Button 
                onClick={() => { setRespondTarget(review); setResponseText(review.reply_text || ''); setRespondOpen(true); }} 
                variant="outline" 
                className="h-8 px-3 rounded-lg border-white/5 bg-white/5 hover:bg-white/10 text-[9px] font-black uppercase tracking-wider text-slate-300 hover:text-white flex items-center gap-1.5"
              >
                <Reply size={10} /> {review.reply_text ? 'Edit Reply' : 'Reply'}
              </Button>
            </div>

          </div>
        ))}
      </div>

      {/* Response Dialog */}
      <Dialog open={respondOpen} onOpenChange={setRespondOpen}>
        <DialogContent className="bg-[#0b0f19] border border-white/10 rounded-2xl max-w-lg p-6 shadow-2xl text-slate-200">
          <DialogHeader>
            <DialogTitle className="text-md font-black uppercase tracking-tight text-white flex items-center gap-2">
              <Reply className="w-5 h-5 text-blue-500" />
              Respond to <span className="text-blue-400">{respondTarget?.reviewer_name}</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            {respondTarget && (
              <div className="p-4 bg-white/[0.02] rounded-xl border border-white/5 text-xs text-slate-300 italic">
                <div className="flex items-center gap-0.5 mb-2 select-none">
                  {[1, 2, 3, 4, 5].map(i => (
                    <Star key={i} className={`w-3 h-3 ${i <= respondTarget.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-700'}`} />
                  ))}
                </div>
                "{respondTarget.body}"
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-[#4a5a82]">Your Response</Label>
              <Textarea 
                value={responseText} 
                onChange={e => setResponseText(e.target.value)} 
                placeholder="Thank you for sharing your experience with us..." 
                className="min-h-[110px] bg-white/5 border-white/10 text-white rounded-xl text-xs placeholder:text-slate-500 focus-visible:ring-0 focus-visible:border-blue-500/50" 
              />
            </div>
          </div>
          
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setRespondOpen(false)} className="text-slate-300 hover:text-white rounded-xl">Cancel</Button>
            <Button onClick={handleRespond} disabled={responding} className="btn-primary rounded-xl font-black uppercase text-xs px-6 h-10">{responding ? 'Saving...' : 'Save Response'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="bg-[#0b0f19] border border-white/10 rounded-2xl max-w-sm p-6 shadow-2xl text-slate-200">
          <DialogHeader>
            <DialogTitle className="text-md font-black uppercase tracking-tight text-white">Remove Review?</DialogTitle>
          </DialogHeader>
          <p className="text-slate-400 text-xs py-2 leading-relaxed">
            This will permanently remove the review from <strong className="text-white">{deleteTarget?.reviewer_name}</strong> from your local reputation manager list.
          </p>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="ghost" onClick={() => setDeleteOpen(false)} className="text-slate-300 hover:text-white rounded-xl">Cancel</Button>
            <Button onClick={handleDelete} disabled={deleting} className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black uppercase text-xs px-6 h-10">{deleting ? 'Removing...' : 'Remove'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog (Review links configuration) */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="bg-[#0b0f19] border border-white/10 rounded-2xl max-w-md p-6 shadow-2xl text-slate-200">
          <DialogHeader>
            <DialogTitle className="text-md font-black uppercase tracking-tight text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-500" />
              Public Review Links Setup
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <p className="text-xs text-slate-400 leading-relaxed">
              Define the public URLs for your business profiles. Positive ratings (4-5 stars) will be prompted to redirect to these links.
            </p>
            
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="googleUrl" className="text-[10px] font-black uppercase tracking-widest text-[#4a5a82]">Google Review Profile Link</Label>
                <Input
                  id="googleUrl"
                  value={googleUrl}
                  onChange={e => setGoogleUrl(e.target.value)}
                  placeholder="https://g.page/r/YOUR_PROFILE/review"
                  className="bg-white/5 border-white/10 text-white text-xs h-10 rounded-xl placeholder:text-slate-500 focus-visible:ring-0 focus-visible:border-blue-500/50"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="facebookUrl" className="text-[10px] font-black uppercase tracking-widest text-[#4a5a82]">Facebook Review Page Link</Label>
                <Input
                  id="facebookUrl"
                  value={facebookUrl}
                  onChange={e => setFacebookUrl(e.target.value)}
                  placeholder="https://www.facebook.com/YOUR_PAGE/reviews"
                  className="bg-white/5 border-white/10 text-white text-xs h-10 rounded-xl placeholder:text-slate-500 focus-visible:ring-0 focus-visible:border-blue-500/50"
                />
              </div>
            </div>
          </div>
          
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setSettingsOpen(false)} className="text-slate-300 hover:text-white rounded-xl">Cancel</Button>
            <Button onClick={handleSaveSettings} disabled={savingSettings} className="btn-primary rounded-xl font-black uppercase text-xs px-6 h-10">{savingSettings ? 'Saving...' : 'Save Settings'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Campaign Dialog (Send Review Campaign) */}
      <Dialog open={campaignOpen} onOpenChange={setCampaignOpen}>
        <DialogContent className="bg-[#0b0f19] border border-white/10 rounded-2xl max-w-md p-6 shadow-2xl text-slate-200">
          <DialogHeader>
            <DialogTitle className="text-md font-black uppercase tracking-tight text-white flex items-center gap-2">
              <Send className="w-5 h-5 text-blue-500" />
              Trigger Review Campaign
            </DialogTitle>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-[#4a5a82]">Select Contact</Label>
              {loadingContacts ? (
                <div className="text-xs text-slate-400 italic">Searching database nodes...</div>
              ) : (
                <select
                  value={selectedContactId}
                  onChange={e => setSelectedContactId(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 h-10 text-xs text-white outline-none cursor-pointer focus:border-blue-500/50"
                >
                  <option value="" disabled className="bg-slate-900">-- Choose Contact --</option>
                  {contacts.map(c => (
                    <option key={c.id} value={c.id} className="bg-slate-900 text-xs">
                      {c.first_name} {c.last_name} ({c.email || c.phone || 'No Contact Info'})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-[#4a5a82]">Dispatch Channel</Label>
              <div className="grid grid-cols-3 gap-2">
                {(['email', 'sms', 'whatsapp'] as const).map(channel => (
                  <button
                    key={channel}
                    type="button"
                    onClick={() => setSelectedChannel(channel)}
                    className={cn(
                      "h-10 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all",
                      selectedChannel === channel
                        ? "bg-blue-600/10 border-blue-500/50 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.15)]"
                        : "bg-white/5 border-white/5 text-slate-400 hover:border-white/10"
                    )}
                  >
                    {channel}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setCampaignOpen(false)} className="text-slate-300 hover:text-white rounded-xl">Cancel</Button>
            <Button onClick={handleSendCampaign} disabled={sendingCampaign || !selectedContactId} className="btn-primary rounded-xl font-black uppercase text-xs px-6 h-10">{sendingCampaign ? 'Sending...' : 'Send Request'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Widget Embed Code Dialog */}
      <Dialog open={widgetOpen} onOpenChange={setWidgetOpen}>
        <DialogContent className="bg-[#0b0f19] border border-white/10 rounded-2xl max-w-lg p-6 shadow-2xl text-slate-200">
          <DialogHeader>
            <DialogTitle className="text-md font-black uppercase tracking-tight text-white flex items-center gap-2">
              <Layout className="w-5 h-5 text-emerald-500" />
              Embed Carousel Widget
            </DialogTitle>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <p className="text-xs text-slate-400 leading-relaxed">
              Showcase your positive reviews (rating &gt;= 4) directly on your storefront website by copying and pasting the non-blocking iframe code block below:
            </p>

            <div className="bg-slate-950 p-4 rounded-xl border border-white/5 font-mono text-[11px] text-slate-300 relative select-all break-all pr-12 leading-relaxed">
              {widgetIframeCode}
              <button 
                onClick={copyWidgetCode}
                className="absolute right-3 top-3 h-8 w-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center border border-white/5 hover:border-white/10 transition-all active:scale-95"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              </button>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setWidgetOpen(false)} className="btn-primary rounded-xl font-black uppercase text-xs px-6 h-10">Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
