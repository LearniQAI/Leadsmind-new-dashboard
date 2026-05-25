'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { searchGooglePlaces, saveLeadSearchAndResults, getSavedSearches } from '@/app/actions/lead-finder';
import { Search, MapPin, Briefcase, Hash, Target, Users, Star, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

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

  return (
    <form onSubmit={handleSearch} className="bg-n900 border border-white/10 rounded-2xl p-6 space-y-6 shadow-xl">
      <div>
        <h2 className="text-xl font-space font-bold text-white mb-2 flex items-center gap-2">
          <Target className="text-accent" /> Find New Leads
        </h2>
        <p className="text-sm text-t3">Search Google Places to discover high-quality business prospects.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-xs font-bold text-t2 uppercase tracking-wider">Search Type</label>
          <div className="flex bg-n800 rounded-lg p-1 border border-white/5">
            <button
              type="button"
              onClick={() => setSearchType('keyword')}
              className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${searchType === 'keyword' ? 'bg-accent text-white shadow-md' : 'text-t3 hover:text-white'}`}
            >
              Keyword
            </button>
            <button
              type="button"
              onClick={() => setSearchType('business_type')}
              className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${searchType === 'business_type' ? 'bg-accent text-white shadow-md' : 'text-t3 hover:text-white'}`}
            >
              Business Type
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-t2 uppercase tracking-wider">Location (City, Region, etc.) *</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-t4" />
            <input
              required
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. New York, NY"
              className="w-full bg-n800 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-white/20 focus:outline-none focus:border-accent"
            />
          </div>
        </div>

        {searchType === 'business_type' ? (
          <div className="space-y-2">
            <label className="text-xs font-bold text-t2 uppercase tracking-wider">Business Type *</label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-t4" />
              <input
                required
                type="text"
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                placeholder="e.g. Plumber, Restaurant, Agency"
                className="w-full bg-n800 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-white/20 focus:outline-none focus:border-accent"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <label className="text-xs font-bold text-t2 uppercase tracking-wider">Keywords *</label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-t4" />
              <input
                required
                type="text"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="e.g. Marketing agency, best pizza"
                className="w-full bg-n800 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-white/20 focus:outline-none focus:border-accent"
              />
            </div>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-xs font-bold text-t2 uppercase tracking-wider">Search Radius ({radius / 1000}km)</label>
          <input
            type="range"
            min="1000"
            max="50000"
            step="1000"
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            className="w-full h-2 bg-n800 rounded-lg appearance-none cursor-pointer accent-accent"
          />
        </div>
      </div>

      {/* Advanced Filters placeholder for MVP */}
      <div className="pt-4 border-t border-white/5 flex gap-4">
        <div className="flex-1 opacity-50 cursor-not-allowed">
          <label className="text-xs font-bold text-t2 uppercase tracking-wider mb-2 block">Employee Size</label>
          <select disabled className="w-full bg-n800 border border-white/10 rounded-xl py-2 px-3 text-sm text-t3 cursor-not-allowed">
            <option>Any Size (Pro)</option>
          </select>
        </div>
        <div className="flex-1 opacity-50 cursor-not-allowed">
          <label className="text-xs font-bold text-t2 uppercase tracking-wider mb-2 block">Rating Filter</label>
          <select disabled className="w-full bg-n800 border border-white/10 rounded-xl py-2 px-3 text-sm text-t3 cursor-not-allowed">
            <option>Any Rating (Pro)</option>
          </select>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-4 bg-accent hover:bg-accent-hover text-white rounded-xl font-bold uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(37,99,235,0.2)] hover:shadow-[0_0_30px_rgba(37,99,235,0.4)] disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
      >
        {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <Search className="w-5 h-5" />}
        {loading ? 'Searching & Enriching Leads...' : 'Search Leads'}
      </button>
    </form>
  );
}
