'use client';

import React, { useState, useEffect } from 'react';
import { getConnectedPlatforms } from '@/app/actions/messaging';
import { ConnectPlatformsModal } from '@/components/dashboard/ConnectPlatformsModal';

export function IntegrationsList() {
 const [isOpen, setIsOpen] = useState(false);
 const [connectedPlatforms, setConnectedPlatforms] = useState<any[]>([]);
 const [isLoading, setIsLoading] = useState(true);

 const fetchPlatforms = async () => {
  setIsLoading(true);
  try {
   const platforms = await getConnectedPlatforms();
   setConnectedPlatforms(platforms);
  } catch (e) {
   console.error(e);
  } finally {
   setIsLoading(false);
  }
 };

 useEffect(() => {
  fetchPlatforms();
 }, [isOpen]);

 useEffect(() => {
  if (typeof window !== 'undefined') {
   const params = new URLSearchParams(window.location.search);
   if (params.get('meta_oauth') === '1') {
    setIsOpen(true);
    // Clean up URL parameter to avoid reopening on refresh
    const newUrl = window.location.pathname + '?tab=integrations';
    window.history.replaceState({}, '', newUrl);
   }
  }
 }, []);

 return (
  <>
   <div className="card__wrapper bg-black border-white/10">
    <div className="card__title-wrap flex flex-col sm:flex-row items-start sm:items-center justify-between mb-[20px] gap-4">
     <div>
      <h5 className="card__heading-title text-white">Messaging Connections</h5>
      <p className="text-white/50 small mb-0">Connect external messaging platforms to route messages into your CRM.</p>
     </div>
     <button 
      onClick={() => setIsOpen(true)}
      className="btn btn-primary bg-indigo-600 border-none hover:bg-indigo-700"
     >
      <i className="fa-solid fa-plus me-2"></i>
      Manage
     </button>
    </div>

    <div className="pt-[10px]">
     {isLoading ? (
      <div className="flex gap-3">
        <div className="h-10 w-24 bg-white/5 animate-pulse rounded-lg"></div>
      </div>
     ) : connectedPlatforms.length === 0 ? (
      <div className="py-8 text-center border border-dashed border-white/10 rounded-[10px]">
       <p className="text-white/40 mb-0">No platforms connected yet.</p>
      </div>
     ) : (
      <div className="flex flex-wrap gap-3">
       {connectedPlatforms.map((p) => (
        <div key={p.platform} className="px-4 py-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
         <i className="fa-solid fa-circle-check"></i>
         {p.platform} Connected
        </div>
       ))}
      </div>
     )}
    </div>
   </div>
   
   <ConnectPlatformsModal open={isOpen} onOpenChange={setIsOpen} />
  </>
 );
}
