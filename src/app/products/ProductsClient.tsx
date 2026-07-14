'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Plus, Package, CreditCard, ShoppingBag, Pencil, Trash2,
  DollarSign, Layers, MoreVertical, RefreshCw
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export default function ProductsClient({ initialProducts }: { initialProducts: any[] }) {
  const router = useRouter();
  const [products, setProducts] = useState(initialProducts);

  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '', description: '', price: '', currency: 'USD', type: 'service', is_recurring: false
  });
  const [saving, setSaving] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteProduct, setDeleteProduct] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);

  const openCreate = () => {
    setEditingProduct(null);
    setFormData({ name: '', description: '', price: '', currency: 'USD', type: 'service', is_recurring: false });
    setFormOpen(true);
  };

  const openEdit = (product: any) => {
    setEditingProduct(product);
    setFormData({
      name: product.name || '',
      description: product.description || '',
      price: product.price?.toString() || '',
      currency: product.currency || 'USD',
      type: product.type || 'service',
      is_recurring: product.is_recurring || false
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) { toast.error('Product name is required'); return; }
    if (!formData.price || isNaN(Number(formData.price))) { toast.error('Valid price is required'); return; }
    setSaving(true);
    try {
      const { createProduct, updateProduct } = await import('@/app/actions/commerce');
      const payload = { ...formData, price: Number(formData.price) };

      let res;
      if (editingProduct) {
        res = await updateProduct(editingProduct.id, payload);
      } else {
        res = await createProduct(payload);
      }

      if (res?.error) { toast.error(res.error); }
      else {
        toast.success(editingProduct ? 'Product updated!' : 'Product created!');
        if (editingProduct) {
          setProducts(prev => prev.map(p => p.id === editingProduct.id ? { ...p, ...payload } : p));
        } else {
          setProducts(prev => [res.data, ...prev]);
        }
        setFormOpen(false);
      }
    } catch (e: any) { toast.error(e.message || 'Failed to save product'); }
    setSaving(false);
  };

  const openDelete = (product: any) => { setDeleteProduct(product); setDeleteOpen(true); };

  const handleDelete = async () => {
    if (!deleteProduct) return;
    setDeleting(true);
    try {
      const { deleteProduct: deleteProductAction } = await import('@/app/actions/commerce');
      const res = await deleteProductAction(deleteProduct.id);
      if (res?.error) { toast.error(res.error); }
      else {
        toast.success('Product deleted');
        setProducts(prev => prev.filter(p => p.id !== deleteProduct.id));
        setDeleteOpen(false);
      }
    } catch { toast.error('Delete failed'); }
    setDeleting(false);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold !text-dash-text mb-1">Product <span className="text-dash-accent">catalog</span></h1>
          <p className="text-xs !text-dash-textMuted">Manage your digital and physical products.</p>
        </div>
        <Button onClick={openCreate} className="bg-dash-accent hover:bg-dash-accent/90 text-white !rounded-xl text-[10px] font-bold px-8 shadow-lg shadow-dash-accent/20 transition-colors motion-reduce:transition-none">
          <Plus className="w-4 h-4 mr-2" /> Add product
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {products.length === 0 ? (
          <div className="col-span-full py-20 bg-dash-surface border-2 border-dashed border-dash-border rounded-3xl flex flex-col items-center justify-center text-center cursor-pointer hover:border-dash-accent/40 transition-all motion-reduce:transition-none" onClick={openCreate}>
            <div className="w-16 h-16 bg-dash-accent/10 rounded-full flex items-center justify-center mb-6 border border-dash-accent/20">
              <Package className="w-8 h-8 text-dash-accent" />
            </div>
            <h3 className="text-lg font-bold !text-dash-textMuted">No products yet</h3>
            <p className="!text-dash-textMuted text-[10px] font-bold mt-2">Click to add your first product</p>
          </div>
        ) : products.map(product => (
          <div key={product.id} className="bg-white border border-dash-border rounded-2xl p-6 group hover:border-dash-accent/50 transition-all motion-reduce:transition-none duration-300 shadow-sm">
            <div className="flex justify-between items-start mb-6">
              <div className="h-12 w-12 rounded-2xl bg-dash-accent/10 flex items-center justify-center text-dash-accent border border-dash-accent/20">
                <ShoppingBag size={20} />
              </div>
              <div className="flex items-center gap-2">
                <Badge className="text-[9px] font-bold px-3 py-1 rounded-full border-none bg-blue-100 text-blue-700 capitalize">
                  {product.type || 'service'}
                </Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="h-8 w-8 rounded-lg bg-dash-surface hover:bg-dash-border/60 flex items-center justify-center transition-colors motion-reduce:transition-none">
                      <MoreVertical size={14} className="!text-dash-textMuted" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-white border border-dash-border shadow-xl rounded-xl min-w-[150px]">
                    <DropdownMenuItem onClick={() => openEdit(product)} className="flex items-center gap-2 cursor-pointer !text-dash-text hover:text-dash-accent hover:bg-dash-accent/5 rounded-lg mx-1 px-3 py-2">
                      <Pencil size={14} /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openDelete(product)} className="flex items-center gap-2 cursor-pointer text-red hover:bg-red/5 rounded-lg mx-1 px-3 py-2">
                      <Trash2 size={14} /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="text-xl font-bold !text-dash-text mb-1">{product.name}</h4>
              {product.description && <p className="!text-dash-textMuted text-xs line-clamp-2">{product.description}</p>}
              <p className="!text-dash-textMuted text-[10px] font-bold flex items-center gap-2 mt-2">
                <RefreshCw className="w-3 h-3 text-dash-accent" />
                {product.is_recurring ? 'Recurring subscription' : 'One-time purchase'}
              </p>
            </div>

            <div className="flex items-center justify-between pt-5 border-t border-dash-border">
              <div className="flex items-end gap-1">
                <span className="text-2xl font-bold !text-dash-text">${Number(product.price || 0).toLocaleString()}</span>
                <span className="text-[9px] font-bold !text-dash-textMuted mb-1">{product.currency || 'USD'}</span>
              </div>
              <Button onClick={() => openEdit(product)} variant="outline" className="h-9 px-4 rounded-xl border-dash-border text-[9px] font-bold !text-dash-textMuted hover:text-dash-accent hover:border-dash-accent hover:bg-dash-accent/5 transition-all motion-reduce:transition-none flex items-center gap-2">
                <Pencil size={12} /> Edit
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="bg-white border border-dash-border rounded-3xl max-w-lg p-8 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold !text-dash-text">
              {editingProduct ? 'Edit' : 'New'} <span className="text-dash-accent">product</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold !text-dash-textMuted">Product name *</Label>
              <Input value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Premium Consulting Package" className="h-12 border-dash-border rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold !text-dash-textMuted">Description</Label>
              <Textarea value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} placeholder="Describe the product or service..." className="min-h-[80px] border-dash-border rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold !text-dash-textMuted">Price *</Label>
                <Input type="number" step="0.01" value={formData.price} onChange={e => setFormData(p => ({ ...p, price: e.target.value }))} placeholder="0.00" className="h-12 border-dash-border rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold !text-dash-textMuted">Currency</Label>
                <Select value={formData.currency} onValueChange={v => setFormData(p => ({ ...p, currency: v }))}>
                  <SelectTrigger className="h-12 border-dash-border rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white border border-dash-border">
                    {['USD', 'EUR', 'GBP', 'NGN', 'CAD'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold !text-dash-textMuted">Type</Label>
                <Select value={formData.type} onValueChange={v => setFormData(p => ({ ...p, type: v }))}>
                  <SelectTrigger className="h-12 border-dash-border rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white border border-dash-border">
                    {['service', 'digital', 'physical', 'subscription'].map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold !text-dash-textMuted">Billing</Label>
                <Select value={formData.is_recurring ? 'recurring' : 'once'} onValueChange={v => setFormData(p => ({ ...p, is_recurring: v === 'recurring' }))}>
                  <SelectTrigger className="h-12 border-dash-border rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white border border-dash-border">
                    <SelectItem value="once">One-time</SelectItem>
                    <SelectItem value="recurring">Recurring</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-3">
            <Button variant="outline" onClick={() => setFormOpen(false)} className="border-dash-border !text-dash-textMuted rounded-xl">Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-dash-accent hover:bg-dash-accent/90 text-white rounded-xl font-bold text-xs px-8 transition-colors motion-reduce:transition-none">{saving ? 'Saving...' : (editingProduct ? 'Save changes' : 'Create product')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="bg-white border border-dash-border rounded-3xl max-w-sm p-8 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold !text-dash-text">Delete product?</DialogTitle>
          </DialogHeader>
          <p className="!text-dash-textMuted text-sm py-4">This will permanently delete <strong className="!text-dash-text">{deleteProduct?.name}</strong>.</p>
          <DialogFooter className="gap-3">
            <Button variant="outline" onClick={() => setDeleteOpen(false)} className="border-dash-border !text-dash-textMuted rounded-xl">Cancel</Button>
            <Button onClick={handleDelete} disabled={deleting} className="bg-red hover:bg-red/90 text-white rounded-xl font-bold text-xs px-8 transition-colors motion-reduce:transition-none">{deleting ? 'Deleting...' : 'Delete'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
