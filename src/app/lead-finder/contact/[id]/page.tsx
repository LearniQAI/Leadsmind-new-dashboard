import React from 'react';
import Wrapper from '@/components/layouts/DefaultWrapper';
import { getContactDetails, updateContactStatus } from '@/app/actions/contact-workspace';
import { ContactCRMConnector } from '@/components/lead-finder/ContactCRMConnector';
import { ContactTimeline } from '@/components/lead-finder/ContactTimeline';
import { ArrowLeft, User, Building2, MapPin, Phone, Mail, Linkedin, Target, ShieldCheck, Shield, ShieldAlert, Lightbulb, Globe } from 'lucide-react';
import Link from 'next/link';

export default async function ContactWorkspacePage({ params }: { params: { id: string } }) {
  const { success, data, error } = await getContactDetails(params.id);

  if (!success || !data || !data.contact) {
    return (
      <Wrapper>
        <div className="p-12 text-center !text-dash-textMuted">Contact not found or unauthorized.</div>
      </Wrapper>
    );
  }

  const { contact, notes, activities } = data;
  const lead = contact.lead_finder_results;

  // Lightweight deterministic insights
  const insights = [];
  if (contact.department === 'Executive' || contact.title?.toLowerCase().includes('founder') || contact.title?.toLowerCase().includes('ceo')) {
    insights.push("High-level decision maker. Requires personalized, strategic outreach.");
  }
  if (contact.department === 'Marketing') {
    insights.push("Marketing-focused profile. Likely receptive to growth and agency services.");
  }
  if (contact.linkedin_url) {
    insights.push("Active on LinkedIn. Engage with recent posts before pitching.");
  }
  if (contact.confidence_level === 'High') {
    insights.push("Data is highly verified. Safe to enroll in direct outreach sequences.");
  }

  const getConfidenceIcon = (level: string) => {
    if (level === 'High') return <ShieldCheck size={16} className="text-emerald-400" />;
    if (level === 'Medium') return <Shield size={16} className="text-amber-400" />;
    return <ShieldAlert size={16} className="text-red-400" />;
  };

  return (
    <Wrapper>
      <div className="p-6 max-w-7xl mx-auto font-body min-h-[calc(100vh-80px)]">
        <Link 
          href={`/lead-finder/lead/${contact.result_id}`} 
          className="inline-flex items-center gap-2 text-sm font-bold !text-dash-textMuted hover:!text-dash-text transition-colors mb-6"
        >
          <ArrowLeft size={16} /> Back to Lead Workspace
        </Link>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          
          {/* Main Content Column */}
          <div className="xl:col-span-2 space-y-6">
            
            {/* Header Profile */}
            <div className="bg-white border border-dash-border rounded-3xl p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                <User size={120} />
              </div>
              
              <div className="relative z-10">
                <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-black tracking-widest text-dash-accent bg-dash-accent/10 px-3 py-1 rounded-sm">
                        {contact.department || 'Contact'}
                      </span>
                      <span className={`flex items-center gap-1 px-3 py-1 rounded-sm text-xs font-bold tracking-widest border ${
                        contact.confidence_level === 'High' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        contact.confidence_level === 'Medium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                        'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}>
                        {getConfidenceIcon(contact.confidence_level)} {contact.confidence_level} Confidence
                      </span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black !text-dash-text mb-2">{contact.first_name} {contact.last_name}</h1>
                    <p className="text-lg !text-dash-textMuted font-semibold mb-4">{contact.title}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Personal Details */}
                  <div className="bg-white border border-dash-border rounded-2xl p-6 space-y-4">
                    <h3 className="text-xs font-bold !text-dash-textMuted tracking-wider mb-2">Direct Contact</h3>
                    <div className="flex items-center gap-3 !text-dash-textMuted text-sm">
                      <Mail className="text-dash-accent shrink-0" size={18} />
                      {contact.email ? <span>{contact.email}</span> : <span className="!text-dash-textMuted italic">Not available</span>}
                    </div>
                    <div className="flex items-center gap-3 !text-dash-textMuted text-sm">
                      <Phone className="text-dash-accent shrink-0" size={18} />
                      {contact.phone ? <span>{contact.phone}</span> : <span className="!text-dash-textMuted italic">Not available</span>}
                    </div>
                    <div className="flex items-center gap-3 !text-dash-textMuted text-sm">
                      <Linkedin className={contact.linkedin_url ? "text-[#0A66C2]" : "!text-dash-textMuted"} size={18} />
                      {contact.linkedin_url ? (
                        <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer" className="hover:!text-dash-text transition-colors">LinkedIn Profile</a>
                      ) : <span className="!text-dash-textMuted italic">Not available</span>}
                    </div>
                  </div>

                  {/* Company Association */}
                  <div className="bg-white border border-dash-border rounded-2xl p-6 space-y-4">
                    <h3 className="text-xs font-bold !text-dash-textMuted tracking-wider mb-2">Associated Company</h3>
                    <div className="flex items-start gap-3 !text-dash-textMuted text-sm">
                      <Building2 className="!text-dash-textMuted shrink-0 mt-0.5" size={18} />
                      <div>
                        <Link href={`/lead-finder/lead/${contact.result_id}`} className="font-bold !text-dash-text hover:text-dash-accent transition-colors">
                          {lead?.business_name}
                        </Link>
                        <p className="text-xs !text-dash-textMuted mt-1">{lead?.industry || lead?.category}</p>
                      </div>
                    </div>
                    {lead?.website && (
                      <div className="flex items-center gap-3 !text-dash-textMuted text-sm mt-3">
                        <Globe className="!text-dash-textMuted shrink-0" size={18} />
                        <a href={lead.website} target="_blank" rel="noopener noreferrer" className="hover:!text-dash-text transition-colors line-clamp-1">{lead.website}</a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* AI Insights Engine */}
            {insights.length > 0 && (
              <div className="bg-white border border-dash-border rounded-3xl p-6">
                <h3 className="text-lg font-bold !text-dash-text mb-4 flex items-center gap-2">
                  <Lightbulb className="text-amber-400" /> Contact Insights
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  {insights.map((insight, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-dash-surface border border-dash-border flex items-start gap-3 !text-dash-textMuted">
                      <div className="mt-0.5 text-dash-accent">•</div>
                      <p className="text-sm font-semibold">{insight}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Activity Timeline */}
            <ContactTimeline contactId={contact.id} activities={activities} notes={notes} />

          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            <ContactCRMConnector contactId={contact.id} pipelineId={contact.pipeline_id} />
          </div>

        </div>
      </div>
    </Wrapper>
  );
}
