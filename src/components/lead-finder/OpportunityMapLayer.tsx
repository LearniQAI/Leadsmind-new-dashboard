'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Building2, Layers, MapPin, Navigation } from 'lucide-react';

declare global {
  interface Window { google?: any; __leadFinderGoogleMaps?: Promise<void>; }
}

type Lead = {
  id: string; business_name: string; address?: string | null; latitude: number; longitude: number;
  lead_score?: number | null; website?: string | null; rating?: number | null;
};

function loadGoogleMaps(apiKey: string) {
  if (window.google?.maps) return Promise.resolve();
  if (window.__leadFinderGoogleMaps) return window.__leadFinderGoogleMaps;
  window.__leadFinderGoogleMaps = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Google Maps could not be loaded.'));
    document.head.appendChild(script);
  });
  return window.__leadFinderGoogleMaps;
}

export function OpportunityMapLayer({ leads, noLocationLeads, mapsApiKey }: { leads: Lead[]; noLocationLeads: Lead[]; mapsApiKey: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'high' | 'gaps'>('all');
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const visibleLeads = useMemo(() => leads.filter((lead) => {
    if (filter === 'high') return (lead.lead_score ?? 0) >= 70;
    if (filter === 'gaps') return !lead.website || (lead.rating ?? 0) < 4;
    return true;
  }), [filter, leads]);

  useEffect(() => {
    if (!mapsApiKey) { setError('Google Maps is not configured for this environment.'); return; }
    let cancelled = false;
    loadGoogleMaps(mapsApiKey).then(() => {
      if (cancelled || !containerRef.current) return;
      mapRef.current = new window.google.maps.Map(containerRef.current, {
        center: { lat: -30.5595, lng: 22.9375 }, zoom: 5, mapTypeControl: true, streetViewControl: false,
      });
      setReady(true);
    }).catch((loadError) => !cancelled && setError(loadError.message));
    return () => { cancelled = true; markersRef.current.forEach((marker) => marker.setMap(null)); };
  }, [mapsApiKey]);

  useEffect(() => {
    if (!ready || !mapRef.current || !window.google?.maps) return;
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];
    const bounds = new window.google.maps.LatLngBounds();
    visibleLeads.forEach((lead) => {
      const position = { lat: Number(lead.latitude), lng: Number(lead.longitude) };
      const high = (lead.lead_score ?? 0) >= 70;
      const gap = !lead.website || (lead.rating ?? 0) < 4;
      const marker = new window.google.maps.Marker({
        map: mapRef.current, position, title: lead.business_name,
        icon: { path: window.google.maps.SymbolPath.CIRCLE, fillColor: high ? '#10b981' : gap ? '#f59e0b' : '#2563eb', fillOpacity: 1, strokeColor: '#ffffff', strokeWeight: 2, scale: 9 },
      });
      const info = new window.google.maps.InfoWindow({ content: `<strong>${lead.business_name.replace(/</g, '&lt;')}</strong><br/>${(lead.address || 'Address unavailable').replace(/</g, '&lt;')}` });
      marker.addListener('click', () => { info.open({ map: mapRef.current, anchor: marker }); });
      bounds.extend(position);
      markersRef.current.push(marker);
    });
    if (visibleLeads.length === 1) mapRef.current.setCenter(bounds.getCenter());
    else if (visibleLeads.length > 1) mapRef.current.fitBounds(bounds, 48);
  }, [ready, visibleLeads]);

  const recenter = () => {
    if (!mapRef.current || visibleLeads.length === 0) return;
    const bounds = new window.google.maps.LatLngBounds();
    visibleLeads.forEach((lead) => bounds.extend({ lat: Number(lead.latitude), lng: Number(lead.longitude) }));
    visibleLeads.length === 1 ? mapRef.current.setCenter(bounds.getCenter()) : mapRef.current.fitBounds(bounds, 48);
  };

  return <div className="bg-white border border-dash-border rounded-3xl overflow-hidden flex flex-col h-[600px] relative">
    <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between pointer-events-none">
      <div className="bg-white/95 backdrop-blur-md border border-dash-border rounded-xl p-2 flex items-center gap-2 pointer-events-auto shadow-xl">
        {(['all', 'high', 'gaps'] as const).map((value) => <button key={value} onClick={() => setFilter(value)} className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-wider ${filter === value ? 'bg-dash-border/60 !text-dash-text' : '!text-dash-textMuted hover:!text-dash-text'}`}>{value === 'all' ? 'All Leads' : value === 'high' ? 'High Opp' : 'Gaps'}</button>)}
      </div>
      <div className="bg-white/95 border border-dash-border rounded-xl p-2 pointer-events-auto shadow-xl flex gap-1"><Layers size={18} className="p-0.5 !text-dash-text" /><button aria-label="Recenter map on visible leads" onClick={recenter} className="p-1 hover:bg-dash-border/60 rounded-lg !text-dash-text"><Navigation size={18} /></button></div>
    </div>
    <div ref={containerRef} className="flex-1 min-h-0 bg-dash-surface" />
    {error && <div className="absolute inset-0 flex items-center justify-center bg-white/95 p-8 text-center"><div><AlertTriangle className="mx-auto text-amber-500 mb-3" /><p className="font-bold !text-dash-text">Map unavailable</p><p className="text-sm !text-dash-textMuted mt-1">{error}</p></div></div>}
    {!error && ready && visibleLeads.length === 0 && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><div className="bg-white/95 rounded-xl p-4 text-center shadow"><MapPin className="mx-auto !text-dash-textMuted mb-2" /><p className="text-sm font-bold !text-dash-text">No mapped leads match this filter</p></div></div>}
    <div className="bg-white border-t border-dash-border p-4 text-xs font-bold !text-dash-textMuted flex flex-wrap gap-x-5 gap-y-2"><span>{visibleLeads.length} real lead location{visibleLeads.length === 1 ? '' : 's'} shown</span><span className="flex items-center gap-1"><Building2 size={14} /> {noLocationLeads.length} without usable location data</span>{noLocationLeads.slice(0, 3).map((lead) => <span key={lead.id} title={lead.address || 'No address'}>{lead.business_name}</span>)}</div>
  </div>;
}
