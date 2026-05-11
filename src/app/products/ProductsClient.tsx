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
          <h1 className="card__title !text-4xl uppercase mb-1">Product <span className="text-primary">Catalog</span></h1>
          <p className="card__sub-title !text-[11px] uppercase tracking-[0.2em]">Manage your digital and physical products.</p>
        </div>
        <Button onClick={openCreate} className="btn-primary !rounded-xl text-[10px] uppercase font-black tracking-widest px-8 shadow-lg shadow-primary/20">
          <Plus className="w-4 h-4 mr-2" /> Add Product
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {products.length === 0 ? (
          <div className="col-span-full py-20 bg-gray-50 border-2 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center text-center cursor-pointer hover:border-primary/40 transition-all" onClick={openCreate}>
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6 border border-primary/20">
              <Package className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-black uppercase text-gray-500 tracking-widest">No Products Yet</h3>
            <p className="text-gray-400 text-[10px] font-bold mt-2 uppercase tracking-widest">Click to add your first product</p>
          </div>
        ) : products.map(product => (
          <div key={product.id} className="card__wrapper !p-6 !mb-0 group hover:border-primary/50 transition-all duration-300 shadow-lg">
            <div className="flex justify-between items-start mb-6">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                <ShoppingBag size={20} />
              </div>
              <div className="flex items-center gap-2">
                <Badge className="text-[9px] font-black uppercase px-3 py-1 rounded-full border-none bg-blue-100 text-blue-700">
                  {product.type || 'service'}
                </Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="h-8 w-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
                      <MoreVertical size={14} className="text-gray-600" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-white border border-gray-200 shadow-xl rounded-xl min-w-[150px]">
                    <DropdownMenuItem onClick={() => openEdit(product)} className="flex items-center gap-2 cursor-pointer text-gray-700 hover:text-primary hover:bg-primary/5 rounded-lg mx-1 px-3 py-2">
                      <Pencil size={14} /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openDelete(product)} className="flex items-center gap-2 cursor-pointer text-rose-600 hover:bg-rose-50 rounded-lg mx-1 px-3 py-2">
                      <Trash2 size={14} /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="text-xl font-black text-gray-800 uppercase tracking-tighter mb-1">{product.name}</h4>
              {product.description && <p className="text-gray-400 text-xs line-clamp-2">{product.description}</p>}
              <p className="text-gray-400 text-[10px] font-bold tracking-widest uppercase flex items-center gap-2 mt-2">
                <RefreshCw className="w-3 h-3 text-primary" />
                {product.is_recurring ? 'Recurring Subscription' : 'One-time Purchase'}
              </p>
            </div>

            <div className="flex items-center justify-between pt-5 border-t border-gray-100">
              <div className="flex items-end gap-1">
                <span className="text-2xl font-black text-gray-800">${Number(product.price || 0).toLocaleString()}</span>
                <span className="text-[9px] font-bold text-gray-400 uppercase mb-1">{product.currency || 'USD'}</span>
              </div>
              <Button onClick={() => openEdit(product)} variant="outline" className="h-9 px-4 rounded-xl border-gray-200 text-[9px] font-black uppercase text-gray-600 hover:text-primary hover:border-primary hover:bg-primary/5 transition-all flex items-center gap-2">
                <Pencil size={12} /> Edit
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="bg-white border border-gray-200 rounded-3xl max-w-lg p-8 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-tight text-gray-800">
              {editingProduct ? 'Edit' : 'New'} <span className="text-primary">Product</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Product Name *</Label>
              <Input value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Premium Consulting Package" className="h-12 border-gray-200 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Description</Label>
              <Textarea value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} placeholder="Describe the product or service..." className="min-h-[80px] border-gray-200 rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Price *</Label>
                <Input type="number" step="0.01" value={formData.price} onChange={e => setFormData(p => ({ ...p, price: e.target.value }))} placeholder="0.00" className="h-12 border-gray-200 rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Currency</Label>
                <Select value={formData.currency} onValueChange={v => setFormData(p => ({ ...p, currency: v }))}>
                  <SelectTrigger className="h-12 border-gray-200 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white border border-gray-200">
                    {['USD', 'EUR', 'GBP', 'NGN', 'CAD'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Type</Label>
                <Select value={formData.type} onValueChange={v => setFormData(p => ({ ...p, type: v }))}>
                  <SelectTrigger className="h-12 border-gray-200 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white border border-gray-200">
                    {['service', 'digital', 'physical', 'subscription'].map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Billing</Label>
                <Select value={formData.is_recurring ? 'recurring' : 'once'} onValueChange={v => setFormData(p => ({ ...p, is_recurring: v === 'recurring' }))}>
                  <SelectTrigger className="h-12 border-gray-200 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white border border-gray-200">
                    <SelectItem value="once">One-time</SelectItem>
                    <SelectItem value="recurring">Recurring</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-3">
            <Button variant="outline" onClick={() => setFormOpen(false)} className="border-gray-200 text-gray-600 rounded-xl">Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="btn-primary rounded-xl font-black uppercase text-xs px-8">{saving ? 'Saving...' : (editingProduct ? 'Save Changes' : 'Create Product')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="bg-white border border-gray-200 rounded-3xl max-w-sm p-8 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight text-gray-800">Delete Product?</DialogTitle>
          </DialogHeader>
          <p className="text-gray-500 text-sm py-4">This will permanently delete <strong className="text-gray-800">{deleteProduct?.name}</strong>.</p>
          <DialogFooter className="gap-3">
            <Button variant="outline" onClick={() => setDeleteOpen(false)} className="border-gray-200 text-gray-600 rounded-xl">Cancel</Button>
            <Button onClick={handleDelete} disabled={deleting} className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black uppercase text-xs px-8">{deleting ? 'Deleting...' : 'Delete'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
