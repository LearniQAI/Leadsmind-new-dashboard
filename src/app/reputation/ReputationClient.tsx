'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Star, Search, Trash2, MoreVertical,
  Reply, Settings, Send, Layout, Copy, Check, Plus, AlertCircle, RefreshCw
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { getReputationSettings, saveReputationSettings, syncReviewsAction } from '@/app/actions/reputation_actions';
import { cn } from '@/lib/utils';
import { useDashboardContext } from '@/components/layouts/DashboardProvider';

export default function ReputationClient({ 
  initialReviews 
}: { 
  initialReviews: any[]; 
}) {
  const { workspace } = useDashboardContext();
  const workspaceId = workspace?.id || null;

  const [activeTab, setActiveTab] = useState<'reviews' | 'campaigns'>('reviews');
  const [reviews, setReviews] = useState<any[]>(initialReviews);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
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
  const [syncing, setSyncing] = useState(false);

  // Send Request Modal State
  const [sendRequestOpen, setSendRequestOpen] = useState(false);
  const [contacts, setContacts] = useState<any[]>([]);
  const [selectedContactId, setSelectedContactId] = useState('');
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [selectedChannel, setSelectedChannel] = useState<'email' | 'sms' | 'whatsapp'>('email');
  const [sendingRequest, setSendingRequest] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(false);

  // Create Campaign Modal State
  const [createCampaignOpen, setCreateCampaignOpen] = useState(false);
  const [campaignName, setCampaignName] = useState('');
  const [campaignPlatform, setCampaignPlatform] = useState<'google' | 'facebook' | 'trustpilot' | 'hellopeter' | 'custom'>('google');
  const [campaignReviewUrl, setCampaignReviewUrl] = useState('');
  const [campaignEmailSubject, setCampaignEmailSubject] = useState('How was your experience with {{name}}?');
  const [campaignEmailBody, setCampaignEmailBody] = useState('<p>Hi {{name}},</p><p>Thank you for choosing us! Please take 30 seconds to rate your experience:</p><p><a href="{{review_url}}">Rate Our Service</a></p>');
  const [campaignSmsBody, setCampaignSmsBody] = useState('Hi {{name}}, how was your experience? Rate us here: {{review_url}}');
  const [campaignWhatsappBody, setCampaignWhatsappBody] = useState('Hi {{name}}, how was your experience? Rate us here: {{review_url}}');
  const [creatingCampaign, setCreatingCampaign] = useState(false);

  // Widget Embed Code Modal State
  const [widgetOpen, setWidgetOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Load reviews, campaigns, and requests dynamically on workspaceId change
  useEffect(() => {
    if (!workspaceId) return;

    const loadData = async () => {
      try {
        // Fetch reviews
        const reviewsRes = await fetch(`/api/reputation/reviews?workspaceId=${workspaceId}`);
        if (reviewsRes.ok) {
          const reviewsData = await reviewsRes.json();
          // Map backend table schema review_text to frontend display body
          const mappedReviews = reviewsData.map((r: any) => ({
            id: r.id,
            reviewer_name: r.reviewer_name,
            rating: r.rating,
            body: r.review_text,
            platform: r.platform,
            reply_text: r.reply_text,
            replied: r.replied,
            review_date: r.published_at || r.created_at
          }));
          setReviews(mappedReviews);
        }

        // Fetch campaigns
        const campaignsRes = await fetch(`/api/reputation/campaigns?workspaceId=${workspaceId}`);
        if (campaignsRes.ok) {
          const campaignsData = await campaignsRes.json();
          setCampaigns(campaignsData);
        }

        // Fetch requests
        const requestsRes = await fetch(`/api/reputation/requests?workspaceId=${workspaceId}`);
        if (requestsRes.ok) {
          const requestsData = await requestsRes.json();
          setRequests(requestsData);
        }
      } catch (err) {
        console.error('[ReputationClient] Error loading dynamic data:', err);
      }
    };

    loadData();
  }, [workspaceId]);

  // Load Settings & Contacts
  useEffect(() => {
    if (settingsOpen && workspaceId) {
      getReputationSettings().then(res => {
        if (res.data) {
          setGoogleUrl(res.data.google_review_url || '');
          setFacebookUrl(res.data.facebook_review_url || '');
        }
      });
    }
  }, [settingsOpen, workspaceId]);

  useEffect(() => {
    if (sendRequestOpen && workspaceId) {
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
  }, [sendRequestOpen, workspaceId]);

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

  const handleSyncReviews = async () => {
    if (syncing) return;
    setSyncing(true);
    toast.loading('Syncing Google reviews...', { id: 'sync-reviews' });
    try {
      const res = await syncReviewsAction();
      if (res.error) {
        toast.error(res.error, { id: 'sync-reviews' });
      } else {
        toast.success(res.message || 'Reviews synced successfully!', { id: 'sync-reviews' });
        
        // Refresh reviews list
        if (workspaceId) {
          const reviewsRes = await fetch(`/api/reputation/reviews?workspaceId=${workspaceId}`);
          if (reviewsRes.ok) {
            const reviewsData = await reviewsRes.json();
            const mappedReviews = reviewsData.map((r: any) => ({
              id: r.id,
              reviewer_name: r.reviewer_name,
              rating: r.rating,
              body: r.review_text,
              platform: r.platform,
              reply_text: r.reply_text,
              replied: r.replied,
              review_date: r.published_at || r.created_at
            }));
            setReviews(mappedReviews);
          }
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Sync failed', { id: 'sync-reviews' });
    } finally {
      setSyncing(false);
    }
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
      // Automatically trigger sync
      handleSyncReviews();
    }
  };

  const handleSendRequest = async () => {
    if (!selectedContactId) { toast.error('Please select a contact'); return; }
    if (!selectedCampaignId) { toast.error('Please select a campaign'); return; }
    setSendingRequest(true);

    const contact = contacts.find(c => c.id === selectedContactId);
    if (!contact) {
      toast.error('Selected contact not found');
      setSendingRequest(false);
      return;
    }

    try {
      const response = await fetch('/api/reputation/send-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          workspaceId,
          campaignId: selectedCampaignId,
          contacts: [{
            name: `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'Customer',
            email: contact.email,
            phone: contact.phone
          }],
          channel: selectedChannel
        })
      });

      const res = await response.json();
      if (!response.ok || res.error) {
        throw new Error(res.error || 'Failed to dispatch request');
      }

      toast.success(`Review request dispatched via ${selectedChannel.toUpperCase()}!`);
      setSendRequestOpen(false);
      setSelectedContactId('');
      setSelectedCampaignId('');

      // Refresh requests list
      const requestsRes = await fetch(`/api/reputation/requests?workspaceId=${workspaceId}`);
      if (requestsRes.ok) {
        const requestsData = await requestsRes.json();
        setRequests(requestsData);
      }
    } catch (err: any) {
      toast.error(err.message || 'Dispatch failed');
    } finally {
      setSendingRequest(false);
    }
  };

  const handleCreateCampaign = async () => {
    if (!campaignName.trim()) { toast.error('Campaign name is required'); return; }
    if (!campaignReviewUrl.trim()) { toast.error('Review URL is required'); return; }
    setCreatingCampaign(true);

    try {
      const response = await fetch('/api/reputation/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          workspace_id: workspaceId,
          name: campaignName,
          review_platform: campaignPlatform,
          review_url: campaignReviewUrl,
          email_subject: campaignEmailSubject,
          email_body: campaignEmailBody,
          sms_body: campaignSmsBody,
          whatsapp_body: campaignWhatsappBody
        })
      });

      const res = await response.json();
      if (!response.ok || res.error) {
        throw new Error(res.error || 'Failed to create campaign');
      }

      toast.success('Campaign created successfully');
      setCampaigns(prev => [res, ...prev]);
      setCreateCampaignOpen(false);
      setCampaignName('');
      setCampaignReviewUrl('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create campaign');
    } finally {
      setCreatingCampaign(false);
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return;
    try {
      const response = await fetch(`/api/reputation/campaigns?id=${campaignId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete campaign');
      toast.success('Campaign deleted successfully');
      setCampaigns(prev => prev.filter(c => c.id !== campaignId));
    } catch (err: any) {
      toast.error(err.message || 'Deletion failed');
    }
  };

  const widgetIframeCode = `<iframe src="${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/widget/reviews?workspaceId=${workspaceId || ''}" width="100%" height="220" style="border:none; border-radius: 24px; background: transparent;" frameborder="0"></iframe>`;

  const copyWidgetCode = () => {
    navigator.clipboard.writeText(widgetIframeCode);
    setCopied(true);
    toast.success('Embed code copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  // Calculate statistics
  const avgRating = reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : '0.0';

  const reviewsVolumeTrend = reviews.length;
  const positiveCount = reviews.filter(r => r.rating >= 4).length;
  const privateCount = reviews.filter(r => !r.platform || r.platform === 'custom' || r.rating <= 3).length;

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
            onClick={handleSyncReviews} 
            disabled={syncing}
            variant="outline" 
            className="bg-white/5 border-white/5 hover:bg-white/10 text-white rounded-xl h-11 text-xs font-black uppercase tracking-widest flex items-center gap-2"
          >
            <RefreshCw className={cn("w-4 h-4 text-amber-400", syncing && "animate-spin")} />
            {syncing ? 'Syncing...' : 'Sync Reviews'}
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
            onClick={() => setSendRequestOpen(true)} 
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
          <span className="text-3xl font-black text-amber-400">{privateCount}</span>
          <p className="text-[9px] text-amber-400/80 font-bold mt-2 uppercase tracking-wider">Held privately in CRM</p>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-white/5 gap-6">
        <button
          onClick={() => setActiveTab('reviews')}
          className={cn(
            "pb-4 text-xs font-black uppercase tracking-wider transition-all",
            activeTab === 'reviews' ? "border-b-2 border-blue-500 text-white" : "text-slate-400 hover:text-slate-200"
          )}
        >
          Reviews ({reviews.length})
        </button>
        <button
          onClick={() => setActiveTab('campaigns')}
          className={cn(
            "pb-4 text-xs font-black uppercase tracking-wider transition-all",
            activeTab === 'campaigns' ? "border-b-2 border-blue-500 text-white" : "text-slate-400 hover:text-slate-200"
          )}
        >
          Campaigns ({campaigns.length})
        </button>
      </div>

      {activeTab === 'reviews' && (
        <div className="space-y-6">
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
        </div>
      )}

      {activeTab === 'campaigns' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-white font-space-grotesk uppercase tracking-tight">Active Campaigns</h2>
            <Button
              onClick={() => setCreateCampaignOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-10 text-xs font-black uppercase tracking-widest flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Campaign
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {campaigns.length === 0 ? (
              <div className="col-span-full py-20 bg-white/[0.02] border-2 border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center text-center">
                <Layout className="w-8 h-8 text-blue-400 mb-4" />
                <h3 className="text-sm font-black uppercase text-slate-400 tracking-widest">No Campaigns Created</h3>
                <p className="text-slate-500 text-[10px] font-bold mt-2 uppercase tracking-widest">Create a review campaign to route and request customer feedback.</p>
              </div>
            ) : campaigns.map(camp => {
              const campRequests = requests.filter(r => r.campaign_id === camp.id);
              return (
                <div key={camp.id} className="bg-white/5 border border-white/5 rounded-2xl p-6 flex flex-col justify-between hover:border-white/10 transition-all duration-300 shadow-xl relative group">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center font-bold text-xs uppercase">
                          {camp.review_platform?.[0] || 'C'}
                        </span>
                        <div>
                          <h4 className="text-xs font-black text-white uppercase tracking-tight">{camp.name}</h4>
                          <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">
                            Platform: {camp.review_platform}
                          </span>
                        </div>
                      </div>
                      <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[8px] font-bold uppercase">
                        {camp.status}
                      </Badge>
                    </div>

                    <div className="space-y-2 mt-4 text-xs">
                      <div className="flex justify-between border-b border-white/5 pb-2">
                        <span className="text-slate-500">Redirect Link</span>
                        <span className="text-slate-300 truncate max-w-[150px]">{camp.review_url}</span>
                      </div>
                      <div className="flex justify-between border-b border-white/5 pb-2">
                        <span className="text-slate-500">Email Subject</span>
                        <span className="text-slate-300 truncate max-w-[150px]">{camp.email_subject}</span>
                      </div>
                      <div className="flex justify-between pb-2">
                        <span className="text-slate-500">Requests Sent</span>
                        <span className="text-blue-400 font-bold">{campRequests.length}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t border-white/5 mt-4">
                    <Button
                      onClick={() => {
                        setSelectedCampaignId(camp.id);
                        setSendRequestOpen(true);
                      }}
                      variant="outline"
                      className="h-8 text-[9px] font-black uppercase tracking-wider bg-blue-600/15 border-blue-500/20 text-blue-400 hover:bg-blue-600/20 rounded-lg px-3"
                    >
                      Send Request
                    </Button>
                    <Button
                      onClick={() => handleDeleteCampaign(camp.id)}
                      variant="outline"
                      className="h-8 text-[9px] font-black uppercase tracking-wider bg-rose-600/15 border-rose-500/20 text-rose-400 hover:bg-rose-600/20 rounded-lg px-3"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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

      {/* Send Request Dialog */}
      <Dialog open={sendRequestOpen} onOpenChange={setSendRequestOpen}>
        <DialogContent className="bg-[#0b0f19] border border-white/10 rounded-2xl max-w-md p-6 shadow-2xl text-slate-200">
          <DialogHeader>
            <DialogTitle className="text-md font-black uppercase tracking-tight text-white flex items-center gap-2">
              <Send className="w-5 h-5 text-blue-500" />
              Trigger Review Request
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
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 h-10 text-xs text-white outline-none cursor-pointer focus:border-blue-500/50"
                >
                  <option value="" disabled>-- Choose Contact --</option>
                  {contacts.map(c => (
                    <option key={c.id} value={c.id} className="bg-slate-950 text-xs text-white">
                      {c.first_name} {c.last_name} ({c.email || c.phone || 'No Contact Info'})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-[#4a5a82]">Select Campaign</Label>
              <select
                value={selectedCampaignId}
                onChange={e => setSelectedCampaignId(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 h-10 text-xs text-white outline-none cursor-pointer focus:border-blue-500/50"
              >
                <option value="" disabled>-- Choose Campaign --</option>
                {campaigns.map(camp => (
                  <option key={camp.id} value={camp.id} className="bg-slate-950 text-xs text-white">
                    {camp.name} ({camp.review_platform})
                  </option>
                ))}
              </select>
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
            <Button variant="ghost" onClick={() => setSendRequestOpen(false)} className="text-slate-300 hover:text-white rounded-xl">Cancel</Button>
            <Button onClick={handleSendRequest} disabled={sendingRequest || !selectedContactId || !selectedCampaignId} className="btn-primary rounded-xl font-black uppercase text-xs px-6 h-10">{sendingRequest ? 'Sending...' : 'Send Request'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Campaign Dialog */}
      <Dialog open={createCampaignOpen} onOpenChange={setCreateCampaignOpen}>
        <DialogContent className="bg-[#0b0f19] border border-white/10 rounded-2xl max-w-lg p-6 shadow-2xl text-slate-200">
          <DialogHeader>
            <DialogTitle className="text-md font-black uppercase tracking-tight text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-blue-500" />
              Create Review Campaign
            </DialogTitle>
          </DialogHeader>

          <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="space-y-1.5">
              <Label htmlFor="campaignName" className="text-[10px] font-black uppercase tracking-widest text-[#4a5a82]">Campaign Name</Label>
              <Input
                id="campaignName"
                value={campaignName}
                onChange={e => setCampaignName(e.target.value)}
                placeholder="Google Review Campaign"
                className="bg-white/5 border-white/10 text-white text-xs h-10 rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-[#4a5a82]">Review Platform</Label>
              <select
                value={campaignPlatform}
                onChange={e => setCampaignPlatform(e.target.value as any)}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 h-10 text-xs text-white outline-none cursor-pointer focus:border-blue-500/50"
              >
                <option value="google">Google</option>
                <option value="facebook">Facebook</option>
                <option value="trustpilot">Trustpilot</option>
                <option value="hellopeter">HelloPeter</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="campaignReviewUrl" className="text-[10px] font-black uppercase tracking-widest text-[#4a5a82]">Review Link (Redirect Destination)</Label>
              <Input
                id="campaignReviewUrl"
                value={campaignReviewUrl}
                onChange={e => setCampaignReviewUrl(e.target.value)}
                placeholder="https://g.page/r/your-id/review"
                className="bg-white/5 border-white/10 text-white text-xs h-10 rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="campaignEmailSubject" className="text-[10px] font-black uppercase tracking-widest text-[#4a5a82]">Email Subject</Label>
              <Input
                id="campaignEmailSubject"
                value={campaignEmailSubject}
                onChange={e => setCampaignEmailSubject(e.target.value)}
                placeholder="We would love your feedback!"
                className="bg-white/5 border-white/10 text-white text-xs h-10 rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="campaignEmailBody" className="text-[10px] font-black uppercase tracking-widest text-[#4a5a82]">Email Body (HTML supported)</Label>
              <Textarea
                id="campaignEmailBody"
                value={campaignEmailBody}
                onChange={e => setCampaignEmailBody(e.target.value)}
                className="min-h-[100px] bg-white/5 border-white/10 text-white rounded-xl text-xs"
              />
              <span className="text-[9px] text-slate-500 italic block mt-1">Use {"{{name}}"} and {"{{review_url}}"} to insert dynamic customer details.</span>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="campaignSmsBody" className="text-[10px] font-black uppercase tracking-widest text-[#4a5a82]">SMS Message Text</Label>
              <Textarea
                id="campaignSmsBody"
                value={campaignSmsBody}
                onChange={e => setCampaignSmsBody(e.target.value)}
                className="min-h-[60px] bg-white/5 border-white/10 text-white rounded-xl text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="campaignWhatsappBody" className="text-[10px] font-black uppercase tracking-widest text-[#4a5a82]">WhatsApp Message Text</Label>
              <Textarea
                id="campaignWhatsappBody"
                value={campaignWhatsappBody}
                onChange={e => setCampaignWhatsappBody(e.target.value)}
                className="min-h-[60px] bg-white/5 border-white/10 text-white rounded-xl text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setCreateCampaignOpen(false)} className="text-slate-300 hover:text-white rounded-xl">Cancel</Button>
            <Button onClick={handleCreateCampaign} disabled={creatingCampaign} className="btn-primary rounded-xl font-black uppercase text-xs px-6 h-10">{creatingCampaign ? 'Creating...' : 'Create Campaign'}</Button>
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
