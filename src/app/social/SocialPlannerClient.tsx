'use client';

import React, { useState, useRef } from 'react';
import {
 Plus,
 Calendar,
 Image as ImageIcon,
 Send,
 MoreHorizontal,
 Clock,
 CheckCircle2,
 AlertCircle,
 Sparkles,
 Loader2,
 X as XIcon
} from 'lucide-react';
import { Instagram, Facebook, Linkedin, TikTok, YouTube } from '@/components/icons/BrandIcons';
import { createSocialPost, getLinkedInAuthUrl, getTikTokAuthUrl, getYouTubeAuthUrl } from '@/app/actions/social';
import { getMetaAuthUrl } from '@/app/actions/messaging';
import { uploadSocialMedia } from '@/lib/mediaUpload';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import AIAssistantSidebar from '@/components/content-studio/AIAssistantSidebar';
import AISparkDrawer from '@/components/common/AISparkDrawer';
import { cn } from '@/lib/utils';
import { DashCard } from '@/components/dashboard-ui/Card';
import { DashButton } from '@/components/dashboard-ui/Button';
import { DashEmptyState } from '@/components/dashboard-ui/EmptyState';
import { DashStatusPill } from '@/components/dashboard-ui/StatusPill';
import { DashTextarea, DashInput } from '@/components/dashboard-ui/FormField';

export default function SocialPlannerClient({
  initialPosts,
  accounts,
  workspaceId
}: {
  initialPosts: any[],
  accounts: any[],
  workspaceId: string
}) {
  const router = useRouter();
  const [content, setContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [linkedinWarningDismissed, setLinkedinWarningDismissed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

 const mockEditor = {
  getText: () => content,
  getHTML: () => `<p>${content}</p>`,
  commands: {
   setContent: (val: string) => setContent(val)
  },
  applyFix: (issue: any, replacement: string) => {
   const before = content.substring(0, issue.offset);
   const after = content.substring(issue.offset + issue.length);
   setContent(before + replacement + after);
   toast.success(`Applied correction: "${replacement}"`);
  }
 };

 const handleConnect = async (platform: string) => {
  try {
    if (platform === 'facebook' || platform === 'instagram') {
      const url = await getMetaAuthUrl(platform)
      if (url) window.location.href = url
    } else if (platform === 'linkedin') {
      const url = await getLinkedInAuthUrl()
      if (url) window.location.href = url
    } else if (platform === 'tiktok') {
      const url = await getTikTokAuthUrl()
      if (url) window.location.href = url
    } else if (platform === 'youtube') {
      const url = await getYouTubeAuthUrl()
      if (url) window.location.href = url
    }
  } catch (err: any) {
    toast.error(err.message || 'Failed to get connection URL')
  }
 };

 const handleMediaFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  e.target.value = '';
  if (!file) return;

  setIsUploadingMedia(true);
  const res = await uploadSocialMedia({ file, workspaceId });
  if (res.error) {
   toast.error(res.error);
  } else {
   setMediaUrl(res.publicUrl);
   toast.success('Media uploaded.');
  }
  setIsUploadingMedia(false);
 };

 // Real brand marks are self-colored (see BrandIcons.tsx) — no separate
 // platform tint color needed to fill a badge behind them anymore.
 // requiresMedia platforms reject a publish server-side with no media_urls (TikTok always
 // needs a video) — surfaced in the composer as a distinct "requires video" state, not
 // conflated with "not connected".
 const platforms = [
  { id: 'facebook', icon: <Facebook className="w-full h-full" /> },
  { id: 'instagram', icon: <Instagram className="w-full h-full" /> },
  { id: 'linkedin', icon: <Linkedin className="w-full h-full" /> },
  { id: 'tiktok', icon: <TikTok className="w-full h-full" />, requiresMedia: true },
  { id: 'youtube', icon: <YouTube className="w-full h-full" />, requiresMedia: true },
 ];

 const isPlatformConnected = (id: string) => accounts.some(a => a.platform === id);

 // LinkedIn tokens last 60 days and this app can't get refresh tokens (not
 // eligible for LinkedIn's Marketing Developer Platform tier) — warn before
 // the connection silently goes dead rather than surfacing it as a publish failure.
 const linkedinAccount = accounts.find(a => a.platform === 'linkedin');
 const linkedinExpiresAt = linkedinAccount?.credentials?.token_expires_at;
 const linkedinDaysUntilExpiry = linkedinExpiresAt
  ? Math.ceil((new Date(linkedinExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  : null;
 const showLinkedinExpiryWarning =
  !linkedinWarningDismissed &&
  linkedinDaysUntilExpiry !== null &&
  linkedinDaysUntilExpiry <= 5;

 const togglePlatform = (id: string) => {
  if (!isPlatformConnected(id)) {
   toast.error(`Connect ${id} first before selecting it.`);
   return;
  }
  setSelectedPlatforms(prev =>
   prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
  );
 };

 const handlePost = async () => {
  if (!content.trim() || selectedPlatforms.length === 0) {
   toast.error('Please add content and select at least one platform');
   return;
  }

  const missingMediaPlatform = platforms.find(p => p.requiresMedia && selectedPlatforms.includes(p.id) && !mediaUrl);
  if (missingMediaPlatform) {
   toast.error(`${missingMediaPlatform.id} requires a video URL — add one before publishing.`);
   return;
  }

  setIsSubmitting(true);
  const res = await createSocialPost({
   platforms: selectedPlatforms,
   content,
   media_urls: mediaUrl ? [mediaUrl] : [],
  });

  if (res.error && !res.results) {
   toast.error(res.error);
  } else if (res.results) {
   // Per-platform outcome — a single blanket toast would hide a mixed result
   // (e.g. Facebook succeeded, X failed). Report each platform's real result.
   Object.entries(res.results).forEach(([platform, r]: [string, any]) => {
    if (r.success) {
     toast.success(`${platform}: published${r.postId ? ` (${r.postId})` : ''}`);
    } else {
     toast.error(`${platform}: ${r.error || 'failed'}`);
    }
   });
   const anySuccess = Object.values(res.results).some((r: any) => r.success);
   if (anySuccess) {
    setContent('');
    setMediaUrl('');
    setSelectedPlatforms([]);
    setIsComposerOpen(false);
    setIsCopilotOpen(false);
    router.refresh();
   }
  }
  setIsSubmitting(false);
 };

 return (
  <div className="space-y-8">
   <div className="flex items-center justify-between">
    <div>
     <h1 className="text-3xl font-bold !text-dash-text">Social <span className="text-dash-accent">planner</span></h1>
     <p className="!text-dash-textMuted text-[12px] font-medium mt-2">Schedule and manage your social presence with absolute precision.</p>
    </div>
    <DashButton onClick={() => setIsComposerOpen(true)}>
     <Plus className="w-4 h-4" /> New post
    </DashButton>
   </div>

   {showLinkedinExpiryWarning && (
    <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-amber-50 border border-amber-200">
     <div className="flex items-center gap-3">
      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
      <p className="text-sm font-medium text-amber-800">
       Your LinkedIn connection expires in {Math.max(linkedinDaysUntilExpiry ?? 0, 0)} day
       {linkedinDaysUntilExpiry === 1 ? '' : 's'} — reconnect to keep publishing.
      </p>
     </div>
     <div className="flex items-center gap-3 shrink-0">
      <button
       onClick={() => handleConnect('linkedin')}
       className="text-[11px] font-bold text-amber-700 hover:text-amber-900 transition-colors motion-reduce:transition-none"
      >
       Reconnect LinkedIn
      </button>
      <button
       onClick={() => setLinkedinWarningDismissed(true)}
       title="Dismiss"
       className="text-amber-600 hover:text-amber-800"
      >
       <XIcon className="w-4 h-4" />
      </button>
     </div>
    </div>
   )}

   <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
    {/* Left Column: Composer / Queue */}
    <div className="lg:col-span-8 space-y-6">
     {isComposerOpen && (
      <DashCard padding="default" className="border-dash-accent/20">
       <div className="space-y-6">
        <div className="flex items-center gap-4 mb-4">
         <span className="text-xs font-bold !text-dash-textMuted">Select platforms</span>
         <div className="flex gap-2">
          {platforms.map(p => {
           const connected = isPlatformConnected(p.id);
           const selected = selectedPlatforms.includes(p.id);
           const needsMedia = connected && p.requiresMedia && selected && !mediaUrl;
           return (
            <button
             key={p.id}
             onClick={() => togglePlatform(p.id)}
             title={
              !connected
               ? `Connect ${p.id} first`
               : needsMedia
                 ? `${p.id} requires a video URL to publish`
                 : undefined
             }
             className={cn(
               "w-10 h-10 p-2 rounded-xl flex items-center justify-center transition-all motion-reduce:transition-none border-2",
               !connected
                 ? "border-transparent bg-dash-surface opacity-30 cursor-not-allowed grayscale"
                 : needsMedia
                   ? "border-amber-400 bg-amber-50 scale-110 shadow-md motion-reduce:scale-100"
                   : selected
                     ? "border-dash-accent bg-white scale-110 shadow-md motion-reduce:scale-100"
                     : "border-transparent bg-dash-surface opacity-50 hover:opacity-80"
             )}
            >
             {p.icon}
            </button>
           );
          })}
         </div>
        </div>

        <DashTextarea
         value={content}
         onChange={(e) => setContent(e.target.value)}
         placeholder="What's happening? Dominating your industry starts with a post..."
         className="h-40 resize-none"
        />

        <div className="flex items-center gap-2">
         <DashInput
           type="text"
           placeholder="Media URL (image required for Instagram, video required for TikTok/YouTube)..."
           value={mediaUrl}
           onChange={(e) => setMediaUrl(e.target.value)}
           className="flex-1"
         />
         {mediaUrl && (
          <button
           type="button"
           onClick={() => setMediaUrl('')}
           title="Clear attached media"
           className="text-dash-textMuted hover:text-dash-text p-2"
          >
           <XIcon className="w-4 h-4" />
          </button>
         )}
        </div>

        <input
         ref={fileInputRef}
         type="file"
         accept="image/*,video/*"
         className="hidden"
         onChange={handleMediaFileSelect}
        />

        <div className="flex items-center justify-between flex-wrap gap-3">
         <div className="flex gap-2 flex-wrap">
          <DashButton
           type="button"
           variant="ghost"
           size="sm"
           disabled={isUploadingMedia}
           onClick={() => fileInputRef.current?.click()}
          >
           {isUploadingMedia ? <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" /> : <ImageIcon className="w-4 h-4" />}
           {isUploadingMedia ? 'Uploading...' : 'Upload media'}
          </DashButton>
          <DashButton variant="ghost" size="sm"><Calendar className="w-4 h-4" /> Schedule</DashButton>
          <DashButton
           type="button"
           variant="ghost"
           size="sm"
           onClick={() => setIsCopilotOpen(!isCopilotOpen)}
           className={cn(isCopilotOpen && 'bg-purple-50 text-purple-600 hover:text-purple-600')}
          >
           <Sparkles className="w-4 h-4" /> AI copilot
          </DashButton>
          <DashButton
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsAiDrawerOpen(true)}
            className="text-purple-600 hover:text-purple-600 border border-purple-200 bg-purple-50 hover:bg-purple-100"
          >
           <Sparkles className="w-4 h-4" /> Write with AI
          </DashButton>
         </div>
         <div className="flex gap-3">
          <DashButton
           variant="ghost"
           onClick={() => {
            setIsComposerOpen(false);
            setIsCopilotOpen(false);
           }}
          >
           Cancel
          </DashButton>
          <DashButton
           onClick={handlePost}
           disabled={isSubmitting}
          >
           {isSubmitting ? 'Publishing...' : 'Publish now'}
          </DashButton>
         </div>
        </div>
       </div>
      </DashCard>
     )}

     <div className="space-y-4">
      <h2 className="text-lg font-bold !text-dash-text flex items-center gap-2">
       <Clock className="w-5 h-5 text-dash-accent" /> Recent posts
      </h2>
      <div className="space-y-4">
       {initialPosts.length === 0 ? (
        <DashCard padding="default">
         <DashEmptyState
          icon={Send}
          title="No posts scheduled yet"
          description="Start building your influence."
         />
        </DashCard>
       ) : (
        initialPosts.map(post => (
         <DashCard key={post.id} padding="default">
          <div className="flex items-start justify-between mb-3">
           <div className="flex gap-1">
            {post.platforms?.map((p: string) => (
             <div key={p} className="w-5 h-5 rounded-md overflow-hidden flex items-center justify-center">
              {platforms.find(pl => pl.id === p)?.icon}
             </div>
            ))}
           </div>
           <div className="flex items-center gap-3">
            <DashStatusPill variant={post.status === 'published' ? 'success' : 'warning'}>
             {post.status}
            </DashStatusPill>
            <button className="!text-dash-textMuted hover:!text-dash-text"><MoreHorizontal className="w-4 h-4" /></button>
           </div>
          </div>
          <p className="text-sm !text-dash-textMuted line-clamp-2 mb-3">{post.content}</p>
          <div className="flex items-center justify-between text-[11px] !text-dash-textMuted font-medium pt-3 border-t border-dash-border">
           <span>{new Date(post.created_at).toLocaleDateString()}</span>
           <span className="flex items-center gap-1">
            {post.status === 'published' ? <CheckCircle2 className="w-3 h-3 text-green" /> : <Clock className="w-3 h-3" />}
            {post.status === 'published' ? 'Published' : 'Scheduled'}
           </span>
          </div>
         </DashCard>
        ))
       )}
      </div>
     </div>
    </div>

    {/* Right Column: Analytics / Status */}
    <div className="lg:col-span-4 space-y-6">
      {isComposerOpen && isCopilotOpen ? (
       <AIAssistantSidebar
        editor={mockEditor}
        title="Social Post"
        workspaceId={workspaceId}
        contentType="social"
        tabsToShow={['grammar', 'seo']}
        defaultTab="grammar"
        onClose={() => setIsCopilotOpen(false)}
       />
      ) : (
       <>
        <DashCard padding="default" className="bg-gradient-to-br from-dash-accent/5 to-transparent border-dash-accent/20">
         <h3 className="text-sm font-bold !text-dash-text mb-4">Account health</h3>
         <div className="space-y-3">
          {platforms.map(p => {
           const isConnected = accounts.some(a => a.platform === p.id);
           return (
            <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-dash-surface border border-dash-border">
             <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center shadow-sm">
               {p.icon}
              </div>
              <span className="text-xs font-bold !text-dash-text capitalize">{p.id}</span>
             </div>
             {isConnected ? (
              p.id === 'linkedin' && linkedinDaysUntilExpiry !== null && linkedinDaysUntilExpiry <= 5 ? (
               <span className="text-[11px] font-bold text-amber-600">
                Expires in {Math.max(linkedinDaysUntilExpiry, 0)}d
               </span>
              ) : (
               <span className="text-[11px] font-bold text-green">Active</span>
              )
             ) : (
              <button
               onClick={() => handleConnect(p.id)}
               className="text-[11px] font-bold text-dash-accent hover:text-dash-accent/80 transition-colors motion-reduce:transition-none"
              >
               Connect
              </button>
             )}
            </div>
           );
          })}
         </div>
        </DashCard>

        <DashCard padding="default">
         <div className="flex items-center gap-2 mb-3 text-amber-600">
          <AlertCircle className="w-4 h-4" />
          <h3 className="text-xs font-bold">Pro tip</h3>
         </div>
         <p className="text-xs !text-dash-textMuted leading-relaxed">
          Posts with media assets typically receive <span className="!text-dash-text font-bold">4.5x more engagement</span>. Use the media composer to upload high-quality images.
         </p>
        </DashCard>
       </>
      )}
     </div>
    <AISparkDrawer
      isOpen={isAiDrawerOpen}
      onClose={() => setIsAiDrawerOpen(false)}
      contextType="social_post"
      workspaceId={workspaceId}
      onInsert={(text) => {
        setContent(text);
      }}
    />
   </div>
  </div>
 );
}
