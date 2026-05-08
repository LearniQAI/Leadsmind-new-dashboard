'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { ShoppingBag, Search, Filter, Download, MoreHorizontal, Eye, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function OrdersClient({ initialOrders }: { initialOrders: any[] }) {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter text-white italic leading-none">Order <span className="text-primary">Registry</span></h1>
          <p className="text-white/40 text-sm font-medium mt-2 italic">Track and process high-frequency neural transactions.</p>
        </div>
        <div className="flex gap-4">
          <Button variant="ghost" className="h-12 px-6 bg-white/5 border border-white/10 text-white font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-white/10 transition-all">
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </Button>
        </div>
      </div>

      <div className="bg-[#0b0b1a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative z-10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-[100px] -mr-48 -mt-48 pointer-events-none" />
        
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5 backdrop-blur-xl relative z-10">
          <div className="flex items-center gap-4">
             <div className="relative">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
               <input 
                 type="text" 
                 placeholder="Search orders..." 
                 className="h-10 w-64 bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-primary/50 transition-all font-bold uppercase tracking-widest"
               />
             </div>
             <Button variant="ghost" className="h-10 px-4 bg-white/5 border border-white/10 text-white/40 hover:text-white text-[9px] font-black uppercase tracking-widest rounded-xl"><Filter className="w-3.5 h-3.5 mr-2" /> Filter</Button>
          </div>
          <div className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] italic">
            Displaying {initialOrders.length} Transaction Nodes
          </div>
        </div>

        <div className="overflow-x-auto relative z-10">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-white/30">Order ID</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-white/30">Customer</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-white/30">Status</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-white/30">Total</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-white/30">Date</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-white/30 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {initialOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center text-white/20 font-black uppercase tracking-widest italic">No transaction data available</td>
                </tr>
              ) : (
                initialOrders.map(order => (
                  <tr key={order.id} className="hover:bg-primary/5 transition-colors group">
                    <td className="px-8 py-5 font-black text-white/60 text-xs italic">#{order.id.slice(0, 8).toUpperCase()}</td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-black text-white italic">
                          {order.contact?.first_name?.[0] || 'U'}
                        </div>
                        <div>
                          <p className="text-xs font-black text-white italic uppercase tracking-tight">{order.contact?.first_name} {order.contact?.last_name}</p>
                          <p className="text-[9px] text-white/20 font-bold lowercase tracking-normal">{order.contact?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <Badge className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border-none ${order.status === 'completed' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                        {order.status}
                      </Badge>
                    </td>
                    <td className="px-8 py-5 font-black text-white italic text-sm">${Number(order.total).toLocaleString()}</td>
                    <td className="px-8 py-5 text-[10px] font-black text-white/20 uppercase tracking-widest italic">{new Date(order.created_at).toLocaleDateString()}</td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-white/20 hover:text-primary"><Eye size={14} /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-white/20 hover:text-primary"><ExternalLink size={14} /></Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
