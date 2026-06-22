'use client'

import React, { useState } from 'react'
import { Search, Link as LinkIcon, ExternalLink, Award, CheckCircle, ChevronRight, HelpCircle } from 'lucide-react'

interface MarketplaceClientProps {
  initialProgrammes: any[]
}

export default function MarketplaceClient({ initialProgrammes }: MarketplaceClientProps) {
  const [search, setSearch] = useState('')

  const filtered = initialProgrammes.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.registration_settings?.headline || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Search Filter Header */}
      <div className="flex items-center gap-3 bg-white/5 border border-white/5 p-4 rounded-xl backdrop-blur-sm">
        <Search className="w-5 h-5 text-gray-400 shrink-0" />
        <input
          type="text"
          placeholder="Search affiliate programs by name or niche..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-transparent text-sm border-none focus:outline-none text-white placeholder-gray-400"
        />
      </div>

      {/* Grid of Programs */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400 border border-dashed border-white/10 rounded-xl">
          No public affiliate programs found matching your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((prog) => {
            const settings = prog.registration_settings || {}
            const benefits = settings.benefits || []
            const logo = settings.logo_url || null

            return (
              <div
                key={prog.id}
                className="group relative flex flex-col justify-between bg-white/5 hover:bg-white/[0.08] border border-white/5 hover:border-blue-500/30 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 overflow-hidden"
              >
                {/* Visual Glow Effect */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-colors pointer-events-none" />

                <div className="space-y-4">
                  {/* Logo and Name */}
                  <div className="flex items-center gap-4">
                    {logo ? (
                      <img src={logo} alt={prog.name} className="w-12 h-12 rounded-xl object-contain bg-slate-900 border border-white/10" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-lg">
                        {prog.name[0]}
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-white text-base group-hover:text-blue-400 transition-colors">{prog.name}</h3>
                      <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Public Program</span>
                    </div>
                  </div>

                  {/* Headline */}
                  {settings.headline && (
                    <p className="text-sm text-gray-300 font-medium line-clamp-2">
                      {settings.headline}
                    </p>
                  )}

                  {/* Core Metrics */}
                  <div className="grid grid-cols-2 gap-3 bg-slate-950/50 border border-white/5 p-3 rounded-xl text-center">
                    <div>
                      <span className="text-[10px] text-gray-400 uppercase font-bold block">Commission</span>
                      <span className="text-sm font-bold text-green-400 mt-0.5 block">
                        {prog.commission_type === 'percentage' ? `${prog.commission_value}%` : `R ${prog.commission_value}`}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 uppercase font-bold block">Cookie Window</span>
                      <span className="text-sm font-bold text-blue-400 mt-0.5 block">
                        {prog.cookie_days === 0 ? 'Lifetime' : `${prog.cookie_days} Days`}
                      </span>
                    </div>
                  </div>

                  {/* Benefits Bullet List */}
                  {benefits.length > 0 && (
                    <div className="space-y-1.5 pt-2">
                      <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">Key Benefits:</span>
                      {benefits.slice(0, 3).map((b: string, idx: number) => (
                        <div key={idx} className="flex items-center gap-2 text-xs text-gray-300">
                          <CheckCircle className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          <span>{b}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Apply Button */}
                <div className="pt-6 mt-6 border-t border-white/5">
                  <a
                    href={`/affiliate-portal/register?programmeId=${prog.id}`}
                    className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    Join Program <ChevronRight className="w-4 h-4" />
                  </a>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
