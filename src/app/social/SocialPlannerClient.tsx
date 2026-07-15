'use client';

import React, { useState } from 'react';
import {
 Plus,
 Calendar,
 Image as ImageIcon,
 Send,
 MoreHorizontal,
 Clock,
 CheckCircle2,
 AlertCircle,
 Sparkles
} from 'lucide-react';
import { Instagram, Facebook } from '@/components/icons/BrandIcons';
import { createSocialPost } from '@/app/actions/social';
import { getMetaAuthUrl } from '@/app/actions/messaging';
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
    }
  } catch (err: any) {
    toast.error(err.message || 'Failed to get connection URL')
  }
 };

 // Real brand marks are self-colored (see BrandIcons.tsx) — no separate
 // platform tint color needed to fill a badge behind them anymore.
 const platforms = [
  { id: 'facebook', icon: <Facebook className="w-full h-full" /> },
  { id: 'instagram', icon: <Instagram className="w-full h-full" /> },
 ];

 const togglePlatform = (id: string) => {
  setSelectedPlatforms(prev =>
   prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
  );
 };

 const handlePost = async () => {
  if (!content.trim() || selectedPlatforms.length === 0) {
   toast.error('Please add content and select at least one platform');
   return;
  }

  setIsSubmitting(true);
  const res = await createSocialPost({
   platforms: selectedPlatforms,
   content,
   media_urls: mediaUrl ? [mediaUrl] : [],
  });

  if (res.error) {
   toast.error(res.error);
  } else {
   toast.success('Post created successfully!');
   setContent('');
   setMediaUrl('');
   setSelectedPlatforms([]);
   setIsComposerOpen(false);
   setIsCopilotOpen(false);
   router.refresh();
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

   <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
    {/* Left Column: Composer / Queue */}
    <div className="lg:col-span-8 space-y-6">
     {isComposerOpen && (
      <DashCard padding="default" className="border-dash-accent/20">
       <div className="space-y-6">
        <div className="flex items-center gap-4 mb-4">
         <span className="text-xs font-bold !text-dash-textMuted">Select platforms</span>
         <div className="flex gap-2">
          {platforms.map(p => (
           <button
            key={p.id}
            onClick={() => togglePlatform(p.id)}
            className={cn(
              "w-10 h-10 p-2 rounded-xl flex items-center justify-center transition-all motion-reduce:transition-none border-2",
              selectedPlatforms.includes(p.id)
                ? "border-dash-accent bg-white scale-110 shadow-md motion-reduce:scale-100"
                : "border-transparent bg-dash-surface opacity-50 hover:opacity-80"
            )}
           >
            {p.icon}
           </button>
          ))}
         </div>
        </div>

        <DashTextarea
         value={content}
         onChange={(e) => setContent(e.target.value)}
         placeholder="What's happening? Dominating your industry starts with a post..."
         className="h-40 resize-none"
        />

        <DashInput
          type="text"
          placeholder="Image URL (required for Instagram)..."
          value={mediaUrl}
          onChange={(e) => setMediaUrl(e.target.value)}
        />

        <div className="flex items-center justify-between flex-wrap gap-3">
         <div className="flex gap-2 flex-wrap">
          <DashButton variant="ghost" size="sm"><ImageIcon className="w-4 h-4" /> Media</DashButton>
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
              <span className="text-[11px] font-bold text-green">Active</span>
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
