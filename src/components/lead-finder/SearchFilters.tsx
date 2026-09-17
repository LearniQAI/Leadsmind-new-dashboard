'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { searchGooglePlaces, saveLeadSearchAndResults, getSavedSearches } from '@/app/actions/lead-finder';
import { Search, MapPin, Briefcase, Hash, Target, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { DashButton } from '@/components/dashboard-ui';

const RADIUS_MIN = 1000;
const RADIUS_MAX = 50000;

export function SearchFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rerunId = searchParams.get('re');

  const [loading, setLoading] = useState(false);
  const [searchType, setSearchType] = useState('keyword');
  const [location, setLocation] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [keywords, setKeywords] = useState('');
  const [radius, setRadius] = useState(5000);
  const [lastSearchTime, setLastSearchTime] = useState(0);

  useEffect(() => {
    if (rerunId) {
      getSavedSearches().then(({ success, data }) => {
        if (success && data) {
          const search = data.find((s: any) => s.id === rerunId);
          if (search) {
            setSearchType(search.search_type);
            setLocation(search.location || '');
            setBusinessType(search.business_type || '');
            setKeywords(search.keywords || '');
            setRadius(search.radius || 5000);
          }
        }
      });
    }
  }, [rerunId]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!location) return;
    
    const now = Date.now();
    if (now - lastSearchTime < 3000) {
      toast.error('Please wait a moment before searching again.');
      return;
    }
    
    setLoading(true);
    setLastSearchTime(now);
    try {
      const searchParams = { searchType, location, businessType, keywords, radius };
      
      const { success, data, error } = await searchGooglePlaces(searchParams);
      
      if (!success) {
        throw new Error(error);
      }

      // Save search and results immediately for recent searches
      const { success: saveSuccess, searchId, error: saveError } = await saveLeadSearchAndResults(searchParams, data);
      
      if (!saveSuccess) {
         console.error('Failed to save search:', saveError);
         toast.error(`Could not save search to DB: ${saveError}. Displaying temporary results.`);
      }

      // Store results in sessionStorage to render quickly on the results page
      sessionStorage.setItem('lead_finder_current_results', JSON.stringify(data));
      
      if (searchId) {
        router.push(`/lead-finder/results?searchId=${searchId}`);
      } else {
        router.push(`/lead-finder/results`);
      }
    } catch (err: any) {
      toast.error(`Search failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const radiusPct = ((radius - RADIUS_MIN) / (RADIUS_MAX - RADIUS_MIN)) * 100;

  return (
    <form
      onSubmit={handleSearch}
      className="bg-white border border-dash-border rounded-2xl p-6 md:p-7 space-y-7 shadow-sm hover:shadow-md transition-shadow duration-200 motion-reduce:transition-none"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-dash-accent/10 flex items-center justify-center shrink-0">
          <Target className="text-dash-accent w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold !text-dash-text leading-tight">Find New Leads</h2>
          <p className="text-sm !text-dash-textMuted mt-0.5">Search Google Places to discover high-quality business prospects.</p>
        </div>
      </div>

      <div>
        <p className="text-xs font-bold !text-dash-textMuted uppercase tracking-wider mb-3">What to search for</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-2">
          <label className="text-xs font-bold !text-dash-textMuted tracking-wider">Search Type</label>
          <div className="flex bg-dash-surface rounded-xl p-1 border border-dash-border">
            <button
              type="button"
              onClick={() => setSearchType('keyword')}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all motion-reduce:transition-none ${searchType === 'keyword' ? 'bg-white !text-dash-accent shadow-sm' : '!text-dash-textMuted hover:!text-dash-text'}`}
            >
              Keyword
            </button>
            <button
              type="button"
              onClick={() => setSearchType('business_type')}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all motion-reduce:transition-none ${searchType === 'business_type' ? 'bg-white !text-dash-accent shadow-sm' : '!text-dash-textMuted hover:!text-dash-text'}`}
            >
              Business Type
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold !text-dash-textMuted tracking-wider">Location (City, Region, etc.) *</label>
          <div className="relative">
            <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 !text-dash-textMuted" />
            <input
              required
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. New York, NY"
              className="w-full bg-white border border-dash-border rounded-xl py-3 pl-10 pr-4 !text-dash-text placeholder-dash-textMuted/70 transition-colors motion-reduce:transition-none focus:outline-none focus:border-dash-accent focus:ring-4 focus:ring-dash-accent/10"
            />
          </div>
        </div>

        {searchType === 'business_type' ? (
          <div className="space-y-2">
            <label className="text-xs font-bold !text-dash-textMuted tracking-wider">Business Type *</label>
            <div className="relative">
              <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 !text-dash-textMuted" />
              <input
                required
                type="text"
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                placeholder="e.g. Plumber, Restaurant, Agency"
                className="w-full bg-white border border-dash-border rounded-xl py-3 pl-10 pr-4 !text-dash-text placeholder-dash-textMuted/70 transition-colors motion-reduce:transition-none focus:outline-none focus:border-dash-accent focus:ring-4 focus:ring-dash-accent/10"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <label className="text-xs font-bold !text-dash-textMuted tracking-wider">Keywords *</label>
            <div className="relative">
              <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 !text-dash-textMuted" />
              <input
                required
                type="text"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="e.g. Marketing agency, best pizza"
                className="w-full bg-white border border-dash-border rounded-xl py-3 pl-10 pr-4 !text-dash-text placeholder-dash-textMuted/70 transition-colors motion-reduce:transition-none focus:outline-none focus:border-dash-accent focus:ring-4 focus:ring-dash-accent/10"
              />
            </div>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold !text-dash-textMuted tracking-wider">Search Radius</label>
            <span className="text-xs font-bold !text-dash-accent bg-dash-accent/10 px-2 py-0.5 rounded-full">
              {radius / 1000} km
            </span>
          </div>
          <div className="bg-dash-surface border border-dash-border rounded-xl px-3.5 py-3">
            <input
              type="range"
              min={RADIUS_MIN}
              max={RADIUS_MAX}
              step="1000"
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              style={{ background: `linear-gradient(to right, #1359FF 0%, #1359FF ${radiusPct}%, #E2E8F0 ${radiusPct}%, #E2E8F0 100%)` }}
              className="w-full h-2 rounded-full appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white
                [&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-dash-accent
                [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer
                [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full
                [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-[3px] [&::-moz-range-thumb]:border-dash-accent
                [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-track]:bg-transparent"
            />
            <div className="flex justify-between text-[10px] !text-dash-textMuted font-medium mt-1.5">
              <span>1 km</span>
              <span>50 km</span>
            </div>
          </div>
        </div>
        </div>
      </div>

      <DashButton
        type="submit"
        disabled={loading}
        size="lg"
        className="w-full"
      >
        {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <Search className="w-5 h-5" />}
        {loading ? 'Searching & Enriching Leads...' : 'Search Leads'}
      </DashButton>
    </form>
  );
}
