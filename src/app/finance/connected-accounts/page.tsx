export default function ConnectedAccountsPage() {
  return (
    <div className="min-h-screen bg-[#04091a] px-6 py-6 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-[22px] font-bold"
          style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#eef2ff' }}>
          Connected <span style={{ color: '#3b82f6' }}>Accounts</span>
        </h1>
        <p className="text-[11px] uppercase tracking-[0.8px] font-medium mt-1"
          style={{ color: '#4a5a82', fontFamily: "'DM Sans', sans-serif" }}>
          Bank connection coming soon
        </p>
      </div>
      <div className="bg-[rgba(12,21,53,0.85)] border border-[rgba(255,255,255,0.07)]
        rounded-xl p-8 flex flex-col items-center text-center gap-3">
        <i className="fa-solid fa-building-columns text-[32px]"
          style={{ color: '#4a5a82', opacity: 0.5 }} />
        <p className="text-[14px] font-medium"
          style={{ color: '#eef2ff', fontFamily: "'Space Grotesk', sans-serif" }}>
          Bank connections coming soon
        </p>
        <p className="text-[12px] max-w-xs"
          style={{ color: '#94a3c8', fontFamily: "'DM Sans', sans-serif" }}>
          We are integrating with South African banks directly.
          You will be notified when your bank is ready to connect.
        </p>
      </div>
    </div>
  )
}
