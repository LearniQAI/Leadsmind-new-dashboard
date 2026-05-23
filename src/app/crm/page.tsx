import React from 'react';
import Wrapper from '@/components/layouts/DefaultWrapper';
import { getCRMDashboardData } from '@/app/actions/crm-workspace';
import { UnifiedActivityFeed } from '@/components/crm/UnifiedActivityFeed';
import { LayoutDashboard, Users, Target, Building2, ChevronRight, DollarSign, Activity, User } from 'lucide-react';
import Link from 'next/link';

export default async function CRMWorkspacePage() {
  const { success, data, error } = await getCRMDashboardData();

  if (!success || !data) {
    return (
      <Wrapper>
        <div className="p-12 text-center text-white">Error loading CRM Workspace.</div>
      </Wrapper>
    );
  }

  const { opportunities, contacts, activities } = data;

  const totalPipelineValue = opportunities.reduce((acc: number, opp: any) => acc + (Number(opp.amount) || 0), 0);

  return (
    <Wrapper>
      <div className="p-6 max-w-7xl mx-auto font-body min-h-[calc(100vh-80px)] space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-space font-black text-white mb-2 flex items-center gap-3">
              <LayoutDashboard className="text-accent" size={32} /> CRM Workspace
            </h1>
            <p className="text-t3">Unified control center for forms, leads, contacts, and opportunities.</p>
          </div>
          <Link href="/crm/pipelines" className="px-6 py-3 bg-accent hover:bg-accent-hover text-white rounded-xl font-bold transition-colors shadow-lg shadow-accent/20">
            Open Pipeline
          </Link>
        </div>

        {/* Global KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-n800 border border-white/10 rounded-2xl p-6 relative overflow-hidden group hover:border-accent/30 transition-colors">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform">
              <DollarSign size={80} className="text-accent" />
            </div>
            <p className="text-xs font-bold text-t4 uppercase tracking-widest mb-2">Active Pipeline</p>
            <h3 className="text-4xl font-space font-black text-white">${totalPipelineValue.toLocaleString()}</h3>
            <p className="text-sm text-t4 mt-2">{opportunities.length} open opportunities.</p>
          </div>
          
          <div className="bg-n800 border border-white/10 rounded-2xl p-6 relative overflow-hidden group hover:border-blue-500/30 transition-colors">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform">
              <Users size={80} className="text-blue-400" />
            </div>
            <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-2">Unified Contacts</p>
            <h3 className="text-4xl font-space font-black text-white">{contacts.length}</h3>
            <p className="text-sm text-t4 mt-2">Sourced from forms and leads.</p>
          </div>

          <div className="bg-n800 border border-white/10 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <Activity size={80} className="text-emerald-400" />
            </div>
            <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-2">Global Activity</p>
            <h3 className="text-4xl font-space font-black text-white">{activities.length}</h3>
            <p className="text-sm text-t4 mt-2">Actions across all modules.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Active Opportunities (Left Col) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-n800 border border-white/10 rounded-3xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-space font-bold text-white flex items-center gap-2">
                  <Target className="text-accent" /> Active Opportunities
                </h3>
                <Link href="/crm/pipelines" className="text-xs font-bold text-t4 hover:text-white uppercase tracking-wider transition-colors flex items-center gap-1">
                  View Pipeline <ChevronRight size={14} />
                </Link>
              </div>

              <div className="space-y-3">
                {opportunities.length === 0 ? (
                  <div className="text-center p-8 bg-n900 border border-white/5 rounded-2xl">
                    <Target size={32} className="text-t4 mx-auto mb-3 opacity-50" />
                    <p className="text-sm text-t3">No active opportunities.</p>
                  </div>
                ) : (
                  opportunities.map((opp: any) => (
                    <div key={opp.id} className="flex items-center justify-between p-4 bg-n900 border border-white/5 rounded-2xl hover:border-accent/30 transition-colors group">
                      <div>
                        <h4 className="font-bold text-white group-hover:text-accent transition-colors">{opp.name}</h4>
                        <div className="flex items-center gap-3 text-xs text-t3 mt-1">
                          {opp.company?.name && <span className="flex items-center gap-1"><Building2 size={12} /> {opp.company.name}</span>}
                          {opp.contact?.email && <span className="flex items-center gap-1"><User size={12} /> {opp.contact.email}</span>}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-space font-bold text-emerald-400">${Number(opp.amount).toLocaleString()}</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-t4 bg-white/5 px-2 py-0.5 rounded mt-1 inline-block">
                          {opp.stage_id}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Recent Contacts */}
            <div className="bg-n800 border border-white/10 rounded-3xl p-6">
              <h3 className="text-lg font-space font-bold text-white mb-6 flex items-center gap-2">
                <Users className="text-blue-400" /> Recent Contacts
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {contacts.map((contact: any) => (
                  <div key={contact.id} className="p-4 bg-n900 border border-white/5 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="font-bold text-white text-sm">{contact.first_name} {contact.last_name}</p>
                      <p className="text-xs text-t3">{contact.email}</p>
                    </div>
                    <span className="text-[10px] bg-white/10 text-t4 px-2 py-1 rounded uppercase font-bold tracking-widest shrink-0">
                      {contact.source.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Activity Feed (Right Col) */}
          <div className="lg:col-span-1 h-full">
            <UnifiedActivityFeed activities={activities} />
          </div>

        </div>
      </div>
    </Wrapper>
  );
}
