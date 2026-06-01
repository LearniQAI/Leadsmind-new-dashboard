'use client';

import React from 'react';
import Wrapper from '@/components/layouts/DefaultWrapper';
import ConnectionCard from '@/components/settings/ConnectionCard';

export default function IntegrationsHubPage() {
  const sections = [
    {
      title: "EMAIL & CALENDAR",
      items: [
        { name: "Gmail", shortName: "GM", color: "#ea4335", description: "Emails from clients are automatically logged on their contact record" },
        { name: "Google Calendar", shortName: "GC", color: "#4285f4", description: "Your calendar syncs with LeadsMind bookings and meetings" },
        { name: "Outlook & Microsoft 365", shortName: "MS", color: "#0078d4", description: "Sync your Outlook email and calendar — for Microsoft users" },
        { name: "Google Drive", shortName: "GD", color: "#34a853", description: "Attach files from Drive to contact records, proposals, and invoices" }
      ]
    },
    {
      title: "TEAM COMMUNICATION",
      items: [
        { name: "Slack", shortName: "SL", color: "#4a154b", description: "Get a Slack message when an invoice is paid or a deal is won" },
        { name: "Microsoft Teams", shortName: "MT", color: "#6264a7", description: "LeadsMind notifications inside your Teams channels" },
        { name: "Telegram", shortName: "TG", color: "#2ca5e0", description: "Receive instant alerts on Telegram for important events" },
        { name: "Zoom", shortName: "ZM", color: "#2d8cff", description: "Create Zoom meetings from LeadsMind bookings automatically" }
      ]
    },
    {
      title: "AUTOMATION PLATFORMS",
      items: [
        { name: "Zapier", shortName: "ZAP", color: "#ff4a00", description: "Connect LeadsMind to 6,000+ apps — no code needed" },
        { name: "Make.com", shortName: "MK", color: "#6d00cc", description: "Build powerful automated workflows with LeadsMind" },
        { name: "n8n", shortName: "N8N", color: "#ea4b71", description: "Open-source automation — your data stays on your own server" },
        { name: "Pabbly Connect", shortName: "PAB", color: "#1da1f2", description: "Affordable Zapier alternative — one-time payment, no monthly fee" }
      ]
    },
    {
      title: "E-COMMERCE & RETAIL",
      items: [
        { name: "Shopify", shortName: "SH", color: "#95bf47", description: "Orders from your Shopify store create contacts and invoices in LeadsMind" },
        { name: "WooCommerce", shortName: "WC", color: "#7f54b3", description: "WordPress store orders synced to LeadsMind automatically" },
        { name: "Takealot", shortName: "TA", color: "#0099cc", description: "SA's biggest online marketplace — orders create LeadsMind records" }
      ]
    },
    {
      title: "MARKETING & SOCIAL",
      items: [
        { name: "Meta (Facebook & Instagram)", shortName: "FB", color: "#1877f2", description: "Ad leads from Facebook and Instagram land directly in your CRM" },
        { name: "Google Ads", shortName: "GA", color: "#fbbc04", description: "See which Google Ads campaigns are generating your best leads" },
        { name: "LinkedIn", shortName: "LI", color: "#0a66c2", description: "LinkedIn lead gen forms send contacts straight into LeadsMind" },
        { name: "TikTok", shortName: "TT", color: "#010101", description: "TikTok lead forms connected to your CRM" },
        { name: "Mailchimp", shortName: "MC", color: "#ffe01b", description: "Sync your Mailchimp email lists with LeadsMind contacts" }
      ]
    },
    {
      title: "ANALYTICS & TRACKING",
      items: [
        { name: "Google Analytics", shortName: "GA4", color: "#e37400", description: "Track which pages and campaigns are driving your best leads" },
        { name: "Meta Pixel", shortName: "PIX", color: "#1877f2", description: "Retarget website visitors on Facebook and Instagram" },
        { name: "HotJar", shortName: "HJ", color: "#ff3c00", description: "See how visitors behave on your website and landing pages" },
        { name: "Google Tag Manager", shortName: "GTM", color: "#4285f4", description: "Manage all your tracking tags from one place" }
      ]
    },
    {
      title: "COURIER & LOGISTICS",
      items: [
        { name: "The Courier Guy", shortName: "TCG", color: "#e31e24", description: "Book and track SA deliveries from inside LeadsMind" },
        { name: "DHL South Africa", shortName: "DHL", color: "#d40511", description: "International and domestic shipping from LeadsMind orders" },
        { name: "Skynet", shortName: "SKY", color: "#003087", description: "SA courier integration for order fulfilment" }
      ]
    }
  ];

  return (
    <Wrapper>
      <div className="min-h-screen bg-[#04091a] text-[#eef2ff] py-8 px-6">
        <div className="max-w-4xl mx-auto flex flex-col">
          
          {/* Page Title */}
          <div>
            <h1
              className="text-[22px] font-bold leading-tight"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Integrations <span className="text-[#3b82f6]">Hub</span>
            </h1>
            <p
              className="text-[11.5px] uppercase tracking-[0.8px] font-medium mt-1 text-[#4a5a82]"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Connect LeadsMind to the tools your business already uses.
            </p>
          </div>

          {/* Amber Banner */}
          <div className="bg-[rgba(245,158,11,0.06)] border border-[rgba(245,158,11,0.15)] rounded-xl p-4 mt-6 flex items-start gap-3">
            <span className="text-[#f59e0b] text-base leading-none select-none">⚠</span>
            <p
              className="text-[12px] text-[#94a3c8] leading-normal"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              These integrations are coming soon. You will be notified when each one is ready to connect.
            </p>
          </div>

          {/* Render Sections */}
          {sections.map((section, sIndex) => (
            <div key={sIndex} className="flex flex-col">
              <h3
                className="text-[10px] font-semibold uppercase tracking-[1.2px] text-[#4a5a82] mb-3 mt-8"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                {section.title}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {section.items.map((item) => (
                  <ConnectionCard
                    key={item.name}
                    name={item.name}
                    shortName={item.shortName}
                    color={item.color}
                    description={item.description}
                    comingSoon={true}
                    connected={false}
                  />
                ))}
              </div>
            </div>
          ))}

        </div>
      </div>
    </Wrapper>
  );
}
