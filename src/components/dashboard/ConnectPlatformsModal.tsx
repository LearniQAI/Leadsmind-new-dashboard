'use client';

import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { getConnectedPlatforms, disconnectPlatform, getMetaAuthUrl } from '@/app/actions/messaging';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface ConnectPlatformsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConnectPlatformsModal({ open, onOpenChange }: ConnectPlatformsModalProps) {
  const [connections, setConnections] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [metaUrl, setMetaUrl] = useState('');

  const loadConnections = async () => {
    setIsLoading(true);
    try {
      const data = await getConnectedPlatforms();
      setConnections(data);
      const url = await getMetaAuthUrl();
      setMetaUrl(url);
    } catch (e: any) {
      toast.error('Failed to load connections');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadConnections();
    }
  }, [open]);

  const handleDisconnect = async (platform: string) => {
    const res = await disconnectPlatform(platform);
    if (res.success) {
      toast.success(`${platform.toUpperCase()} disconnected successfully.`);
      loadConnections();
    } else {
      toast.error(res.error || 'Failed to disconnect');
    }
  };

  // Find connections
  const fbConn = connections.find(c => c.platform === 'facebook');
  const igConn = connections.find(c => c.platform === 'instagram');
  const waConn = connections.find(c => c.platform === 'whatsapp');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] bg-[#080f28]/95 border border-white/10 backdrop-blur-2xl text-white rounded-2xl shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold tracking-tight font-space-grotesk text-[#eef2ff]">
            Manage Messaging Connections
          </DialogTitle>
          <DialogDescription className="text-xs text-[#4a5a82] font-dm-sans leading-relaxed">
            Link and manage Facebook Pages, Instagram DMs, and WhatsApp lines integrated with the Unified Inbox.
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 flex flex-col gap-5">
          {isLoading ? (
            <div className="flex flex-col gap-4 py-8 items-center justify-center">
              <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"></div>
              <span className="text-xs text-[#4a5a82]">Loading connection details...</span>
            </div>
          ) : (
            <>
              {/* Facebook Messenger */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-all">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-lg bg-[#3b82f6]/10 flex items-center justify-center border border-[#3b82f6]/20">
                    <i className="fa-brands fa-facebook-messenger text-lg text-[#3b82f6]"></i>
                  </div>
                  <div>
                    <h6 className="text-[13.5px] font-bold text-white font-space-grotesk">Facebook Messenger</h6>
                    {fbConn ? (
                      <p className="text-[11px] text-[#10b981] font-medium mt-0.5 flex items-center gap-1">
                        <i className="fa-solid fa-circle text-[6px]"></i> Connected as {fbConn.credentials?.page_name || 'Connected Page'}
                      </p>
                    ) : (
                      <p className="text-[11px] text-[#4a5a82] mt-0.5">Not connected</p>
                    )}
                  </div>
                </div>
                <div>
                  {fbConn ? (
                    <Button 
                      onClick={() => handleDisconnect('facebook')}
                      className="h-8 px-3.5 text-[11px] font-bold bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400"
                    >
                      Disconnect
                    </Button>
                  ) : (
                    <Button 
                      asChild
                      className="h-8 px-3.5 text-[11px] font-bold bg-[#3b82f6] hover:bg-[#2563eb] text-white"
                    >
                      <a href={metaUrl}>Connect</a>
                    </Button>
                  )}
                </div>
              </div>

              {/* Instagram Direct */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-all">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-lg bg-[#ec4899]/10 flex items-center justify-center border border-[#ec4899]/20">
                    <i className="fa-brands fa-instagram text-lg text-[#ec4899]"></i>
                  </div>
                  <div>
                    <h6 className="text-[13.5px] font-bold text-white font-space-grotesk">Instagram DM</h6>
                    {igConn ? (
                      <p className="text-[11px] text-[#10b981] font-medium mt-0.5 flex items-center gap-1">
                        <i className="fa-solid fa-circle text-[6px]"></i> Connected as @{igConn.credentials?.instagram_username || 'IG Account'}
                      </p>
                    ) : (
                      <p className="text-[11px] text-[#4a5a82] mt-0.5">Not connected</p>
                    )}
                  </div>
                </div>
                <div>
                  {igConn ? (
                    <Button 
                      onClick={() => handleDisconnect('instagram')}
                      className="h-8 px-3.5 text-[11px] font-bold bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400"
                    >
                      Disconnect
                    </Button>
                  ) : (
                    <Button 
                      asChild
                      className="h-8 px-3.5 text-[11px] font-bold bg-[#ec4899] hover:bg-[#db2777] text-white"
                    >
                      <a href={metaUrl}>Connect</a>
                    </Button>
                  )}
                </div>
              </div>

              {/* WhatsApp Business */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-all">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-lg bg-[#25d366]/10 flex items-center justify-center border border-[#25d366]/20">
                    <i className="fa-brands fa-whatsapp text-lg text-[#25d366]"></i>
                  </div>
                  <div>
                    <h6 className="text-[13.5px] font-bold text-white font-space-grotesk">WhatsApp Cloud API</h6>
                    {waConn ? (
                      <p className="text-[11px] text-[#10b981] font-medium mt-0.5 flex items-center gap-1">
                        <i className="fa-solid fa-circle text-[6px]"></i> Connected WABA Line
                      </p>
                    ) : (
                      <p className="text-[11px] text-[#4a5a82] mt-0.5">Not connected</p>
                    )}
                  </div>
                </div>
                <div>
                  {waConn ? (
                    <Button 
                      onClick={() => handleDisconnect('whatsapp')}
                      className="h-8 px-3.5 text-[11px] font-bold bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400"
                    >
                      Disconnect
                    </Button>
                  ) : (
                    <Button 
                      asChild
                      className="h-8 px-3.5 text-[11px] font-bold bg-[#25d366] hover:bg-[#22c55e] text-white"
                    >
                      <a href={metaUrl}>Connect</a>
                    </Button>
                  )}
                </div>
              </div>

              {/* General details / Last sync */}
              <div className="mt-2 p-3 rounded-lg bg-white/5 text-[10px] text-[#4a5a82] font-medium flex items-center justify-between">
                <span>Last Sync State</span>
                <span className="text-[#eef2ff]">
                  {connections.length > 0 && connections[0].last_sync_at
                    ? format(new Date(connections[0].last_sync_at), 'MMM dd, yyyy hh:mm a')
                    : 'Never synced'}
                </span>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
