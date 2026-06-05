"use client";

import React, { useState } from "react";
import { Facebook, Instagram, Loader2, Megaphone, Image as ImageIcon, CheckCircle, AlertTriangle, ExternalLink } from "lucide-react";
import { toast } from "sonner";

/**
 * SQL Schema for developer reference:
 * 
 * CREATE TABLE IF NOT EXISTS social_posts (
 *   id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
 *   workspace_id uuid NOT NULL,
 *   platform text NOT NULL,
 *   content text,
 *   image_url text,
 *   published_at timestamptz,
 *   external_post_id text,
 *   status text DEFAULT 'published',
 *   created_at timestamptz DEFAULT now()
 * );
 */

interface Connection {
  platform: string;
  credentials: any;
  status: string;
}

interface SocialPost {
  id: string;
  platform: string;
  content: string;
  image_url: string | null;
  published_at: string;
  external_post_id: string | null;
  status: string;
}

interface SocialPlannerClientProps {
  connections: Connection[];
  recentPosts: SocialPost[];
}

export default function SocialPlannerClient({
  connections,
  recentPosts: initialRecentPosts,
}: SocialPlannerClientProps) {
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["facebook"]);
  const [message, setMessage] = useState<string>("");
  const [imageUrl, setImageUrl] = useState<string>("");
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [recentPosts, setRecentPosts] = useState<SocialPost[]>(initialRecentPosts);
  const [previewPlatform, setPreviewPlatform] = useState<"facebook" | "instagram">("facebook");

  const isConnected = (platform: string) => {
    return connections.some((conn) => conn.platform === platform && conn.status === "connected");
  };

  const handlePlatformToggle = (platform: string) => {
    if (!isConnected(platform)) return;
    if (selectedPlatforms.includes(platform)) {
      setSelectedPlatforms(selectedPlatforms.filter((p) => p !== platform));
    } else {
      setSelectedPlatforms([...selectedPlatforms, platform]);
    }
  };

  const handlePublish = async () => {
    if (selectedPlatforms.length === 0) {
      toast.error("Please select at least one platform to publish to.");
      return;
    }
    if (!message.trim()) {
      toast.error("Please enter a post message.");
      return;
    }

    setIsPublishing(true);
    const toastId = toast.loading("Publishing posts...");

    try {
      const response = await fetch("/api/social/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          platforms: selectedPlatforms,
          imageUrl: imageUrl || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to publish posts");
      }

      const results = data.results || {};
      let successCount = 0;
      let failCount = 0;
      const errors: string[] = [];

      selectedPlatforms.forEach((p) => {
        if (results[p]?.success) {
          successCount++;
        } else {
          failCount++;
          errors.push(`${p}: ${results[p]?.error || "Unknown error"}`);
        }
      });

      if (successCount > 0) {
        toast.success(`Successfully published to ${successCount} platform(s)!`, { id: toastId });
        setMessage("");
        setImageUrl("");
        
        // Refresh recent posts list
        const refreshedResponse = await fetch(window.location.href);
        if (refreshedResponse.ok) {
          // Soft state update by requesting latest DB state or prepending mock post
          const newPosts = selectedPlatforms.map((platform) => ({
            id: Math.random().toString(),
            platform,
            content: message,
            image_url: imageUrl || null,
            published_at: new Date().toISOString(),
            external_post_id: results[platform]?.postId || null,
            status: results[platform]?.success ? 'published' : 'failed',
          }));
          setRecentPosts((prev) => [...newPosts, ...prev].slice(0, 10));
        }
      }

      if (failCount > 0) {
        toast.error(`Failed to publish on ${failCount} platform(s): ${errors.join(", ")}`, {
          id: successCount > 0 ? undefined : toastId,
        });
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred", { id: toastId });
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#04091a] text-[#eef2ff] p-6 lg:p-10 font-sans">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN — Composer (60%) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div>
            <h1 className="text-3xl font-bold font-mono tracking-tight text-[#eef2ff]">
              Social Planner
            </h1>
            <p className="text-sm text-[#4a5a82] mt-1.5">
              Compose, schedule, and publish to all your connected channels simultaneously
            </p>
          </div>

          {/* Platform Selector Card */}
          <div className="bg-[#080f28] border border-white/5 rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-[#eef2ff] uppercase tracking-wider mb-4">
              Select Publishing Channels
            </h2>
            <div className="flex flex-wrap gap-4">
              {/* Facebook Chip */}
              <div
                onClick={() => handlePlatformToggle("facebook")}
                className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all duration-300 w-full sm:w-[48%] ${
                  selectedPlatforms.includes("facebook")
                    ? "bg-[#2563eb]/10 border-[#2563eb] text-white"
                    : isConnected("facebook")
                    ? "bg-white/5 border-white/10 hover:border-white/20 text-[#eef2ff]"
                    : "bg-white/[0.02] border-white/5 opacity-50 cursor-not-allowed text-[#4a5a82]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${selectedPlatforms.includes("facebook") ? "bg-[#2563eb]" : "bg-white/5"}`}>
                    <Facebook className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Facebook Page</p>
                    <p className="text-xs text-[#4a5a82]">
                      {isConnected("facebook") ? "Connected" : "Not Connected"}
                    </p>
                  </div>
                </div>
                {!isConnected("facebook") && (
                  <a
                    href="/settings/integrations-hub"
                    className="text-xs text-[#2563eb] hover:underline flex items-center gap-1 font-semibold"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Connect <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              {/* Instagram Chip */}
              <div
                onClick={() => handlePlatformToggle("instagram")}
                className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all duration-300 w-full sm:w-[48%] ${
                  selectedPlatforms.includes("instagram")
                    ? "bg-pink-600/10 border-pink-600 text-white"
                    : isConnected("instagram")
                    ? "bg-white/5 border-white/10 hover:border-white/20 text-[#eef2ff]"
                    : "bg-white/[0.02] border-white/5 opacity-50 cursor-not-allowed text-[#4a5a82]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${selectedPlatforms.includes("instagram") ? "bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-600" : "bg-white/5"}`}>
                    <Instagram className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Instagram Business</p>
                    <p className="text-xs text-[#4a5a82]">
                      {isConnected("instagram") ? "Connected" : "Not Connected"}
                    </p>
                  </div>
                </div>
                {!isConnected("instagram") && (
                  <a
                    href="/settings/integrations-hub"
                    className="text-xs text-[#2563eb] hover:underline flex items-center gap-1 font-semibold"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Connect <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Composer Body Card */}
          <div className="bg-[#080f28] border border-white/5 rounded-2xl p-6 flex flex-col gap-5">
            <div>
              <label className="text-sm font-semibold text-[#eef2ff] uppercase tracking-wider mb-2 block">
                Post Content
              </label>
              <div className="relative">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value.slice(0, 2200))}
                  placeholder="What's on your mind? Write your post here..."
                  className="w-full min-h-[220px] bg-[#04091a] border border-white/5 rounded-xl p-4 text-[#eef2ff] placeholder-[#4a5a82] focus:outline-none focus:border-[#2563eb] transition-all resize-y text-sm leading-relaxed"
                />
                <span className="absolute bottom-3 right-3 text-xs text-[#4a5a82] font-semibold">
                  {message.length} / 2200
                </span>
              </div>
            </div>

            {/* Media Attachment Field */}
            <div>
              <label className="text-sm font-semibold text-[#eef2ff] uppercase tracking-wider mb-2 block flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-[#2563eb]" /> Add Image URL
              </label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="w-full bg-[#04091a] border border-white/5 rounded-xl px-4 py-3 text-[#eef2ff] placeholder-[#4a5a82] focus:outline-none focus:border-[#2563eb] text-sm transition-all"
              />
              {imageUrl && (
                <div className="mt-3 flex items-center gap-4 p-3 bg-[#04091a] border border-white/5 rounded-xl">
                  <img
                    src={imageUrl}
                    alt="Media preview"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                    className="w-16 h-16 object-cover rounded-lg border border-white/10"
                  />
                  <div>
                    <p className="text-xs font-semibold text-[#eef2ff] truncate max-w-[280px] sm:max-w-md">
                      {imageUrl}
                    </p>
                    <p className="text-[10px] text-[#4a5a82] mt-0.5">Valid Image URL Preview</p>
                  </div>
                </div>
              )}
            </div>

            {/* Publish Action Block */}
            <div className="pt-2">
              <button
                onClick={handlePublish}
                disabled={isPublishing || selectedPlatforms.length === 0}
                className="w-full bg-[#2563eb] hover:bg-[#1d4ed8] disabled:bg-white/5 disabled:text-[#4a5a82] disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 flex items-center justify-center gap-3 text-base shadow-lg shadow-[#2563eb]/10"
              >
                {isPublishing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Publishing Post...
                  </>
                ) : (
                  <>
                    <Megaphone className="w-5 h-5" /> Publish Now to
                    <div className="flex items-center gap-1.5 ml-1">
                      {selectedPlatforms.includes("facebook") && <Facebook className="w-4 h-4" />}
                      {selectedPlatforms.includes("instagram") && <Instagram className="w-4 h-4" />}
                      {selectedPlatforms.length === 0 && <span className="text-xs font-normal">(no platform selected)</span>}
                    </div>
                  </>
                )}
              </button>
              <p className="text-center text-xs text-[#4a5a82] mt-3 font-semibold">
                Posts will be published immediately to selected platforms
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN — Live Preview & History (40%) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Preview Header / Picker */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold font-mono tracking-tight text-[#eef2ff]">
              Live Feed Preview
            </h2>
            <div className="flex bg-[#080f28] border border-white/5 p-1 rounded-xl">
              <button
                onClick={() => setPreviewPlatform("facebook")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 flex items-center gap-1.5 ${
                  previewPlatform === "facebook" ? "bg-[#2563eb] text-white" : "text-[#4a5a82]"
                }`}
              >
                <Facebook className="w-3.5 h-3.5" /> Facebook
              </button>
              <button
                onClick={() => setPreviewPlatform("instagram")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 flex items-center gap-1.5 ${
                  previewPlatform === "instagram" ? "bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-600 text-white" : "text-[#4a5a82]"
                }`}
              >
                <Instagram className="w-3.5 h-3.5" /> Instagram
              </button>
            </div>
          </div>

          {/* Social Feed Preview Card */}
          <div className="bg-[#080f28] border border-white/5 rounded-2xl p-5">
            {previewPlatform === "facebook" ? (
              /* Facebook Preview Card */
              <div className="flex flex-col bg-[#04091a] border border-white/5 rounded-xl overflow-hidden p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-[#2563eb]/20 flex items-center justify-center font-bold text-[#2563eb]">
                    LM
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#eef2ff]">LeadsMind Corporate Page</h3>
                    <p className="text-[10px] text-[#4a5a82] mt-0.5">Just now · Public</p>
                  </div>
                </div>
                <p className="text-sm text-[#eef2ff] mb-4 whitespace-pre-wrap min-h-[40px] leading-relaxed">
                  {message || <span className="text-[#4a5a82] italic">Start typing to see preview...</span>}
                </p>
                {imageUrl && (
                  <div className="border border-white/5 rounded-lg overflow-hidden bg-black/40">
                    <img src={imageUrl} alt="Facebook Post media" className="w-full h-auto object-cover max-h-[300px]" />
                  </div>
                )}
              </div>
            ) : (
              /* Instagram Preview Card */
              <div className="flex flex-col bg-[#04091a] border border-white/5 rounded-xl overflow-hidden">
                <div className="flex items-center gap-3 p-4">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-600 p-0.5">
                    <div className="w-full h-full rounded-full bg-[#04091a] flex items-center justify-center font-bold text-xs text-white">
                      LM
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-[#eef2ff]">leadsmind_main</h3>
                    <p className="text-[9px] text-[#4a5a82] mt-0.5">Original Audio</p>
                  </div>
                </div>
                <div className="w-full aspect-square bg-black/40 flex items-center justify-center border-y border-white/5">
                  {imageUrl ? (
                    <img src={imageUrl} alt="Instagram post media" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-[#4a5a82]">
                      <ImageIcon className="w-10 h-10 opacity-30" />
                      <p className="text-xs italic">No image URL specified</p>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <p className="text-xs text-[#eef2ff] leading-relaxed">
                    <span className="font-bold mr-2 text-white">leadsmind_main</span>
                    <span className="whitespace-pre-wrap">{message || <span className="text-[#4a5a82] italic">Start typing caption...</span>}</span>
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* History Header */}
          <h2 className="text-lg font-bold font-mono tracking-tight text-[#eef2ff] mt-2">
            Recent Publications
          </h2>

          {/* Recent Publications list */}
          <div className="flex flex-col gap-4">
            {recentPosts.length === 0 ? (
              <div className="bg-[#080f28] border border-white/5 rounded-2xl p-8 text-center text-[#4a5a82]">
                <Megaphone className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-semibold">No recent posts found</p>
                <p className="text-xs mt-1">Posts published via composer will appear here</p>
              </div>
            ) : (
              recentPosts.map((post) => (
                <div key={post.id} className="bg-[#080f28] border border-white/5 rounded-xl p-4 flex gap-4 items-start hover:border-white/10 transition-all">
                  <div className="mt-1 flex-shrink-0">
                    {post.platform === "facebook" ? (
                      <div className="p-2 rounded-lg bg-[#2563eb]/20 text-[#2563eb]">
                        <Facebook className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="p-2 rounded-lg bg-pink-600/20 text-pink-500">
                        <Instagram className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-[#4a5a82] font-semibold">
                        {new Date(post.published_at).toLocaleDateString()} at{" "}
                        {new Date(post.published_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          post.status === "published"
                            ? "bg-green-500/10 text-green-400"
                            : "bg-red-500/10 text-red-400"
                        }`}
                      >
                        {post.status}
                      </span>
                    </div>
                    <p className="text-xs text-[#eef2ff] mt-2 leading-normal line-clamp-2">
                      {post.content}
                    </p>
                    {post.image_url && (
                      <a
                        href={post.image_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-[#2563eb] hover:underline mt-2 inline-flex items-center gap-1 font-semibold"
                      >
                        <ImageIcon className="w-3 h-3" /> View Media Asset
                      </a>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
