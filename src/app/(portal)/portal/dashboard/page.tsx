import React from 'react';
import { 
  Download, FileText, CreditCard, Wallet, 
  History, Settings, LogOut, ChevronRight 
} from 'lucide-react';
import MetaData from '@/hooks/useMetaData';

export default function PortalDashboard() {
  return (
    <MetaData pageTitle="Client Dashboard">
      <div className="min-h-screen bg-[#04091a] text-[var(--t1)] flex">
         {/* Sidebar */}
         <aside className="w-64 border-r border-[var(--bdr)] bg-[rgba(11,17,33,0.5)] backdrop-blur-xl flex flex-col p-6">
            <div className="text-lg font-black tracking-tighter text-[var(--accent2)] mb-12">LEADSMIND</div>
            
            <nav className="flex-1 space-y-2">
               {[
                 { label: 'Overview', icon: History, active: true },
                 { label: 'Documents', icon: FileText },
                 { label: 'Retainers', icon: Wallet },
                 { label: 'Account', icon: Settings },
               ].map((item, i) => (
                 <button 
                   key={i}
                   className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                     item.active ? 'bg-[var(--accentg)] text-[var(--accent2)]' : 'text-[var(--t3)] hover:text-[var(--t1)] hover:bg-[rgba(255,255,255,0.03)]'
                   }`}
                 >
                    <item.icon size={16} /> {item.label}
                 </button>
               ))}
            </nav>

            <button className="flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-rose-500 hover:bg-rose-500/10 transition-all">
               <LogOut size={16} /> Sign Out
            </button>
         </aside>

         {/* Main Content */}
         <main className="flex-1 overflow-y-auto p-12">
            <div className="max-w-5xl mx-auto space-y-12">
               <div className="flex justify-between items-end">
                  <div>
                     <h1 className="text-4xl font-bold font-space text-[var(--t1)] uppercase tracking-tight">Portal <span className="text-[var(--accent2)]">Overview</span></h1>
                     <p className="text-[11px] text-[var(--t3)] uppercase tracking-[0.2em] mt-2 font-medium">Welcome back, verified customer</p>
                  </div>
                  <button className="btn-primary !h-12 !px-8 text-xs gap-2">
                     Pay All Balances <CreditCard size={16} />
                  </button>
               </div>

               {/* Metrics Grid */}
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { label: 'Outstanding Due', value: '$2,450.00', sub: 'Across 3 invoices', color: 'text-rose-500' },
                    { label: 'Total Paid', value: '$15,800.00', sub: 'Lifetime billing', color: 'text-emerald-500' },
                    { label: 'Retainer Credit', value: '$500.00', sub: 'Ready to apply', color: 'text-blue-500' },
                  ].map((stat, i) => (
                    <div key={i} className="bg-[var(--n800)] border border-[var(--bdr)] p-8 rounded-[var(--r24)] shadow-xl">
                       <p className="text-[10px] font-black text-[var(--t4)] uppercase tracking-[0.2em] mb-2">{stat.label}</p>
                       <p className={`text-3xl font-bold font-space ${stat.color}`}>{stat.value}</p>
                       <p className="text-[10px] text-[var(--t4)] font-medium mt-1">{stat.sub}</p>
                    </div>
                  ))}
               </div>

               {/* Recent Transactions Table */}
               <div className="bg-[var(--n800)] border border-[var(--bdr)] rounded-[var(--r24)] overflow-hidden">
                  <div className="p-6 border-b border-[var(--bdr)] flex items-center justify-between">
                     <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--t1)]">Recent Documents</h3>
                     <button className="text-[10px] font-black uppercase text-blue-500 hover:underline">View All</button>
                  </div>
                  <div className="overflow-x-auto">
                     <table className="w-full text-left">
                        <thead>
                           <tr className="border-b border-[var(--bdr)] bg-[rgba(255,255,255,0.01)] text-[10px] font-black uppercase tracking-widest text-[var(--t4)]">
                              <th className="px-8 py-4">Number</th>
                              <th className="px-8 py-4">Date</th>
                              <th className="px-8 py-4">Status</th>
                              <th className="px-8 py-4 text-right">Amount</th>
                              <th className="px-8 py-4"></th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--bdr)]">
                           {[
                             { no: 'INV-2026-102', date: '12 May 2026', status: 'overdue', amount: '$1,200.00' },
                             { no: 'INV-2026-098', date: '04 May 2026', status: 'paid', amount: '$850.00' },
                             { no: 'INV-2026-085', date: '22 Apr 2026', status: 'paid', amount: '$3,400.00' },
                           ].map((inv, i) => (
                             <tr key={i} className="hover:bg-[rgba(255,255,255,0.015)] transition-all group">
                                <td className="px-8 py-6 text-xs font-bold text-blue-400 font-space">{inv.no}</td>
                                <td className="px-8 py-6 text-xs text-[var(--t3)] font-medium">{inv.date}</td>
                                <td className="px-8 py-6">
                                   <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-full border ${
                                     inv.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                   }`}>
                                      {inv.status}
                                   </span>
                                </td>
                                <td className="px-8 py-6 text-right text-xs font-bold text-[var(--t1)] font-space">{inv.amount}</td>
                                <td className="px-8 py-6 text-right">
                                   <button className="p-2 rounded-lg bg-[var(--n900)] border border-[var(--bdr)] text-[var(--t4)] group-hover:text-[var(--t1)] transition-all">
                                      <Download size={14} />
                                   </button>
                                </td>
                             </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>
               </div>
            </div>
         </main>
      </div>
    </MetaData>
  );
}
