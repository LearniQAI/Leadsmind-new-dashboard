'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
 Star, MessageSquare, Globe, Search, Pencil, Trash2, MoreVertical,
 CheckCircle, Reply
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
 Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import {
 DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

export default function ReputationClient({ initialReviews }: { initialReviews: any[] }) {
 const [reviews, setReviews] = useState<any[]>(initialReviews);
 const [search, setSearch] = useState('');

 const [respondOpen, setRespondOpen] = useState(false);
 const [respondTarget, setRespondTarget] = useState<any>(null);
 const [responseText, setResponseText] = useState('');
 const [responding, setResponding] = useState(false);

 const [deleteOpen, setDeleteOpen] = useState(false);
 const [deleteTarget, setDeleteTarget] = useState<any>(null);
 const [deleting, setDeleting] = useState(false);

 const avgRating = reviews.length > 0
  ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
  : '0.0';

 const handleRespond = async () => {
  if (!responseText.trim()) { toast.error('Please write a response'); return; }
  setResponding(true);
  try {
   const { respondToReview } = await import('@/app/actions/reputation_actions');
   const res = await respondToReview(respondTarget.id, responseText);
   if (res.error) { toast.error(res.error); }
   else {
    toast.success('Response saved!');
    setReviews(prev => prev.map(r => r.id === respondTarget.id ? { ...r, owner_response: responseText, is_responded: true } : r));
    setRespondOpen(false);
    setResponseText('');
   }
  } catch { toast.error('Failed to save response'); }
  setResponding(false);
 };

 const handleDelete = async () => {
  if (!deleteTarget) return;
  setDeleting(true);
  try {
   const { deleteReview } = await import('@/app/actions/reputation_actions');
   const res = await deleteReview(deleteTarget.id);
   if (res.error) { toast.error(res.error); }
   else {
    toast.success('Review removed');
    setReviews(prev => prev.filter(r => r.id !== deleteTarget.id));
    setDeleteOpen(false);
   }
  } catch { toast.error('Delete failed'); }
  setDeleting(false);
 };

 const filtered = reviews.filter(r =>
  !search || r.reviewer_name?.toLowerCase().includes(search.toLowerCase()) || r.body?.toLowerCase().includes(search.toLowerCase())
 );

 return (
  <div className="space-y-8">
   <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
    <div>
     <h1 className="card__title !text-4xl uppercase mb-1">Reputation <span className="text-primary">Manager</span></h1>
     <p className="card__sub-title !text-[11px] uppercase tracking-[0.2em]">Monitor and respond to your business reviews.</p>
    </div>
    <div className="flex items-center gap-4">
     <div className="card__wrapper !p-4 !mb-0 flex items-center gap-4 shadow-md">
      <div className="flex items-center gap-1">
       {[1, 2, 3, 4, 5].map(i => <Star key={i} className={`w-4 h-4 ${i <= Number(avgRating) ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />)}
      </div>
      <span className="text-2xl font-black text-gray-800">{avgRating}</span>
      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-l border-gray-200 pl-4">{reviews.length} Reviews</span>
     </div>
    </div>
   </div>

   <div className="relative">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
    <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search reviews by name or content..." className="pl-10 h-11 border-gray-200 rounded-xl" />
   </div>

   <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
    {filtered.length === 0 ? (
     <div className="col-span-full py-20 bg-gray-50 border-2 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center text-center">
      <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6 border border-primary/20">
       <Star className="w-8 h-8 text-primary" />
      </div>
      <h3 className="text-lg font-black uppercase text-gray-500 tracking-widest">No Reviews Yet</h3>
      <p className="text-gray-400 text-[10px] font-bold mt-2 uppercase tracking-widest">Connect your platforms to sync reviews</p>
     </div>
    ) : filtered.map(review => (
     <div key={review.id} className="card__wrapper !p-6 !mb-0 group hover:border-primary/50 transition-all duration-300 shadow-lg">
      <div className="flex justify-between items-start mb-4">
       <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black text-sm">
         {review.reviewer_name?.[0] || 'A'}
        </div>
        <div>
         <h4 className="text-sm font-black text-gray-800 uppercase tracking-tight">{review.reviewer_name}</h4>
         <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">
          {review.review_date ? new Date(review.review_date).toLocaleDateString() : '—'}
         </span>
        </div>
       </div>
       <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400">
         {review.platform === 'google' ? <Globe className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
        </div>
        <DropdownMenu>
         <DropdownMenuTrigger asChild>
          <button className="h-8 w-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
           <MoreVertical size={14} className="text-gray-600" />
          </button>
         </DropdownMenuTrigger>
         <DropdownMenuContent align="end" className="bg-white border border-gray-200 shadow-xl rounded-xl min-w-[160px]">
          <DropdownMenuItem onClick={() => { setRespondTarget(review); setResponseText(review.owner_response || ''); setRespondOpen(true); }} className="flex items-center gap-2 cursor-pointer text-gray-700 hover:text-primary hover:bg-primary/5 rounded-lg mx-1 px-3 py-2">
           <Reply size={14} /> Respond
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => { setDeleteTarget(review); setDeleteOpen(true); }} className="flex items-center gap-2 cursor-pointer text-rose-600 hover:bg-rose-50 rounded-lg mx-1 px-3 py-2">
           <Trash2 size={14} /> Remove
          </DropdownMenuItem>
         </DropdownMenuContent>
        </DropdownMenu>
       </div>
      </div>

      <div className="flex items-center gap-1 mb-3">
       {[1, 2, 3, 4, 5].map(i => <Star key={i} className={`w-3.5 h-3.5 ${i <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />)}
      </div>

      <p className="text-sm text-gray-600 leading-relaxed line-clamp-4 mb-4">"{review.body}"</p>

      {review.owner_response && (
       <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl mb-4">
        <p className="text-[9px] font-black uppercase tracking-widest text-primary mb-1">Your Response</p>
        <p className="text-xs text-gray-600 line-clamp-2">{review.owner_response}</p>
       </div>
      )}

      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
       <Badge className={`border-none text-[9px] font-black uppercase ${review.is_responded ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
        {review.is_responded ? 'Responded' : 'Awaiting Response'}
       </Badge>
       <Button onClick={() => { setRespondTarget(review); setResponseText(review.owner_response || ''); setRespondOpen(true); }} variant="outline" size="sm" className="h-8 px-4 rounded-xl border-gray-200 text-[9px] font-black uppercase text-gray-600 hover:text-primary hover:border-primary hover:bg-primary/5 flex items-center gap-1.5">
        <Reply size={11} /> {review.owner_response ? 'Edit Response' : 'Respond'}
       </Button>
      </div>
     </div>
    ))}
   </div>

   {/* Respond Dialog */}
   <Dialog open={respondOpen} onOpenChange={setRespondOpen}>
    <DialogContent className="bg-white border border-gray-200 rounded-3xl max-w-lg p-8 shadow-2xl">
     <DialogHeader>
      <DialogTitle className="text-xl font-black uppercase tracking-tight text-gray-800">
       Respond to <span className="text-primary">{respondTarget?.reviewer_name}</span>
      </DialogTitle>
     </DialogHeader>
     <div className="py-4 space-y-4">
      {respondTarget && (
       <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
        <div className="flex items-center gap-1 mb-2">
         {[1, 2, 3, 4, 5].map(i => <Star key={i} className={`w-3 h-3 ${i <= respondTarget.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />)}
        </div>
        <p className="text-sm text-gray-600 italic line-clamp-3">"{respondTarget.body}"</p>
       </div>
      )}
      <div className="space-y-2">
       <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Your Response</Label>
       <Textarea value={responseText} onChange={e => setResponseText(e.target.value)} placeholder="Thank you for your feedback..." className="min-h-[120px] border-gray-200 rounded-xl" />
      </div>
     </div>
     <DialogFooter className="gap-3">
      <Button variant="outline" onClick={() => setRespondOpen(false)} className="border-gray-200 text-gray-600 rounded-xl">Cancel</Button>
      <Button onClick={handleRespond} disabled={responding} className="btn-primary rounded-xl font-black uppercase text-xs px-8">{responding ? 'Saving...' : 'Save Response'}</Button>
     </DialogFooter>
    </DialogContent>
   </Dialog>

   {/* Delete Dialog */}
   <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
    <DialogContent className="bg-white border border-gray-200 rounded-3xl max-w-sm p-8 shadow-2xl">
     <DialogHeader>
      <DialogTitle className="text-xl font-black uppercase tracking-tight text-gray-800">Remove Review?</DialogTitle>
     </DialogHeader>
     <p className="text-gray-500 text-sm py-4">This will remove the review from <strong className="text-gray-800">{deleteTarget?.reviewer_name}</strong> from your dashboard.</p>
     <DialogFooter className="gap-3">
      <Button variant="outline" onClick={() => setDeleteOpen(false)} className="border-gray-200 text-gray-600 rounded-xl">Cancel</Button>
      <Button onClick={handleDelete} disabled={deleting} className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black uppercase text-xs px-8">{deleting ? 'Removing...' : 'Remove'}</Button>
     </DialogFooter>
    </DialogContent>
   </Dialog>
  </div>
 );
}
