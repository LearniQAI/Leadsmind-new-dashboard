'use client';

import React, { useState, useEffect } from 'react';
import {
  Star, Search, Trash2, MoreVertical,
  Reply, Settings, Send, Layout, Copy, Check, Plus, RefreshCw
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { getReputationSettings, saveReputationSettings, syncReviewsAction } from '@/app/actions/reputation_actions';
import { cn } from '@/lib/utils';
import { useDashboardContext } from '@/components/layouts/DashboardProvider';
import { DashCard } from '@/components/dashboard-ui/Card';
import { DashButton } from '@/components/dashboard-ui/Button';
import { DashStatusPill } from '@/components/dashboard-ui/StatusPill';
import { DashEmptyState } from '@/components/dashboard-ui/EmptyState';
import { DashFormField, DashInput, DashTextarea } from '@/components/dashboard-ui/FormField';
import { DashTabs, DashTabsList, DashTabsTrigger, DashTabsContent } from '@/components/dashboard-ui/Tabs';
import {
  DashModal, DashModalContent, DashModalHeader, DashModalTitle, DashModalFooter
} from '@/components/dashboard-ui/Modal';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

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

  // Delete Campaign Modal State
  const [deleteCampaignOpen, setDeleteCampaignOpen] = useState(false);
  const [deleteCampaignTarget, setDeleteCampaignTarget] = useState<any>(null);

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

  const openDeleteCampaign = (campaign: any) => {
    setDeleteCampaignTarget(campaign);
    setDeleteCampaignOpen(true);
  };

  const handleDeleteCampaign = async () => {
    if (!deleteCampaignTarget) return;
    try {
      const response = await fetch(`/api/reputation/campaigns?id=${deleteCampaignTarget.id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete campaign');
      toast.success('Campaign deleted successfully');
      setCampaigns(prev => prev.filter(c => c.id !== deleteCampaignTarget.id));
      setDeleteCampaignOpen(false);
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
    <div className="space-y-8">

      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold !text-dash-text">
            Reputation <span className="text-dash-accent">manager</span>
          </h1>
          <p className="!text-dash-textMuted text-[12px] font-medium mt-2">
            Monitor, connect integrations, and trigger review campaigns.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-3">
          <DashButton onClick={() => setWidgetOpen(true)} variant="secondary">
            <Layout className="w-4 h-4 text-green" />
            Get widget
          </DashButton>
          <DashButton onClick={handleSyncReviews} disabled={syncing} variant="secondary">
            <RefreshCw className={cn("w-4 h-4 text-amber-600", syncing && "animate-spin")} />
            {syncing ? 'Syncing...' : 'Sync reviews'}
          </DashButton>
          <DashButton onClick={() => setSettingsOpen(true)} variant="secondary">
            <Settings className="w-4 h-4 text-dash-accent" />
            Links setup
          </DashButton>
          <DashButton onClick={() => setSendRequestOpen(true)}>
            <Send className="w-4 h-4" />
            Send request
          </DashButton>
        </div>
      </div>

      {/* Overview Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <DashCard padding="default">
          <p className="text-[11px] font-bold !text-dash-textMuted mb-1">Average score</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold !text-dash-text">{avgRating}</span>
            <span className="text-sm font-bold !text-dash-textMuted">/ 5.0</span>
          </div>
          <div className="flex items-center gap-0.5 mt-2">
            {[1, 2, 3, 4, 5].map(i => (
              <Star key={i} className={cn("w-3.5 h-3.5", i <= Math.round(Number(avgRating)) ? 'fill-amber-500 text-amber-500' : '!text-dash-border')} />
            ))}
          </div>
        </DashCard>

        <DashCard padding="default">
          <p className="text-[11px] font-bold !text-dash-textMuted mb-1">Total reviews</p>
          <span className="text-3xl font-bold !text-dash-text">{reviewsVolumeTrend}</span>
          <p className="text-[10px] !text-dash-textMuted font-semibold mt-2">Sync fully operational</p>
        </DashCard>

        <DashCard padding="default">
          <p className="text-[11px] font-bold !text-dash-textMuted mb-1">Positive reviews</p>
          <span className="text-3xl font-bold text-green">{positiveCount}</span>
          <p className="text-[10px] text-green/80 font-bold mt-2">
            {reviewsVolumeTrend > 0 ? ((positiveCount / reviewsVolumeTrend) * 100).toFixed(0) : 0}% satisfaction
          </p>
        </DashCard>

        <DashCard padding="default">
          <p className="text-[11px] font-bold !text-dash-textMuted mb-1">Private feedback</p>
          <span className="text-3xl font-bold text-amber-600">{privateCount}</span>
          <p className="text-[10px] text-amber-600/80 font-bold mt-2">Held privately in CRM</p>
        </DashCard>
      </div>

      {/* Tabs Menu */}
      <DashTabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <DashTabsList>
          <DashTabsTrigger value="reviews">Reviews ({reviews.length})</DashTabsTrigger>
          <DashTabsTrigger value="campaigns">Campaigns ({campaigns.length})</DashTabsTrigger>
        </DashTabsList>

        <DashTabsContent value="reviews" className="space-y-6">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 !text-dash-textMuted" />
            <DashInput
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search reviews by reviewer name or content..."
              className="pl-11 h-12"
            />
          </div>

          {/* Reviews Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filtered.length === 0 ? (
              <div className="col-span-full">
                <DashEmptyState
                  icon={Star}
                  title="No reviews found"
                  description="Connect review profiles or share your feedback link"
                />
              </div>
            ) : filtered.map(review => (
              <DashCard key={review.id} padding="default" className="flex flex-col justify-between">

                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-dash-accent/10 border border-dash-accent/20 flex items-center justify-center text-dash-accent font-bold text-xs select-none">
                        {review.reviewer_name?.[0] || 'A'}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold !text-dash-text">{review.reviewer_name}</h4>
                        <span className="text-[9px] !text-dash-textMuted font-semibold">
                          {review.review_date ? new Date(review.review_date).toLocaleDateString() : '—'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <DashStatusPill variant={review.platform === 'google' ? 'danger' : review.platform === 'facebook' ? 'accent' : 'warning'}>
                        {review.platform || 'internal'}
                      </DashStatusPill>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="h-7 w-7 rounded-lg bg-dash-surface hover:bg-dash-border/60 flex items-center justify-center transition-colors motion-reduce:transition-none">
                            <MoreVertical size={13} className="!text-dash-textMuted" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-white border border-dash-border shadow-lg rounded-xl min-w-[150px]">
                          <DropdownMenuItem
                            onClick={() => { setRespondTarget(review); setResponseText(review.reply_text || ''); setRespondOpen(true); }}
                            className="flex items-center gap-2 cursor-pointer !text-dash-textMuted hover:!text-dash-text hover:bg-dash-surface rounded-lg mx-1 px-3 py-2 text-xs"
                          >
                            <Reply size={13} className="text-dash-accent" /> Respond
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => { setDeleteTarget(review); setDeleteOpen(true); }}
                            className="flex items-center gap-2 cursor-pointer text-red hover:bg-red/10 rounded-lg mx-1 px-3 py-2 text-xs"
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
                      <Star key={i} className={cn("w-3.5 h-3.5", i <= review.rating ? 'fill-amber-500 text-amber-500' : '!text-dash-border')} />
                    ))}
                  </div>

                  <p className="text-xs !text-dash-textMuted leading-relaxed italic mb-4">
                    "{review.body || 'No review message left.'}"
                  </p>

                  {/* Admin reply detail */}
                  {review.reply_text && (
                    <div className="p-3.5 bg-dash-accent/5 border border-dash-accent/10 rounded-xl mb-4">
                      <p className="text-[9px] font-bold text-dash-accent mb-1">Your response</p>
                      <p className="text-[11px] !text-dash-textMuted leading-relaxed">{review.reply_text}</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-dash-border shrink-0">
                  <DashStatusPill variant={review.replied ? 'success' : 'warning'}>
                    {review.replied ? 'Responded' : 'Awaiting reply'}
                  </DashStatusPill>
                  <DashButton
                    onClick={() => { setRespondTarget(review); setResponseText(review.reply_text || ''); setRespondOpen(true); }}
                    variant="secondary"
                    size="sm"
                  >
                    <Reply size={10} /> {review.reply_text ? 'Edit reply' : 'Reply'}
                  </DashButton>
                </div>

              </DashCard>
            ))}
          </div>
        </DashTabsContent>

        <DashTabsContent value="campaigns" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold !text-dash-text">Active campaigns</h2>
            <DashButton onClick={() => setCreateCampaignOpen(true)}>
              <Plus className="w-4 h-4" />
              Create campaign
            </DashButton>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {campaigns.length === 0 ? (
              <div className="col-span-full">
                <DashEmptyState
                  icon={Layout}
                  title="No campaigns created"
                  description="Create a review campaign to route and request customer feedback."
                />
              </div>
            ) : campaigns.map(camp => {
              const campRequests = requests.filter(r => r.campaign_id === camp.id);
              return (
                <DashCard key={camp.id} padding="default" className="flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-dash-accent/10 text-dash-accent flex items-center justify-center font-bold text-xs uppercase">
                          {camp.review_platform?.[0] || 'C'}
                        </span>
                        <div>
                          <h4 className="text-xs font-bold !text-dash-text">{camp.name}</h4>
                          <span className="text-[9px] !text-dash-textMuted font-semibold">
                            Platform: {camp.review_platform}
                          </span>
                        </div>
                      </div>
                      <DashStatusPill variant="success">{camp.status}</DashStatusPill>
                    </div>

                    <div className="space-y-2 mt-4 text-xs">
                      <div className="flex justify-between border-b border-dash-border pb-2">
                        <span className="!text-dash-textMuted">Redirect link</span>
                        <span className="!text-dash-text truncate max-w-[150px]">{camp.review_url}</span>
                      </div>
                      <div className="flex justify-between border-b border-dash-border pb-2">
                        <span className="!text-dash-textMuted">Email subject</span>
                        <span className="!text-dash-text truncate max-w-[150px]">{camp.email_subject}</span>
                      </div>
                      <div className="flex justify-between pb-2">
                        <span className="!text-dash-textMuted">Requests sent</span>
                        <span className="text-dash-accent font-bold">{campRequests.length}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t border-dash-border mt-4">
                    <DashButton
                      onClick={() => {
                        setSelectedCampaignId(camp.id);
                        setSendRequestOpen(true);
                      }}
                      variant="secondary"
                      size="sm"
                    >
                      Send request
                    </DashButton>
                    <DashButton
                      onClick={() => openDeleteCampaign(camp)}
                      variant="secondary"
                      size="sm"
                      className="text-red hover:bg-red/10"
                    >
                      Delete
                    </DashButton>
                  </div>
                </DashCard>
              );
            })}
          </div>
        </DashTabsContent>
      </DashTabs>

      {/* Response Dialog */}
      <DashModal open={respondOpen} onOpenChange={setRespondOpen}>
        <DashModalContent className="max-w-lg">
          <DashModalHeader>
            <DashModalTitle className="flex items-center gap-2">
              <Reply className="w-5 h-5 text-dash-accent" />
              Respond to <span className="text-dash-accent">{respondTarget?.reviewer_name}</span>
            </DashModalTitle>
          </DashModalHeader>

          <div className="space-y-4">
            {respondTarget && (
              <div className="p-4 bg-dash-surface rounded-xl border border-dash-border text-xs !text-dash-textMuted italic">
                <div className="flex items-center gap-0.5 mb-2 select-none">
                  {[1, 2, 3, 4, 5].map(i => (
                    <Star key={i} className={cn("w-3 h-3", i <= respondTarget.rating ? 'fill-amber-500 text-amber-500' : '!text-dash-border')} />
                  ))}
                </div>
                "{respondTarget.body}"
              </div>
            )}
            <DashFormField label="Your response">
              <DashTextarea
                value={responseText}
                onChange={e => setResponseText(e.target.value)}
                placeholder="Thank you for sharing your experience with us..."
                className="min-h-[110px]"
              />
            </DashFormField>
          </div>

          <DashModalFooter>
            <DashButton variant="secondary" onClick={() => setRespondOpen(false)}>Cancel</DashButton>
            <DashButton onClick={handleRespond} disabled={responding}>{responding ? 'Saving...' : 'Save response'}</DashButton>
          </DashModalFooter>
        </DashModalContent>
      </DashModal>

      <ConfirmDialog
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Remove review?"
        description={`This will permanently remove the review from "${deleteTarget?.reviewer_name}" from your local reputation manager list.`}
        confirmLabel={deleting ? 'Removing...' : 'Remove'}
        variant="danger"
      />

      <ConfirmDialog
        isOpen={deleteCampaignOpen}
        onClose={() => setDeleteCampaignOpen(false)}
        onConfirm={handleDeleteCampaign}
        title="Delete campaign?"
        description={`This will permanently delete the campaign "${deleteCampaignTarget?.name}". This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />

      {/* Settings Dialog (Review links configuration) */}
      <DashModal open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DashModalContent className="max-w-md">
          <DashModalHeader>
            <DashModalTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-dash-accent" />
              Public review links setup
            </DashModalTitle>
          </DashModalHeader>

          <div className="space-y-4">
            <p className="text-xs !text-dash-textMuted leading-relaxed">
              Define the public URLs for your business profiles. Positive ratings (4-5 stars) will be prompted to redirect to these links.
            </p>

            <div className="space-y-3">
              <DashFormField label="Google review profile link" htmlFor="googleUrl">
                <DashInput
                  id="googleUrl"
                  value={googleUrl}
                  onChange={e => setGoogleUrl(e.target.value)}
                  placeholder="https://g.page/r/YOUR_PROFILE/review"
                />
              </DashFormField>

              <DashFormField label="Facebook review page link" htmlFor="facebookUrl">
                <DashInput
                  id="facebookUrl"
                  value={facebookUrl}
                  onChange={e => setFacebookUrl(e.target.value)}
                  placeholder="https://www.facebook.com/YOUR_PAGE/reviews"
                />
              </DashFormField>
            </div>
          </div>

          <DashModalFooter>
            <DashButton variant="secondary" onClick={() => setSettingsOpen(false)}>Cancel</DashButton>
            <DashButton onClick={handleSaveSettings} disabled={savingSettings}>{savingSettings ? 'Saving...' : 'Save settings'}</DashButton>
          </DashModalFooter>
        </DashModalContent>
      </DashModal>

      {/* Send Request Dialog */}
      <DashModal open={sendRequestOpen} onOpenChange={setSendRequestOpen}>
        <DashModalContent className="max-w-md">
          <DashModalHeader>
            <DashModalTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-dash-accent" />
              Trigger review request
            </DashModalTitle>
          </DashModalHeader>

          <div className="space-y-4">
            <DashFormField label="Select contact">
              {loadingContacts ? (
                <div className="text-xs !text-dash-textMuted italic">Searching database nodes...</div>
              ) : (
                <select
                  value={selectedContactId}
                  onChange={e => setSelectedContactId(e.target.value)}
                  className="w-full h-11 rounded-xl border border-dash-border bg-white px-3.5 text-sm !text-dash-text outline-none focus-visible:ring-2 focus-visible:ring-dash-accent cursor-pointer"
                >
                  <option value="" disabled>-- Choose contact --</option>
                  {contacts.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.first_name} {c.last_name} ({c.email || c.phone || 'No Contact Info'})
                    </option>
                  ))}
                </select>
              )}
            </DashFormField>

            <DashFormField label="Select campaign">
              <select
                value={selectedCampaignId}
                onChange={e => setSelectedCampaignId(e.target.value)}
                className="w-full h-11 rounded-xl border border-dash-border bg-white px-3.5 text-sm !text-dash-text outline-none focus-visible:ring-2 focus-visible:ring-dash-accent cursor-pointer"
              >
                <option value="" disabled>-- Choose campaign --</option>
                {campaigns.map(camp => (
                  <option key={camp.id} value={camp.id}>
                    {camp.name} ({camp.review_platform})
                  </option>
                ))}
              </select>
            </DashFormField>

            <DashFormField label="Dispatch channel">
              <div className="grid grid-cols-3 gap-2">
                {(['email', 'sms', 'whatsapp'] as const).map(channel => (
                  <button
                    key={channel}
                    type="button"
                    onClick={() => setSelectedChannel(channel)}
                    className={cn(
                      "h-10 rounded-xl border text-[11px] font-bold capitalize transition-colors motion-reduce:transition-none",
                      selectedChannel === channel
                        ? "bg-dash-accent/10 border-dash-accent/40 text-dash-accent"
                        : "bg-white border-dash-border !text-dash-textMuted hover:border-dash-text/20"
                    )}
                  >
                    {channel}
                  </button>
                ))}
              </div>
            </DashFormField>
          </div>

          <DashModalFooter>
            <DashButton variant="secondary" onClick={() => setSendRequestOpen(false)}>Cancel</DashButton>
            <DashButton onClick={handleSendRequest} disabled={sendingRequest || !selectedContactId || !selectedCampaignId}>{sendingRequest ? 'Sending...' : 'Send request'}</DashButton>
          </DashModalFooter>
        </DashModalContent>
      </DashModal>

      {/* Create Campaign Dialog */}
      <DashModal open={createCampaignOpen} onOpenChange={setCreateCampaignOpen}>
        <DashModalContent className="max-w-lg">
          <DashModalHeader>
            <DashModalTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-dash-accent" />
              Create review campaign
            </DashModalTitle>
          </DashModalHeader>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <DashFormField label="Campaign name" htmlFor="campaignName">
              <DashInput
                id="campaignName"
                value={campaignName}
                onChange={e => setCampaignName(e.target.value)}
                placeholder="Google Review Campaign"
              />
            </DashFormField>

            <DashFormField label="Review platform">
              <select
                value={campaignPlatform}
                onChange={e => setCampaignPlatform(e.target.value as any)}
                className="w-full h-11 rounded-xl border border-dash-border bg-white px-3.5 text-sm !text-dash-text outline-none focus-visible:ring-2 focus-visible:ring-dash-accent cursor-pointer"
              >
                <option value="google">Google</option>
                <option value="facebook">Facebook</option>
                <option value="trustpilot">Trustpilot</option>
                <option value="hellopeter">HelloPeter</option>
                <option value="custom">Custom</option>
              </select>
            </DashFormField>

            <DashFormField label="Review link (redirect destination)" htmlFor="campaignReviewUrl">
              <DashInput
                id="campaignReviewUrl"
                value={campaignReviewUrl}
                onChange={e => setCampaignReviewUrl(e.target.value)}
                placeholder="https://g.page/r/your-id/review"
              />
            </DashFormField>

            <DashFormField label="Email subject" htmlFor="campaignEmailSubject">
              <DashInput
                id="campaignEmailSubject"
                value={campaignEmailSubject}
                onChange={e => setCampaignEmailSubject(e.target.value)}
                placeholder="We would love your feedback!"
              />
            </DashFormField>

            <DashFormField
              label="Email body (HTML supported)"
              htmlFor="campaignEmailBody"
              hint={`Use ${'{{name}}'} and ${'{{review_url}}'} to insert dynamic customer details.`}
            >
              <DashTextarea
                id="campaignEmailBody"
                value={campaignEmailBody}
                onChange={e => setCampaignEmailBody(e.target.value)}
                className="min-h-[100px]"
              />
            </DashFormField>

            <DashFormField label="SMS message text" htmlFor="campaignSmsBody">
              <DashTextarea
                id="campaignSmsBody"
                value={campaignSmsBody}
                onChange={e => setCampaignSmsBody(e.target.value)}
                className="min-h-[60px]"
              />
            </DashFormField>

            <DashFormField label="WhatsApp message text" htmlFor="campaignWhatsappBody">
              <DashTextarea
                id="campaignWhatsappBody"
                value={campaignWhatsappBody}
                onChange={e => setCampaignWhatsappBody(e.target.value)}
                className="min-h-[60px]"
              />
            </DashFormField>
          </div>

          <DashModalFooter>
            <DashButton variant="secondary" onClick={() => setCreateCampaignOpen(false)}>Cancel</DashButton>
            <DashButton onClick={handleCreateCampaign} disabled={creatingCampaign}>{creatingCampaign ? 'Creating...' : 'Create campaign'}</DashButton>
          </DashModalFooter>
        </DashModalContent>
      </DashModal>

      {/* Widget Embed Code Dialog */}
      <DashModal open={widgetOpen} onOpenChange={setWidgetOpen}>
        <DashModalContent className="max-w-lg">
          <DashModalHeader>
            <DashModalTitle className="flex items-center gap-2">
              <Layout className="w-5 h-5 text-green" />
              Embed carousel widget
            </DashModalTitle>
          </DashModalHeader>

          <div className="space-y-4">
            <p className="text-xs !text-dash-textMuted leading-relaxed">
              Showcase your positive reviews (rating &gt;= 4) directly on your storefront website by copying and pasting the non-blocking iframe code block below:
            </p>

            <div className="bg-dash-surface p-4 rounded-xl border border-dash-border font-mono text-[11px] !text-dash-textMuted relative select-all break-all pr-12 leading-relaxed">
              {widgetIframeCode}
              <button
                onClick={copyWidgetCode}
                className="absolute right-3 top-3 h-8 w-8 rounded-lg bg-white hover:bg-dash-border/60 flex items-center justify-center border border-dash-border transition-colors motion-reduce:transition-none"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green" /> : <Copy className="w-3.5 h-3.5 !text-dash-textMuted" />}
              </button>
            </div>
          </div>

          <DashModalFooter>
            <DashButton onClick={() => setWidgetOpen(false)}>Done</DashButton>
          </DashModalFooter>
        </DashModalContent>
      </DashModal>

    </div>
  );
}
