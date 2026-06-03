'use client'
import { useEffect, useState } from 'react'
import Wrapper from '@/components/layouts/DefaultWrapper'
import { useDashboardContext } from '@/components/layouts/DashboardProvider'
import { Plus, Minus, Edit2, Trash2, Search, X, AlertTriangle, Layers, Tag, DollarSign } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

interface InventoryItem {
  id: string
  name: string
  sku: string
  description: string
  category: string
  unit: string
  quantity_in_stock: number
  reorder_level: number
  cost_price: number
  selling_price: number
  supplier: string
  status: 'active' | 'discontinued' | 'out_of_stock'
}

export default function InventoryPage() {
  const { workspace } = useDashboardContext() as any
  const workspaceId = workspace?.id

  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')

  // Modals
  const [itemModalOpen, setItemModalOpen] = useState(false)
  const [adjustModalOpen, setAdjustModalOpen] = useState<InventoryItem | null>(null)
  const [adjustType, setAdjustType] = useState<'add' | 'remove'>('add')
  const [adjustQty, setAdjustQty] = useState(0)

  // Item Form Fields
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [name, setName] = useState('')
  const [sku, setSku] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [unit, setUnit] = useState('unit')
  const [quantity, setQuantity] = useState(0)
  const [reorderLevel, setReorderLevel] = useState(5)
  const [costPrice, setCostPrice] = useState(0)
  const [sellingPrice, setSellingPrice] = useState(0)
  const [supplier, setSupplier] = useState('')
  const [status, setStatus] = useState<InventoryItem['status']>('active')

  const fetchInventory = async () => {
    if (!workspaceId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/inventory?workspaceId=${workspaceId}&search=${search}&category=${filterCategory}`)
      const data = await res.json()
      setItems(data.inventoryItems ?? [])
    } catch {
      toast.error('Failed to load inventory')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInventory()
  }, [workspaceId, search, filterCategory])

  const openAddModal = () => {
    setEditingItem(null)
    setName('')
    setSku('')
    setDescription('')
    setCategory('')
    setUnit('unit')
    setQuantity(0)
    setReorderLevel(5)
    setCostPrice(0)
    setSellingPrice(0)
    setSupplier('')
    setStatus('active')
    setItemModalOpen(true)
  }

  const openEditModal = (item: InventoryItem) => {
    setEditingItem(item)
    setName(item.name)
    setSku(item.sku || '')
    setDescription(item.description || '')
    setCategory(item.category || '')
    setUnit(item.unit || 'unit')
    setQuantity(item.quantity_in_stock)
    setReorderLevel(item.reorder_level)
    setCostPrice(Number(item.cost_price))
    setSellingPrice(Number(item.selling_price))
    setSupplier(item.supplier || '')
    setStatus(item.status)
    setItemModalOpen(true)
  }

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!workspaceId) return

    const payload = {
      workspace_id: workspaceId,
      name,
      sku,
      description,
      category,
      unit,
      quantity_in_stock: quantity,
      reorder_level: reorderLevel,
      cost_price: costPrice,
      selling_price: sellingPrice,
      supplier,
      status
    }

    try {
      let res
      if (editingItem) {
        res = await fetch(`/api/inventory?id=${editingItem.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
      } else {
        res = await fetch('/api/inventory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
      }

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      toast.success(editingItem ? 'Item updated' : 'Item added')
      setItemModalOpen(false)
      fetchInventory()
    } catch (err: any) {
      toast.error(err.message || 'Error saving inventory item')
    }
  }

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!adjustModalOpen) return

    const currentQty = Number(adjustModalOpen.quantity_in_stock)
    const delta = Number(adjustQty)
    const newQty = adjustType === 'add' ? (currentQty + delta) : Math.max(0, currentQty - delta)

    try {
      const res = await fetch(`/api/inventory?id=${adjustModalOpen.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity_in_stock: newQty })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      toast.success('Stock adjusted successfully')
      setAdjustModalOpen(null)
      fetchInventory()
    } catch (err: any) {
      toast.error(err.message || 'Failed to adjust stock')
    }
  }

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Are you sure you want to delete this inventory item?')) return
    try {
      const res = await fetch(`/api/inventory?id=${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }
      toast.success('Item deleted')
      fetchInventory()
    } catch (err: any) {
      toast.error(err.message || 'Error deleting item')
    }
  }

  // Summary Metrics Computations
  const totalItems = items.length
  const lowStockItems = items.filter(item => item.quantity_in_stock <= item.reorder_level)
  const totalStockValue = items.reduce((sum, item) => sum + (Number(item.quantity_in_stock) * Number(item.cost_price)), 0)

  // Categories list for filtering
  const categories = Array.from(new Set(items.map(item => item.category).filter(Boolean)))

  return (
    <Wrapper>
      <div className="min-h-screen bg-[#04091a] px-6 py-6 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-[#4a5a82] hover:text-[#eef2ff] text-[12px] font-semibold">
              ← Dashboard
            </Link>
            <h1 className="text-[20px] font-bold text-[#eef2ff]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Inventory Management
            </h1>
          </div>
          <button
            onClick={openAddModal}
            className="h-9 px-4 rounded-[8px] bg-[#2563eb] text-white hover:bg-[#2563eb]/95 text-[12px] font-bold font-dm-sans flex items-center gap-1.5 transition-all shadow-lg shadow-[#2563eb]/10"
          >
            <Plus size={14} /> Add Item
          </button>
        </div>

        {/* Low Stock Alert Section */}
        {lowStockItems.length > 0 && (
          <div className="bg-[rgba(245,158,11,0.06)] border border-[rgba(245,158,11,0.15)] rounded-2xl p-4 flex gap-3">
            <AlertTriangle className="text-[#f59e0b] shrink-0 mt-0.5" size={18} />
            <div>
              <h4 className="text-[12.5px] font-bold text-[#eef2ff] font-space-grotesk">Low Stock Warning</h4>
              <p className="text-[11.5px] text-[#94a3c8] mt-0.5 leading-relaxed font-dm-sans">
                The following items are running low and require reordering: {lowStockItems.map(i => `${i.name} (${i.quantity_in_stock} remaining)`).join(', ')}.
              </p>
            </div>
          </div>
        )}

        {/* Summary Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[rgba(12,21,53,0.85)] border border-[rgba(255,255,255,0.07)] rounded-2xl p-5 flex items-center justify-between">
            <div>
              <span className="text-[11.5px] font-medium text-[#4a5a82] uppercase tracking-[0.8px] block mb-1">Total SKU Items</span>
              <span className="text-[20px] font-bold text-[#eef2ff] font-space-grotesk">{totalItems} Items</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Layers size={18} className="text-[#3b82f6]" />
            </div>
          </div>
          <div className="bg-[rgba(12,21,53,0.85)] border border-[rgba(255,255,255,0.07)] rounded-2xl p-5 flex items-center justify-between">
            <div>
              <span className="text-[11.5px] font-medium text-[#4a5a82] uppercase tracking-[0.8px] block mb-1">Low Stock Alerts</span>
              <span className="text-[20px] font-bold text-[#f59e0b] font-space-grotesk">{lowStockItems.length} Warnings</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <AlertTriangle size={18} className="text-[#f59e0b]" />
            </div>
          </div>
          <div className="bg-[rgba(12,21,53,0.85)] border border-[rgba(255,255,255,0.07)] rounded-2xl p-5 flex items-center justify-between">
            <div>
              <span className="text-[11.5px] font-medium text-[#4a5a82] uppercase tracking-[0.8px] block mb-1">Total Inventory Asset Value</span>
              <span className="text-[20px] font-bold text-[#10b981] font-space-grotesk">R{totalStockValue.toLocaleString()}</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
              <DollarSign size={18} className="text-[#10b981]" />
            </div>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="bg-[rgba(12,21,53,0.85)] border border-white/5 rounded-2xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#4a5a82]" size={16} />
            <input
              type="text"
              placeholder="Search by product name or SKU..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-[#070d24] border border-white/5 rounded-xl pl-10 pr-4 py-2 text-[12px] text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-[11px] text-[#4a5a82] font-bold uppercase shrink-0">Category:</span>
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="w-full sm:w-auto bg-[#070d24] border border-white/5 rounded-xl px-3 py-2 text-[12px] text-white focus:outline-none"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Items Grid */}
        {loading ? (
          <div className="text-center py-20 text-[#4a5a82] animate-pulse">Loading inventory assets...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 bg-[rgba(12,21,53,0.3)] border border-white/5 rounded-2xl p-8">
            <p className="text-[13px] text-[#4a5a82]">No inventory items found. Add items to track stock metrics.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {items.map(item => {
              const profitMargin = item.selling_price > 0 
                ? Math.round(((item.selling_price - item.cost_price) / item.selling_price) * 100)
                : 0
              
              let stockColor = 'text-[#10b981]' // good
              let stockLabel = 'In Stock'
              if (item.quantity_in_stock === 0) {
                stockColor = 'text-[#ef4444]'
                stockLabel = 'Out of Stock'
              } else if (item.quantity_in_stock <= item.reorder_level) {
                stockColor = 'text-[#f59e0b]'
                stockLabel = 'Low Stock'
              }

              return (
                <div key={item.id} className="bg-[rgba(12,21,53,0.85)] border border-[rgba(255,255,255,0.07)] rounded-2xl p-5 flex flex-col justify-between gap-4">
                  <div>
                    <div className="flex justify-between items-start gap-3">
                      <div>
                        <h3 className="text-[13.5px] font-bold text-[#eef2ff] font-space-grotesk">{item.name}</h3>
                        <p className="text-[11.5px] text-[#94a3c8] mt-0.5 font-medium">SKU: {item.sku || 'N/A'} • Cat: {item.category || 'General'}</p>
                      </div>
                      <span className={`text-[10.5px] font-bold uppercase tracking-[0.5px] ${stockColor}`}>
                        {stockLabel}
                      </span>
                    </div>

                    {item.description && (
                      <p className="text-[12px] text-[#4a5a82] mt-2 italic">"{item.description}"</p>
                    )}

                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <div className="bg-white/[0.01] border border-white/5 rounded-xl p-2.5 text-center font-dm-sans">
                        <span className="text-[#4a5a82] text-[9.5px] font-bold uppercase tracking-[0.5px] block">Stock Qty</span>
                        <span className="text-[#eef2ff] text-[13.5px] font-bold block mt-0.5">
                          {item.quantity_in_stock} <span className="text-[11px] text-[#94a3c8] font-normal font-dm-sans capitalize">{item.unit}s</span>
                        </span>
                        <span className="text-[#4a5a82] text-[9.5px] block mt-0.5">Reorder at: {item.reorder_level}</span>
                      </div>
                      <div className="bg-white/[0.01] border border-white/5 rounded-xl p-2.5 text-center font-dm-sans">
                        <span className="text-[#4a5a82] text-[9.5px] font-bold uppercase tracking-[0.5px] block">Margin</span>
                        <span className="text-[#10b981] text-[13.5px] font-bold block mt-0.5">{profitMargin}%</span>
                        <span className="text-[#4a5a82] text-[9.5px] block mt-0.5">Cost: R{Number(item.cost_price).toLocaleString()} • Retail: R{Number(item.selling_price).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-white/5 pt-3 mt-1">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => { setAdjustModalOpen(item); setAdjustType('add'); setAdjustQty(1); }}
                        className="h-8 px-2.5 rounded-lg bg-[#10b981]/10 border border-[#10b981]/20 text-[#10b981] hover:bg-[#10b981]/20 text-[11px] font-bold flex items-center gap-1 transition-all"
                      >
                        <Plus size={11} /> Stock
                      </button>
                      <button
                        onClick={() => { setAdjustModalOpen(item); setAdjustType('remove'); setAdjustQty(1); }}
                        className="h-8 px-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-[#ef4444] hover:bg-red-500/20 text-[11px] font-bold flex items-center gap-1 transition-all"
                      >
                        <Minus size={11} /> Stock
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(item)}
                        className="w-8 h-8 rounded-lg bg-white/5 border border-white/5 text-[#94a3c8] hover:text-[#eef2ff] flex items-center justify-center transition-colors"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 text-[#ef4444] hover:bg-red-500/20 flex items-center justify-center transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Item Create/Edit Modal */}
        {itemModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <div className="bg-[#0b122b] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between p-5 border-b border-white/5 bg-white/[0.01]">
                <h3 className="text-[15px] font-bold text-[#eef2ff]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  {editingItem ? 'Edit Inventory Item' : 'Add New Inventory Item'}
                </h3>
                <button onClick={() => setItemModalOpen(false)} className="text-[#4a5a82] hover:text-[#eef2ff] transition-colors">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSaveItem} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto common-scrollbar">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-[10px] text-[#4a5a82] font-bold uppercase tracking-wider block mb-1">Item Name</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full bg-[#070d24] border border-white/5 rounded-xl px-4 py-2 text-[12px] text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-[#4a5a82] font-bold uppercase tracking-wider block mb-1">SKU</label>
                    <input
                      type="text"
                      value={sku}
                      onChange={e => setSku(e.target.value)}
                      className="w-full bg-[#070d24] border border-white/5 rounded-xl px-4 py-2 text-[12px] text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#4a5a82] font-bold uppercase tracking-wider block mb-1">Category</label>
                    <input
                      type="text"
                      placeholder="e.g. Hardware, Services"
                      value={category}
                      onChange={e => setCategory(e.target.value)}
                      className="w-full bg-[#070d24] border border-white/5 rounded-xl px-4 py-2 text-[12px] text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-[10px] text-[#4a5a82] font-bold uppercase tracking-wider block mb-1">Unit Type</label>
                    <select
                      value={unit}
                      onChange={e => setUnit(e.target.value)}
                      className="w-full bg-[#070d24] border border-white/5 rounded-xl px-3 py-2 text-[12px] text-white focus:outline-none"
                    >
                      <option value="unit">Unit</option>
                      <option value="kg">Kilogram (kg)</option>
                      <option value="litre">Litre (l)</option>
                      <option value="box">Box</option>
                      <option value="pack">Pack</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-[#4a5a82] font-bold uppercase tracking-wider block mb-1">Initial Qty</label>
                    <input
                      type="number"
                      min={0}
                      required
                      value={quantity}
                      onChange={e => setQuantity(Number(e.target.value))}
                      className="w-full bg-[#070d24] border border-white/5 rounded-xl px-4 py-2 text-[12px] text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#4a5a82] font-bold uppercase tracking-wider block mb-1">Reorder level</label>
                    <input
                      type="number"
                      min={0}
                      required
                      value={reorderLevel}
                      onChange={e => setReorderLevel(Number(e.target.value))}
                      className="w-full bg-[#070d24] border border-white/5 rounded-xl px-4 py-2 text-[12px] text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-[#4a5a82] font-bold uppercase tracking-wider block mb-1">Cost Price (ZAR)</label>
                    <input
                      type="number"
                      step={0.01}
                      min={0}
                      required
                      value={costPrice}
                      onChange={e => setCostPrice(Number(e.target.value))}
                      className="w-full bg-[#070d24] border border-white/5 rounded-xl px-4 py-2 text-[12px] text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#4a5a82] font-bold uppercase tracking-wider block mb-1">Selling Price (ZAR)</label>
                    <input
                      type="number"
                      step={0.01}
                      min={0}
                      required
                      value={sellingPrice}
                      onChange={e => setSellingPrice(Number(e.target.value))}
                      className="w-full bg-[#070d24] border border-white/5 rounded-xl px-4 py-2 text-[12px] text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-[#4a5a82] font-bold uppercase tracking-wider block mb-1">Supplier</label>
                    <input
                      type="text"
                      value={supplier}
                      onChange={e => setSupplier(e.target.value)}
                      className="w-full bg-[#070d24] border border-white/5 rounded-xl px-4 py-2 text-[12px] text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#4a5a82] font-bold uppercase tracking-wider block mb-1">Status</label>
                    <select
                      value={status}
                      onChange={e => setStatus(e.target.value as any)}
                      className="w-full bg-[#070d24] border border-white/5 rounded-xl px-3 py-2 text-[12px] text-white focus:outline-none"
                    >
                      <option value="active">Active</option>
                      <option value="discontinued">Discontinued</option>
                      <option value="out_of_stock">Out of Stock</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-[#4a5a82] font-bold uppercase tracking-wider block mb-1">Description / Notes</label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="w-full bg-[#070d24] border border-white/5 rounded-xl px-4 py-2 text-[12px] text-white focus:outline-none resize-none"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-3 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setItemModalOpen(false)}
                    className="px-4 py-2 border border-white/5 hover:bg-white/5 text-[11px] font-bold rounded-xl text-t3 hover:text-t1 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-[11px] font-bold rounded-xl text-white transition-colors"
                  >
                    {editingItem ? 'Save Item' : 'Add Item'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Quick Stock Adjustment Modal */}
        {adjustModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <div className="bg-[#0b122b] border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between p-5 border-b border-white/5 bg-white/[0.01]">
                <h3 className="text-[14px] font-bold text-[#eef2ff]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  {adjustType === 'add' ? 'Increase Stock' : 'Decrease Stock'}
                </h3>
                <button onClick={() => setAdjustModalOpen(null)} className="text-[#4a5a82] hover:text-[#eef2ff] transition-colors">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleAdjustStock} className="p-5 space-y-4">
                <div className="text-[12.5px] text-[#94a3c8] font-dm-sans">
                  Item: <strong className="text-white">{adjustModalOpen.name}</strong><br />
                  Current Quantity: <strong className="text-white">{adjustModalOpen.quantity_in_stock} {adjustModalOpen.unit}s</strong>
                </div>

                <div>
                  <label className="text-[10px] text-[#4a5a82] font-bold uppercase tracking-wider block mb-1">
                    Quantity to {adjustType === 'add' ? 'Add' : 'Remove'}
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={adjustQty}
                    onChange={e => setAdjustQty(Number(e.target.value))}
                    className="w-full bg-[#070d24] border border-white/5 rounded-xl px-4 py-2 text-[12px] text-white focus:outline-none"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-3 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setAdjustModalOpen(null)}
                    className="px-4 py-2 border border-white/5 hover:bg-white/5 text-[11px] font-bold rounded-xl text-t3 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`px-5 py-2 text-[11px] font-bold rounded-xl text-white transition-colors ${
                      adjustType === 'add' ? 'bg-[#10b981] hover:opacity-90' : 'bg-[#ef4444] hover:opacity-90'
                    }`}
                  >
                    Confirm Adjust
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Wrapper>
  )
}
