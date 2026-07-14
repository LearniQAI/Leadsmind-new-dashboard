'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
 ShoppingBag, Search, Download, MoreVertical, Eye, CheckCircle,
 Clock, XCircle, Truck, RefreshCw
} from 'lucide-react';
import {
 Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import {
 DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { format } from 'date-fns';

const ORDER_STATUSES = ['pending', 'processing', 'completed', 'refunded', 'cancelled'];

const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
 pending: { color: 'bg-amber-100 text-amber-700', icon: <Clock className="h-3 w-3" /> },
 processing: { color: 'bg-blue-100 text-blue-700', icon: <RefreshCw className="h-3 w-3" /> },
 completed: { color: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle className="h-3 w-3" /> },
 refunded: { color: 'bg-purple-100 text-purple-700', icon: <RefreshCw className="h-3 w-3" /> },
 cancelled: { color: 'bg-rose-100 text-rose-700', icon: <XCircle className="h-3 w-3" /> },
};

export default function OrdersClient({ initialOrders }: { initialOrders: any[] }) {
 const [orders, setOrders] = useState<any[]>(initialOrders);
 const [search, setSearch] = useState('');
 const [viewOrder, setViewOrder] = useState<any>(null);

 const updateStatus = async (order: any, newStatus: string) => {
  try {
   const { updateOrderStatus } = await import('@/app/actions/order_actions');
   const res = await updateOrderStatus(order.id, newStatus);
   if (res.error) { toast.error(res.error); return; }
   setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: newStatus } : o));
   toast.success(`Order marked as ${newStatus}`);
  } catch { toast.error('Update failed'); }
 };

 const filtered = orders.filter(o => {
  if (!search) return true;
  const name = `${o.contact?.first_name || ''} ${o.contact?.last_name || ''}`.toLowerCase();
  return name.includes(search.toLowerCase()) || o.id.includes(search);
 });

 return (
  <div className="space-y-8">
   <div className="flex items-center justify-between">
    <div>
     <h1 className="text-3xl font-bold !text-dash-text mb-1">Order <span className="text-dash-accent">registry</span></h1>
     <p className="text-xs !text-dash-textMuted">Track and manage all customer transactions.</p>
    </div>
    <Button variant="outline" className="h-11 px-6 border-dash-border !text-dash-textMuted font-bold text-[10px] rounded-xl hover:text-dash-accent hover:border-dash-accent hover:bg-dash-accent/5 transition-colors motion-reduce:transition-none">
     <Download className="w-4 h-4 mr-2" /> Export CSV
    </Button>
   </div>

   <div className="bg-white border border-dash-border rounded-2xl p-6 shadow-sm">
    <div className="flex flex-col md:flex-row gap-4 mb-6">
     <div className="relative flex-1">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 !text-dash-textMuted" />
      <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by customer name or order ID..." className="pl-10 h-11 border-dash-border rounded-xl" />
     </div>
     <div className="text-[10px] font-bold !text-dash-textMuted flex items-center px-3">
      {filtered.length} orders
     </div>
    </div>

    {filtered.length === 0 ? (
     <div className="py-20 text-center">
      <ShoppingBag className="h-12 w-12 !text-dash-textMuted opacity-40 mx-auto mb-4" />
      <p className="!text-dash-textMuted font-bold text-sm">{orders.length === 0 ? 'No orders yet' : 'No results match your search'}</p>
     </div>
    ) : (
     <div className="overflow-x-auto">
      <table className="w-full text-sm">
       <thead>
        <tr className="border-b border-dash-border">
         {['Order ID', 'Customer', 'Status', 'Total', 'Date', 'Actions'].map(h => (
          <th key={h} className="text-left px-4 py-3 text-[10px] font-bold !text-dash-textMuted">{h}</th>
         ))}
        </tr>
       </thead>
       <tbody className="divide-y divide-dash-border">
        {filtered.map(order => {
         const sc = statusConfig[order.status] || statusConfig.pending;
         return (
          <tr key={order.id} className="hover:bg-dash-surface transition-colors motion-reduce:transition-none group">
           <td className="px-4 py-4 font-bold !text-dash-textMuted text-xs">#{order.id.slice(0, 8).toUpperCase()}</td>
           <td className="px-4 py-4">
            <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-lg bg-dash-accent/10 border border-dash-accent/20 flex items-center justify-center text-[10px] font-bold text-dash-accent">
              {order.contact?.first_name?.[0] || 'U'}
             </div>
             <div>
              <p className="text-xs font-bold !text-dash-text">{order.contact?.first_name} {order.contact?.last_name}</p>
              <p className="text-[9px] !text-dash-textMuted lowercase">{order.contact?.email}</p>
             </div>
            </div>
           </td>
           <td className="px-4 py-4">
            <Badge className={`${sc.color} border-none text-[9px] font-bold flex items-center gap-1 w-fit capitalize`}>
             {sc.icon} {order.status}
            </Badge>
           </td>
           <td className="px-4 py-4 font-bold !text-dash-text">${Number(order.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
           <td className="px-4 py-4 !text-dash-textMuted text-xs whitespace-nowrap">
            {order.created_at ? format(new Date(order.created_at), 'MMM d, yyyy') : '—'}
           </td>
           <td className="px-4 py-4">
            <DropdownMenu>
             <DropdownMenuTrigger asChild>
              <button className="h-8 w-8 rounded-lg bg-dash-surface hover:bg-dash-border/60 flex items-center justify-center transition-colors motion-reduce:transition-none opacity-0 group-hover:opacity-100">
               <MoreVertical size={14} className="!text-dash-textMuted" />
              </button>
             </DropdownMenuTrigger>
             <DropdownMenuContent align="end" className="bg-white border border-dash-border shadow-xl rounded-xl min-w-[170px]">
              <DropdownMenuItem onClick={() => setViewOrder(order)} className="flex items-center gap-2 cursor-pointer !text-dash-text hover:text-dash-accent hover:bg-dash-accent/5 rounded-lg mx-1 px-3 py-2">
               <Eye size={14} /> View details
              </DropdownMenuItem>
              {ORDER_STATUSES.filter(s => s !== order.status).map(s => (
               <DropdownMenuItem key={s} onClick={() => updateStatus(order, s)} className="flex items-center gap-2 cursor-pointer !text-dash-text hover:bg-dash-surface rounded-lg mx-1 px-3 py-2 capitalize">
                <span className={`w-2 h-2 rounded-full ${statusConfig[s]?.color.split(' ')[0].replace('bg-', 'bg-')}`} />
                Mark as {s}
               </DropdownMenuItem>
              ))}
             </DropdownMenuContent>
            </DropdownMenu>
           </td>
          </tr>
         );
        })}
       </tbody>
      </table>
     </div>
    )}
   </div>

   {/* View Order Detail Dialog */}
   <Dialog open={!!viewOrder} onOpenChange={() => setViewOrder(null)}>
    <DialogContent className="bg-white border border-dash-border rounded-3xl max-w-md p-8 shadow-2xl">
     <DialogHeader>
      <DialogTitle className="text-xl font-bold !text-dash-text">
       Order <span className="text-dash-accent">#{viewOrder?.id?.slice(0, 8).toUpperCase()}</span>
      </DialogTitle>
     </DialogHeader>
     {viewOrder && (
      <div className="space-y-4 py-4">
       <div className="grid grid-cols-2 gap-4">
        <div>
         <p className="text-[10px] font-bold !text-dash-textMuted mb-1">Customer</p>
         <p className="font-bold !text-dash-text">{viewOrder.contact?.first_name} {viewOrder.contact?.last_name}</p>
         <p className="text-xs !text-dash-textMuted">{viewOrder.contact?.email}</p>
        </div>
        <div>
         <p className="text-[10px] font-bold !text-dash-textMuted mb-1">Status</p>
         <Badge className={`${statusConfig[viewOrder.status]?.color} border-none text-[9px] font-bold capitalize`}>{viewOrder.status}</Badge>
        </div>
       </div>
       <div className="p-4 bg-dash-surface rounded-xl border border-dash-border">
        <div className="flex justify-between items-center">
         <span className="text-[10px] font-bold !text-dash-textMuted">Total amount</span>
         <span className="text-2xl font-bold !text-dash-text">${Number(viewOrder.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>
       </div>
       <div className="flex flex-wrap gap-2">
        {ORDER_STATUSES.filter(s => s !== viewOrder.status).map(s => (
         <Button key={s} size="sm" onClick={() => { updateStatus(viewOrder, s); setViewOrder(null); }} className="rounded-xl text-[9px] font-bold bg-dash-surface !text-dash-text hover:bg-dash-accent hover:text-white capitalize h-9 px-4 transition-colors motion-reduce:transition-none">
          Mark as {s}
         </Button>
        ))}
       </div>
      </div>
     )}
     <DialogFooter>
      <Button variant="outline" onClick={() => setViewOrder(null)} className="border-dash-border !text-dash-textMuted rounded-xl">Close</Button>
     </DialogFooter>
    </DialogContent>
   </Dialog>
  </div>
 );
}
