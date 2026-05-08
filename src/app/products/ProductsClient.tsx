'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Package, CreditCard, ShoppingBag, ArrowRight, Layers } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function ProductsClient({ initialProducts }: { initialProducts: any[] }) {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter text-white italic leading-none">Neural <span className="text-primary">Commerce</span></h1>
          <p className="text-white/40 text-sm font-medium mt-2 italic">Manage your digital and physical assets with high-frequency precision.</p>
        </div>
        <Button className="bg-primary hover:bg-primary-dark text-white font-black uppercase italic tracking-widest text-[10px] h-12 px-8 rounded-xl shadow-lg shadow-primary/20">
          <Plus className="w-4 h-4 mr-2" /> Add Product
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xxl:grid-cols-3 gap-6">
        {initialProducts.length === 0 ? (
          <div className="col-span-full py-20 bg-white/5 border-2 border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center text-center group cursor-pointer hover:bg-primary/5 hover:border-primary/30 transition-all">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform border border-white/10">
              <Package className="w-8 h-8 text-white/20" />
            </div>
            <h3 className="text-lg font-black uppercase text-white/40 tracking-widest">No Active Products</h3>
            <p className="text-white/20 text-[10px] font-bold mt-2 uppercase tracking-widest">Initialize your first commerce node</p>
          </div>
        ) : (
          initialProducts.map(product => (
            <div key={product.id} className="bg-[#0b0b1a] border border-white/10 rounded-3xl p-6 group hover:border-primary/50 transition-all duration-500 shadow-xl shadow-black/40">
              <div className="flex justify-between items-start mb-6">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 group-hover:bg-primary group-hover:text-white transition-all duration-500">
                  <ShoppingBag size={20} />
                </div>
                <Badge className="text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border-none bg-white/10 text-white/60">
                  {product.type}
                </Badge>
              </div>

              <div className="mb-8">
                <h4 className="text-xl font-black text-white uppercase italic tracking-tighter mb-1 group-hover:text-primary transition-colors">{product.name}</h4>
                <p className="text-white/30 text-[10px] font-bold tracking-widest uppercase flex items-center gap-2">
                  <CreditCard className="w-3 h-3 text-primary" />
                  {product.is_recurring ? 'Subscription Model' : 'One-time Transaction'}
                </p>
              </div>

              <div className="flex items-center justify-between pt-6 border-t border-white/5">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-white italic text-xl">${Number(product.price).toLocaleString()}</span>
                  <span className="text-[8px] font-black text-white/20 uppercase tracking-widest italic">{product.currency || 'USD'} per unit</span>
                </div>
                <Button className="h-10 px-5 bg-white/5 border border-white/10 text-white rounded-xl font-black uppercase italic text-[9px] tracking-widest hover:bg-primary transition-all flex items-center gap-2">
                  Product Config <Layers size={12} />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
