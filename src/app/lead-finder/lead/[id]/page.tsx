import React from 'react';
import Wrapper from '@/components/layouts/DefaultWrapper';
import { getLeadDetails } from '@/app/actions/lead-workspace';
import { LeadInsightEngine } from '@/lib/lead-finder/LeadInsightEngine';
import { LeadQualificationPanel } from '@/components/lead-finder/LeadQualificationPanel';
import { LeadActivityTimeline } from '@/components/lead-finder/LeadActivityTimeline';
import { LeadTagManager } from '@/components/lead-finder/LeadTagManager';
import { LeadCRMConnector } from '@/components/lead-finder/LeadCRMConnector';
import { ContactDiscoveryPanel } from '@/components/lead-finder/ContactDiscoveryPanel';
import { OpportunityIntelligencePanel } from '@/components/lead-finder/OpportunityIntelligencePanel';
import { CompetitorInsightsPanel } from '@/components/lead-finder/CompetitorInsightsPanel';
import { ArrowLeft, Building2, MapPin, Phone, Globe, Star, Users, Linkedin, Facebook, Activity, Lightbulb } from 'lucide-react';
import Link from 'next/link';

export default async function LeadWorkspacePage({ params }: { params: { id: string } }) {
  const { success, data, error } = await getLeadDetails(params.id);

  if (!success || !data || !data.lead) {
    return (
      <Wrapper>
        <div className="p-12 text-center text-white">Lead not found or unauthorized.</div>
      </Wrapper>
    );
  }

  const { lead, notes, activities, contacts, opportunity, websiteAnalysis, recommendations, competitors } = data;
  const insights = LeadInsightEngine.generateInsights(lead);

  return (
    <Wrapper>
      <div className="p-6 max-w-7xl mx-auto font-body min-h-[calc(100vh-80px)]">
        <Link 
          href={`/lead-finder/results?searchId=${lead.search_id}`} 
          className="inline-flex items-center gap-2 text-sm font-bold text-t3 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft size={16} /> Back to Results
        </Link>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          
          {/* Main Content Column */}
          <div className="xl:col-span-2 space-y-6">
            
            {/* Header Profile */}
            <div className="bg-n800 border border-white/10 rounded-3xl p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <Building2 size={120} />
              </div>
              
              <div className="relative z-10">
                <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                  <div>
                    <span className="text-xs font-black uppercase tracking-widest text-accent bg-accent/10 px-3 py-1 rounded-sm mb-3 inline-block">
                      {lead.category || 'Business'}
                    </span>
                    <h1 className="text-3xl md:text-4xl font-space font-black text-white mb-2">{lead.business_name}</h1>
                    
                    <div className="flex flex-wrap items-center gap-4 text-sm text-t3">
                      {lead.rating > 0 && (
                        <span className="flex items-center gap-1 text-amber-400 font-bold">
                          <Star size={16} className="fill-amber-400" /> {lead.rating} <span className="text-t4 font-normal">({lead.review_count} reviews)</span>
                        </span>
                      )}
                      {lead.employee_size && lead.employee_size !== 'Unknown' && (
                        <span className="flex items-center gap-1.5"><Users size={16} /> {lead.employee_size} Employees</span>
                      )}
                      {lead.lead_score > 0 && (
                        <span className="flex items-center gap-1.5 text-accent font-bold"><Activity size={16} /> Score: {lead.lead_score}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-n900 border border-white/5 rounded-2xl p-6">
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-t4 uppercase tracking-wider mb-2">Contact Details</h3>
                    {lead.address && (
                      <div className="flex items-start gap-3 text-t2 text-sm">
                        <MapPin className="text-accent shrink-0" size={18} />
                        <span>{lead.address}</span>
                      </div>
                    )}
                    {lead.phone && (
                      <div className="flex items-center gap-3 text-t2 text-sm">
                        <Phone className="text-accent shrink-0" size={18} />
                        <span>{lead.phone}</span>
                      </div>
                    )}
                    {lead.website && (
                      <div className="flex items-center gap-3 text-t2 text-sm">
                        <Globe className="text-accent shrink-0" size={18} />
                        <a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline line-clamp-1">{lead.website}</a>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-t4 uppercase tracking-wider mb-2">Digital Presence</h3>
                    <div className="flex items-center gap-3 text-t2 text-sm">
                      <Linkedin className={lead.linkedin_url ? "text-[#0A66C2]" : "text-t4"} size={18} />
                      {lead.linkedin_url ? (
                        <a href={lead.linkedin_url} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">LinkedIn Profile</a>
                      ) : <span className="text-t4">Not Found</span>}
                    </div>
                    <div className="flex items-center gap-3 text-t2 text-sm">
                      <Facebook className={lead.facebook_url ? "text-[#1877F2]" : "text-t4"} size={18} />
                      {lead.facebook_url ? (
                        <a href={lead.facebook_url} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Facebook Page</a>
                      ) : <span className="text-t4">Not Found</span>}
                    </div>
                    {lead.description && (
                      <p className="text-xs text-t4 italic mt-2 line-clamp-2">"{lead.description}"</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* AI Insights Engine */}
            <div className="bg-n800 border border-white/10 rounded-3xl p-6">
              <h3 className="text-lg font-space font-bold text-white mb-4 flex items-center gap-2">
                <Lightbulb className="text-amber-400" /> AI Insights
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {insights.map((insight, idx) => (
                  <div key={idx} className={`p-4 rounded-xl border flex items-start gap-3 ${
                    insight.type === 'positive' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                    insight.type === 'negative' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                    'bg-white/5 border-white/10 text-t3'
                  }`}>
                    <div className="mt-0.5">•</div>
                    <p className="text-sm font-semibold">{insight.message}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Opportunity Intelligence */}
            <OpportunityIntelligencePanel 
              leadId={lead.id}
              opportunity={opportunity}
              recommendations={recommendations}
              websiteAnalysis={websiteAnalysis}
            />

            {/* Competitor Insights */}
            <CompetitorInsightsPanel competitors={competitors} />

            {/* Contact Discovery Panel */}
            <ContactDiscoveryPanel 
              leadId={lead.id} 
              businessName={lead.business_name} 
              website={lead.website} 
              initialContacts={contacts} 
            />

            {/* Activity Timeline */}
            <LeadActivityTimeline leadId={lead.id} activities={activities} notes={notes} />

          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            <LeadQualificationPanel leadId={lead.id} currentStatus={lead.qualification_status} />
            <LeadCRMConnector leadId={lead.id} pipelineId={lead.pipeline_id} />
            <LeadTagManager leadId={lead.id} tags={lead.smart_tags} />
          </div>

        </div>
      </div>
    </Wrapper>
  );
}
