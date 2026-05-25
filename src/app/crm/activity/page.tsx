import React from 'react';
import Wrapper from '@/components/layouts/DefaultWrapper';
import { UnifiedActivityEngine } from '@/lib/crm/UnifiedActivityEngine';
import { getCurrentWorkspaceId } from '@/lib/auth';
import { Activity, LayoutDashboard, FileText, Phone, Mail, Target, Building2, User, Link as LinkIcon, Clock } from 'lucide-react';
import Link from 'next/link';

export default async function GlobalActivityPage() {
  const workspaceId = await getCurrentWorkspaceId();
  const activities = workspaceId ? await UnifiedActivityEngine.getGlobalActivity(workspaceId, 100) : [];

  const getIcon = (type: string, entityType: string) => {
    if (type === 'note') return <FileText size={16} className="text-blue-400" />;
    if (type === 'call') return <Phone size={16} className="text-emerald-400" />;
    if (type === 'email') return <Mail size={16} className="text-amber-400" />;
    if (type === 'stage_change') return <Target size={16} className="text-purple-400" />;
    if (entityType === 'lead' || type === 'imported') return <Building2 size={16} className="text-accent" />;
    if (entityType === 'contact') return <User size={16} className="text-t4" />;
    return <Clock size={16} className="text-t4" />;
  };

  return (
    <Wrapper>
      <div className="p-6 max-w-4xl mx-auto font-body min-h-[calc(100vh-80px)] space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Link href="/crm" className="inline-flex items-center gap-2 text-sm font-bold text-t3 hover:text-white transition-colors mb-4">
              <LayoutDashboard size={16} /> Back to CRM Workspace
            </Link>
            <h1 className="text-3xl font-space font-black text-white mb-2 flex items-center gap-3">
              <Activity className="text-accent" size={32} /> Global Activity Feed
            </h1>
            <p className="text-t3">Chronological timeline of all events across LeadsMind modules.</p>
          </div>
        </div>

        {/* Full Feed */}
        <div className="bg-n800 border border-white/10 rounded-3xl p-8">
          <div className="space-y-8 relative">
            <div className="absolute top-0 bottom-0 left-[23px] w-px bg-white/5" />
            
            {activities.length === 0 ? (
              <p className="text-t4 text-center">No activity recorded yet.</p>
            ) : (
              activities.map((item: any) => (
                <div key={item.id} className="relative flex gap-6 group">
                  <div className="w-12 h-12 rounded-full bg-n900 border border-white/10 flex items-center justify-center shrink-0 z-10 relative group-hover:border-accent/50 transition-colors shadow-lg">
                    {getIcon(item.activity_type, item.entity_type)}
                  </div>
                  <div className="pt-2 w-full">
                    <div className="flex items-center justify-between gap-4 mb-2">
                      <span className="text-sm font-bold text-t2 flex items-center gap-2">
                        {item.auth_user?.email || 'System Workflow'}
                      </span>
                      <span className="text-xs text-t4 uppercase tracking-widest font-bold shrink-0">
                        {new Date(item.created_at).toLocaleString()}
                      </span>
                    </div>
                    
                    <div className="bg-n900 border border-white/5 rounded-2xl p-5 group-hover:border-white/10 transition-colors">
                      <p className="text-sm text-white leading-relaxed">
                        {item.content}
                      </p>
                      
                      <div className="mt-4 pt-3 border-t border-white/5 flex items-center gap-3">
                        <span className="inline-flex items-center gap-1 bg-white/5 px-2 py-1 rounded text-[10px] uppercase font-bold tracking-widest text-t4">
                          <LinkIcon size={10} /> {item.entity_type} Record
                        </span>
                        <span className="inline-flex items-center gap-1 bg-white/5 px-2 py-1 rounded text-[10px] uppercase font-bold tracking-widest text-t4">
                          <Activity size={10} /> {item.activity_type.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </Wrapper>
  );
}
