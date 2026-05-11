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
     <h1 className="card__title !text-4xl uppercase mb-1">Order <span className="text-primary">Registry</span></h1>
     <p className="card__sub-title !text-[11px] uppercase tracking-[0.2em]">Track and manage all customer transactions.</p>
    </div>
    <Button variant="outline" className="h-11 px-6 border-gray-200 text-gray-600 font-black uppercase tracking-widest text-[10px] rounded-xl hover:text-primary hover:border-primary hover:bg-primary/5">
     <Download className="w-4 h-4 mr-2" /> Export CSV
    </Button>
   </div>

   <div className="card__wrapper shadow-lg">
    <div className="flex flex-col md:flex-row gap-4 mb-6">
     <div className="relative flex-1">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
      <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by customer name or order ID..." className="pl-10 h-11 border-gray-200 rounded-xl" />
     </div>
     <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center px-3">
      {filtered.length} Orders
     </div>
    </div>

    {filtered.length === 0 ? (
     <div className="py-20 text-center">
      <ShoppingBag className="h-12 w-12 text-gray-300 mx-auto mb-4" />
      <p className="text-gray-400 font-bold text-sm uppercase tracking-widest">{orders.length === 0 ? 'No orders yet' : 'No results match your search'}</p>
     </div>
    ) : (
     <div className="overflow-x-auto">
      <table className="w-full text-sm">
       <thead>
        <tr className="border-b border-gray-100">
         {['Order ID', 'Customer', 'Status', 'Total', 'Date', 'Actions'].map(h => (
          <th key={h} className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">{h}</th>
         ))}
        </tr>
       </thead>
       <tbody className="divide-y divide-gray-50">
        {filtered.map(order => {
         const sc = statusConfig[order.status] || statusConfig.pending;
         return (
          <tr key={order.id} className="hover:bg-gray-50 transition-colors group">
           <td className="px-4 py-4 font-black text-gray-500 text-xs">#{order.id.slice(0, 8).toUpperCase()}</td>
           <td className="px-4 py-4">
            <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-black text-primary">
              {order.contact?.first_name?.[0] || 'U'}
             </div>
             <div>
              <p className="text-xs font-black text-gray-800 uppercase tracking-tight">{order.contact?.first_name} {order.contact?.last_name}</p>
              <p className="text-[9px] text-gray-400 lowercase">{order.contact?.email}</p>
             </div>
            </div>
           </td>
           <td className="px-4 py-4">
            <Badge className={`${sc.color} border-none text-[9px] font-black uppercase flex items-center gap-1 w-fit`}>
             {sc.icon} {order.status}
            </Badge>
           </td>
           <td className="px-4 py-4 font-black text-gray-800">${Number(order.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
           <td className="px-4 py-4 text-gray-400 text-xs whitespace-nowrap">
            {order.created_at ? format(new Date(order.created_at), 'MMM d, yyyy') : '—'}
           </td>
           <td className="px-4 py-4">
            <DropdownMenu>
             <DropdownMenuTrigger asChild>
              <button className="h-8 w-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100">
               <MoreVertical size={14} className="text-gray-600" />
              </button>
             </DropdownMenuTrigger>
             <DropdownMenuContent align="end" className="bg-white border border-gray-200 shadow-xl rounded-xl min-w-[170px]">
              <DropdownMenuItem onClick={() => setViewOrder(order)} className="flex items-center gap-2 cursor-pointer text-gray-700 hover:text-primary hover:bg-primary/5 rounded-lg mx-1 px-3 py-2">
               <Eye size={14} /> View Details
              </DropdownMenuItem>
              {ORDER_STATUSES.filter(s => s !== order.status).map(s => (
               <DropdownMenuItem key={s} onClick={() => updateStatus(order, s)} className="flex items-center gap-2 cursor-pointer text-gray-700 hover:bg-gray-50 rounded-lg mx-1 px-3 py-2 capitalize">
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
    <DialogContent className="bg-white border border-gray-200 rounded-3xl max-w-md p-8 shadow-2xl">
     <DialogHeader>
      <DialogTitle className="text-xl font-black uppercase tracking-tight text-gray-800">
       Order <span className="text-primary">#{viewOrder?.id?.slice(0, 8).toUpperCase()}</span>
      </DialogTitle>
     </DialogHeader>
     {viewOrder && (
      <div className="space-y-4 py-4">
       <div className="grid grid-cols-2 gap-4">
        <div>
         <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Customer</p>
         <p className="font-bold text-gray-800">{viewOrder.contact?.first_name} {viewOrder.contact?.last_name}</p>
         <p className="text-xs text-gray-400">{viewOrder.contact?.email}</p>
        </div>
        <div>
         <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Status</p>
         <Badge className={`${statusConfig[viewOrder.status]?.color} border-none text-[9px] font-black uppercase`}>{viewOrder.status}</Badge>
        </div>
       </div>
       <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
        <div className="flex justify-between items-center">
         <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Total Amount</span>
         <span className="text-2xl font-black text-gray-800">${Number(viewOrder.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>
       </div>
       <div className="flex flex-wrap gap-2">
        {ORDER_STATUSES.filter(s => s !== viewOrder.status).map(s => (
         <Button key={s} size="sm" onClick={() => { updateStatus(viewOrder, s); setViewOrder(null); }} className="rounded-xl text-[9px] font-black uppercase bg-gray-100 text-gray-700 hover:bg-primary hover:text-white capitalize h-9 px-4">
          Mark as {s}
         </Button>
        ))}
       </div>
      </div>
     )}
     <DialogFooter>
      <Button variant="outline" onClick={() => setViewOrder(null)} className="border-gray-200 text-gray-600 rounded-xl">Close</Button>
     </DialogFooter>
    </DialogContent>
   </Dialog>
  </div>
 );
}
