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
      <div className="flex items-center gap-3 bg-dash-surface border border-dash-border p-4 rounded-xl">
        <Search className="w-5 h-5 text-dash-textMuted shrink-0" />
        <input
          type="text"
          placeholder="Search affiliate programs by name or niche..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-transparent text-sm border-none focus:outline-none text-dash-text placeholder-dash-textMuted"
        />
      </div>

      {/* Grid of Programs */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-dash-textMuted border border-dashed border-dash-border rounded-xl">
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
                className="group relative flex flex-col justify-between bg-dash-surface hover:bg-white border border-dash-border hover:border-dash-accent/30 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-md overflow-hidden"
              >
                <div className="space-y-4">
                  {/* Logo and Name */}
                  <div className="flex items-center gap-4">
                    {logo ? (
                      <img src={logo} alt={prog.name} className="w-12 h-12 rounded-xl object-contain bg-dash-bg border border-dash-border" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-dash-accent/10 border border-dash-accent/20 flex items-center justify-center text-dash-accent font-bold text-lg">
                        {prog.name[0]}
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-dash-text text-base group-hover:text-dash-accent transition-colors">{prog.name}</h3>
                      <span className="text-[10px] uppercase font-bold text-dash-textMuted tracking-wider">Public Program</span>
                    </div>
                  </div>

                  {/* Headline */}
                  {settings.headline && (
                    <p className="text-sm text-dash-textMuted font-medium line-clamp-2">
                      {settings.headline}
                    </p>
                  )}

                  {/* Core Metrics */}
                  <div className="grid grid-cols-2 gap-3 bg-dash-bg border border-dash-border p-3 rounded-xl text-center">
                    <div>
                      <span className="text-[10px] text-dash-textMuted uppercase font-bold block">Commission</span>
                      <span className="text-sm font-bold text-emerald-600 mt-0.5 block">
                        {prog.commission_type === 'percentage' ? `${prog.commission_value}%` : `R ${prog.commission_value}`}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-dash-textMuted uppercase font-bold block">Cookie Window</span>
                      <span className="text-sm font-bold text-dash-accent mt-0.5 block">
                        {prog.cookie_days === 0 ? 'Lifetime' : `${prog.cookie_days} Days`}
                      </span>
                    </div>
                  </div>

                  {/* Benefits Bullet List */}
                  {benefits.length > 0 && (
                    <div className="space-y-1.5 pt-2">
                      <span className="text-[10px] uppercase font-bold text-dash-textMuted tracking-wider block">Key Benefits:</span>
                      {benefits.slice(0, 3).map((b: string, idx: number) => (
                        <div key={idx} className="flex items-center gap-2 text-xs text-dash-textMuted">
                          <CheckCircle className="w-3.5 h-3.5 text-dash-accent shrink-0" />
                          <span>{b}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Apply Button */}
                <div className="pt-6 mt-6 border-t border-dash-border">
                  <a
                    href={`/affiliate-portal/register?programmeId=${prog.id}`}
                    className="w-full py-2.5 px-4 bg-dash-accent hover:opacity-90 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
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
