'use client'

import React, { useState } from 'react'
import Wrapper from '@/components/layouts/DefaultWrapper'
import { useDashboardContext } from "@/components/layouts/DashboardProvider"
import { useWorkspaceIntegrations } from '@/hooks/useWorkspaceIntegrations'
import ConnectionCard from '@/components/settings/ConnectionCard'
import ConnectProviderModal from '@/components/settings/ConnectProviderModal'

export default function KycIdentityPage() {
  const { workspace } = useDashboardContext()
  const workspaceId = workspace?.id || null

  const { isConnected, getLabel, connect, disconnect, loading, error } =
    useWorkspaceIntegrations(workspaceId)

  const [connectingProvider, setConnectingProvider] = useState<{
    provider: string
    category: string
  } | null>(null)

  const steps = [
    "Open any contact record in your CRM",
    "Click Run Verification next to the contact's ID number",
    "LeadsMind checks their ID, credit, and sanctions status in under 10 seconds",
    "The result is saved on the contact record with a timestamp — ready for a FICA audit"
  ]

  return (
    <Wrapper>
      <div className="min-h-screen bg-[#04091a] px-6 py-6 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-[22px] font-bold"
            style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#eef2ff' }}>
            KYC & <span style={{ color: '#3b82f6' }}>Identity</span>
          </h1>
          <p className="text-[11px] uppercase tracking-[0.8px] font-medium mt-1"
            style={{ color: '#4a5a82', fontFamily: "'DM Sans', sans-serif" }}>
            Verify your clients and stay FICA-compliant from inside the CRM
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[12px]">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-[76px] rounded-xl bg-white/[0.03] animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* Identity Verification */}
            <p className="text-[10px] font-semibold uppercase tracking-[1.2px] mb-3"
              style={{ color: '#4a5a82', fontFamily: "'DM Sans', sans-serif" }}>
              Identity Verification
            </p>
            <div className="flex flex-col gap-3 mb-8">
              {[
                { name: 'TransUnion ID Check', shortName: 'TU', color: '#e4002b',
                  desc: 'Verify a South African ID number against the Home Affairs database' },
                { name: 'Experian TrueID', shortName: 'EXP', color: '#ff6200',
                  desc: 'ID verification plus address history and phone number matching' },
                { name: 'BVR Biometric', shortName: 'BVR', color: '#0057b8',
                  desc: 'Selfie vs ID photo — confirms the person is real and present' },
                { name: 'Home Affairs (HANIS)', shortName: 'HA', color: '#006b3c',
                  desc: 'Direct lookup — checks if the ID is valid and the person is alive' },
              ].map(item => (
                <ConnectionCard key={item.name}
                  name={item.name} shortName={item.shortName}
                  color={item.color} description={item.desc}
                  connected={isConnected(item.name)}
                  accountLabel={getLabel(item.name)}
                  onConnect={() => setConnectingProvider({ provider: item.name, category: 'identity_verification' })}
                  onDisconnect={() => disconnect(item.name)} />
              ))}
            </div>

            {/* Credit Bureaux */}
            <p className="text-[10px] font-semibold uppercase tracking-[1.2px] mb-3"
              style={{ color: '#4a5a82', fontFamily: "'DM Sans', sans-serif" }}>
              Credit Bureaux
            </p>
            <div className="flex flex-col gap-3 mb-8">
              {[
                { name: 'TransUnion Credit', shortName: 'TUC', color: '#e4002b',
                  desc: 'Pull a consumer or business credit report from inside a contact record' },
                { name: 'Experian Credit', shortName: 'EXPC', color: '#ff6200',
                  desc: 'Full credit report — score, defaults, judgements, payment history' },
                { name: 'XDS', shortName: 'XDS', color: '#7b2d8b',
                  desc: 'Credit data, fraud alerts, and collections history' },
              ].map(item => (
                <ConnectionCard key={item.name}
                  name={item.name} shortName={item.shortName}
                  color={item.color} description={item.desc}
                  connected={isConnected(item.name)}
                  accountLabel={getLabel(item.name)}
                  onConnect={() => setConnectingProvider({ provider: item.name, category: 'credit_bureau' })}
                  onDisconnect={() => disconnect(item.name)} />
              ))}
            </div>

            {/* Fraud & Sanctions Screen */}
            <p className="text-[10px] font-semibold uppercase tracking-[1.2px] mb-3"
              style={{ color: '#4a5a82', fontFamily: "'DM Sans', sans-serif" }}>
              Fraud & Sanctions Screening
            </p>
            <div className="flex flex-col gap-3 mb-8">
              {[
                { name: 'AML Sanctions Screen', shortName: 'AML', color: '#ef4444',
                  desc: 'Check if a client appears on any SA or international sanctions list' },
                { name: 'PEP Check', shortName: 'PEP', color: '#f59e0b',
                  desc: 'Politically Exposed Person screening — required for financial advisors' },
              ].map(item => (
                <ConnectionCard key={item.name}
                  name={item.name} shortName={item.shortName}
                  color={item.color} description={item.desc}
                  connected={isConnected(item.name)}
                  accountLabel={getLabel(item.name)}
                  onConnect={() => setConnectingProvider({ provider: item.name, category: 'fraud_screening' })}
                  onDisconnect={() => disconnect(item.name)} />
              ))}
            </div>

            {/* How it works */}
            <h3
              className="text-[10px] font-semibold uppercase tracking-[1.2px] text-[#4a5a82] mb-3 mt-8"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              HOW IT WORKS
            </h3>
            <div className="bg-[rgba(12,21,53,0.85)] border border-[rgba(255,255,255,0.07)] rounded-xl p-5 mt-2">
              <h4
                className="text-[14px] font-semibold text-[#eef2ff]"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                How it works once connected
              </h4>
              <div className="flex flex-col mt-2">
                {steps.map((text, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 py-2.5 border-b border-[rgba(255,255,255,0.04)] last:border-0"
                  >
                    <div
                      className="w-6 h-6 rounded-full bg-[rgba(37,99,235,0.15)] flex items-center justify-center text-[#3b82f6] flex-shrink-0 font-bold text-[11px]"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      {index + 1}
                    </div>
                    <p
                      className="text-[12px] text-[#94a3c8]"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      {text}
                    </p>
                  </div>
                ))}
              </div>
              <p
                className="text-[11px] text-[#4a5a82] italic mt-3"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                Every check requires the client's consent. LeadsMind records this automatically.
              </p>
            </div>
          </>
        )}
      </div>

      {connectingProvider && (
        <ConnectProviderModal
          provider={connectingProvider.provider}
          category={connectingProvider.category}
          open={true}
          onClose={() => setConnectingProvider(null)}
          onConnected={(label) => {
            connect(connectingProvider.provider, connectingProvider.category, label)
            setConnectingProvider(null)
          }}
        />
      )}
    </Wrapper>
  )
}
