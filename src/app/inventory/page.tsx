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
      <div className="min-h-screen bg-white px-6 py-6 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between border-b border-dash-border pb-4">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="!text-dash-textMuted hover:!text-dash-text text-[12px] font-semibold transition-colors motion-reduce:transition-none">
              ← Dashboard
            </Link>
            <h1 className="text-[20px] font-bold !text-dash-text">
              Inventory management
            </h1>
          </div>
          <button
            onClick={openAddModal}
            className="h-9 px-4 rounded-lg bg-dash-accent text-white hover:bg-dash-accent/90 text-[12px] font-bold flex items-center gap-1.5 transition-colors motion-reduce:transition-none shadow-lg shadow-dash-accent/10"
          >
            <Plus size={14} /> Add item
          </button>
        </div>

        {/* Low Stock Alert Section */}
        {lowStockItems.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3">
            <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={18} />
            <div>
              <h4 className="text-[12.5px] font-bold !text-dash-text">Low stock warning</h4>
              <p className="text-[11.5px] !text-dash-textMuted mt-0.5 leading-relaxed">
                The following items are running low and require reordering: {lowStockItems.map(i => `${i.name} (${i.quantity_in_stock} remaining)`).join(', ')}.
              </p>
            </div>
          </div>
        )}

        {/* Summary Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-dash-border rounded-2xl p-5 flex items-center justify-between shadow-sm">
            <div>
              <span className="text-[11.5px] font-medium !text-dash-textMuted block mb-1">Total SKU items</span>
              <span className="text-[20px] font-bold !text-dash-text">{totalItems} items</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-dash-accent/10 flex items-center justify-center">
              <Layers size={18} className="text-dash-accent" />
            </div>
          </div>
          <div className="bg-white border border-dash-border rounded-2xl p-5 flex items-center justify-between shadow-sm">
            <div>
              <span className="text-[11.5px] font-medium !text-dash-textMuted block mb-1">Low stock alerts</span>
              <span className="text-[20px] font-bold text-amber-600">{lowStockItems.length} warnings</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <AlertTriangle size={18} className="text-amber-600" />
            </div>
          </div>
          <div className="bg-white border border-dash-border rounded-2xl p-5 flex items-center justify-between shadow-sm">
            <div>
              <span className="text-[11.5px] font-medium !text-dash-textMuted block mb-1">Total inventory asset value</span>
              <span className="text-[20px] font-bold text-green">R{totalStockValue.toLocaleString()}</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
              <DollarSign size={18} className="text-green" />
            </div>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="bg-white border border-dash-border rounded-2xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between shadow-sm">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 !text-dash-textMuted" size={16} />
            <input
              type="text"
              placeholder="Search by product name or SKU..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-white border border-dash-border rounded-xl pl-10 pr-4 py-2 text-[12px] !text-dash-text focus:outline-none focus:border-dash-accent"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-[11px] !text-dash-textMuted font-bold shrink-0">Category:</span>
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="w-full sm:w-auto bg-white border border-dash-border rounded-xl px-3 py-2 text-[12px] !text-dash-text focus:outline-none focus:border-dash-accent"
            >
              <option value="all">All categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Items Grid */}
        {loading ? (
          <div className="text-center py-20 !text-dash-textMuted animate-pulse motion-reduce:animate-none">Loading inventory assets...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 bg-dash-surface border border-dash-border rounded-2xl p-8">
            <p className="text-[13px] !text-dash-textMuted">No inventory items found. Add items to track stock metrics.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {items.map(item => {
              const profitMargin = item.selling_price > 0
                ? Math.round(((item.selling_price - item.cost_price) / item.selling_price) * 100)
                : 0

              let stockColor = 'text-green' // good
              let stockLabel = 'In stock'
              if (item.quantity_in_stock === 0) {
                stockColor = 'text-red'
                stockLabel = 'Out of stock'
              } else if (item.quantity_in_stock <= item.reorder_level) {
                stockColor = 'text-amber-600'
                stockLabel = 'Low stock'
              }

              return (
                <div key={item.id} className="bg-white border border-dash-border rounded-2xl p-5 flex flex-col justify-between gap-4 shadow-sm">
                  <div>
                    <div className="flex justify-between items-start gap-3">
                      <div>
                        <h3 className="text-[13.5px] font-bold !text-dash-text">{item.name}</h3>
                        <p className="text-[11.5px] !text-dash-textMuted mt-0.5 font-medium">SKU: {item.sku || 'N/A'} • Cat: {item.category || 'General'}</p>
                      </div>
                      <span className={`text-[10.5px] font-bold ${stockColor}`}>
                        {stockLabel}
                      </span>
                    </div>

                    {item.description && (
                      <p className="text-[12px] !text-dash-textMuted mt-2 italic">"{item.description}"</p>
                    )}

                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <div className="bg-dash-surface border border-dash-border rounded-xl p-2.5 text-center">
                        <span className="!text-dash-textMuted text-[9.5px] font-bold block">Stock qty</span>
                        <span className="!text-dash-text text-[13.5px] font-bold block mt-0.5">
                          {item.quantity_in_stock} <span className="text-[11px] !text-dash-textMuted font-normal capitalize">{item.unit}s</span>
                        </span>
                        <span className="!text-dash-textMuted text-[9.5px] block mt-0.5">Reorder at: {item.reorder_level}</span>
                      </div>
                      <div className="bg-dash-surface border border-dash-border rounded-xl p-2.5 text-center">
                        <span className="!text-dash-textMuted text-[9.5px] font-bold block">Margin</span>
                        <span className="text-green text-[13.5px] font-bold block mt-0.5">{profitMargin}%</span>
                        <span className="!text-dash-textMuted text-[9.5px] block mt-0.5">Cost: R{Number(item.cost_price).toLocaleString()} • Retail: R{Number(item.selling_price).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-dash-border pt-3 mt-1">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => { setAdjustModalOpen(item); setAdjustType('add'); setAdjustQty(1); }}
                        className="h-8 px-2.5 rounded-lg bg-green/10 border border-green/20 text-green hover:bg-green/20 text-[11px] font-bold flex items-center gap-1 transition-colors motion-reduce:transition-none"
                      >
                        <Plus size={11} /> Stock
                      </button>
                      <button
                        onClick={() => { setAdjustModalOpen(item); setAdjustType('remove'); setAdjustQty(1); }}
                        className="h-8 px-2.5 rounded-lg bg-red/10 border border-red/20 text-red hover:bg-red/20 text-[11px] font-bold flex items-center gap-1 transition-colors motion-reduce:transition-none"
                      >
                        <Minus size={11} /> Stock
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(item)}
                        className="w-8 h-8 rounded-lg bg-dash-surface border border-dash-border !text-dash-textMuted hover:!text-dash-text flex items-center justify-center transition-colors motion-reduce:transition-none"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="w-8 h-8 rounded-lg bg-red/10 border border-red/20 text-red hover:bg-red/20 flex items-center justify-center transition-colors motion-reduce:transition-none"
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
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <div className="bg-white border border-dash-border rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-5 border-b border-dash-border bg-dash-surface">
                <h3 className="text-[15px] font-bold !text-dash-text">
                  {editingItem ? 'Edit inventory item' : 'Add new inventory item'}
                </h3>
                <button onClick={() => setItemModalOpen(false)} className="!text-dash-textMuted hover:!text-dash-text transition-colors motion-reduce:transition-none">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSaveItem} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto common-scrollbar">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-[10px] !text-dash-textMuted font-bold block mb-1">Item name</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full bg-white border border-dash-border rounded-xl px-4 py-2 text-[12px] !text-dash-text focus:outline-none focus:border-dash-accent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] !text-dash-textMuted font-bold block mb-1">SKU</label>
                    <input
                      type="text"
                      value={sku}
                      onChange={e => setSku(e.target.value)}
                      className="w-full bg-white border border-dash-border rounded-xl px-4 py-2 text-[12px] !text-dash-text focus:outline-none focus:border-dash-accent"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] !text-dash-textMuted font-bold block mb-1">Category</label>
                    <input
                      type="text"
                      placeholder="e.g. Hardware, Services"
                      value={category}
                      onChange={e => setCategory(e.target.value)}
                      className="w-full bg-white border border-dash-border rounded-xl px-4 py-2 text-[12px] !text-dash-text focus:outline-none focus:border-dash-accent placeholder:!text-dash-textMuted"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-[10px] !text-dash-textMuted font-bold block mb-1">Unit type</label>
                    <select
                      value={unit}
                      onChange={e => setUnit(e.target.value)}
                      className="w-full bg-white border border-dash-border rounded-xl px-3 py-2 text-[12px] !text-dash-text focus:outline-none focus:border-dash-accent"
                    >
                      <option value="unit">Unit</option>
                      <option value="kg">Kilogram (kg)</option>
                      <option value="litre">Litre (l)</option>
                      <option value="box">Box</option>
                      <option value="pack">Pack</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] !text-dash-textMuted font-bold block mb-1">Initial qty</label>
                    <input
                      type="number"
                      min={0}
                      required
                      value={quantity}
                      onChange={e => setQuantity(Number(e.target.value))}
                      className="w-full bg-white border border-dash-border rounded-xl px-4 py-2 text-[12px] !text-dash-text focus:outline-none focus:border-dash-accent"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] !text-dash-textMuted font-bold block mb-1">Reorder level</label>
                    <input
                      type="number"
                      min={0}
                      required
                      value={reorderLevel}
                      onChange={e => setReorderLevel(Number(e.target.value))}
                      className="w-full bg-white border border-dash-border rounded-xl px-4 py-2 text-[12px] !text-dash-text focus:outline-none focus:border-dash-accent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] !text-dash-textMuted font-bold block mb-1">Cost price (ZAR)</label>
                    <input
                      type="number"
                      step={0.01}
                      min={0}
                      required
                      value={costPrice}
                      onChange={e => setCostPrice(Number(e.target.value))}
                      className="w-full bg-white border border-dash-border rounded-xl px-4 py-2 text-[12px] !text-dash-text focus:outline-none focus:border-dash-accent"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] !text-dash-textMuted font-bold block mb-1">Selling price (ZAR)</label>
                    <input
                      type="number"
                      step={0.01}
                      min={0}
                      required
                      value={sellingPrice}
                      onChange={e => setSellingPrice(Number(e.target.value))}
                      className="w-full bg-white border border-dash-border rounded-xl px-4 py-2 text-[12px] !text-dash-text focus:outline-none focus:border-dash-accent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] !text-dash-textMuted font-bold block mb-1">Supplier</label>
                    <input
                      type="text"
                      value={supplier}
                      onChange={e => setSupplier(e.target.value)}
                      className="w-full bg-white border border-dash-border rounded-xl px-4 py-2 text-[12px] !text-dash-text focus:outline-none focus:border-dash-accent"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] !text-dash-textMuted font-bold block mb-1">Status</label>
                    <select
                      value={status}
                      onChange={e => setStatus(e.target.value as any)}
                      className="w-full bg-white border border-dash-border rounded-xl px-3 py-2 text-[12px] !text-dash-text focus:outline-none focus:border-dash-accent"
                    >
                      <option value="active">Active</option>
                      <option value="discontinued">Discontinued</option>
                      <option value="out_of_stock">Out of stock</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] !text-dash-textMuted font-bold block mb-1">Description / notes</label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="w-full bg-white border border-dash-border rounded-xl px-4 py-2 text-[12px] !text-dash-text focus:outline-none focus:border-dash-accent resize-none"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-3 border-t border-dash-border">
                  <button
                    type="button"
                    onClick={() => setItemModalOpen(false)}
                    className="px-4 py-2 border border-dash-border hover:bg-dash-surface text-[11px] font-bold rounded-xl !text-dash-textMuted hover:!text-dash-text transition-colors motion-reduce:transition-none"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-dash-accent hover:bg-dash-accent/90 text-[11px] font-bold rounded-xl text-white transition-colors motion-reduce:transition-none"
                  >
                    {editingItem ? 'Save item' : 'Add item'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Quick Stock Adjustment Modal */}
        {adjustModalOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <div className="bg-white border border-dash-border rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-5 border-b border-dash-border bg-dash-surface">
                <h3 className="text-[14px] font-bold !text-dash-text">
                  {adjustType === 'add' ? 'Increase stock' : 'Decrease stock'}
                </h3>
                <button onClick={() => setAdjustModalOpen(null)} className="!text-dash-textMuted hover:!text-dash-text transition-colors motion-reduce:transition-none">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleAdjustStock} className="p-5 space-y-4">
                <div className="text-[12.5px] !text-dash-textMuted">
                  Item: <strong className="!text-dash-text">{adjustModalOpen.name}</strong><br />
                  Current quantity: <strong className="!text-dash-text">{adjustModalOpen.quantity_in_stock} {adjustModalOpen.unit}s</strong>
                </div>

                <div>
                  <label className="text-[10px] !text-dash-textMuted font-bold block mb-1">
                    Quantity to {adjustType === 'add' ? 'add' : 'remove'}
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={adjustQty}
                    onChange={e => setAdjustQty(Number(e.target.value))}
                    className="w-full bg-white border border-dash-border rounded-xl px-4 py-2 text-[12px] !text-dash-text focus:outline-none focus:border-dash-accent"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-3 border-t border-dash-border">
                  <button
                    type="button"
                    onClick={() => setAdjustModalOpen(null)}
                    className="px-4 py-2 border border-dash-border hover:bg-dash-surface text-[11px] font-bold rounded-xl !text-dash-textMuted transition-colors motion-reduce:transition-none"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`px-5 py-2 text-[11px] font-bold rounded-xl text-white transition-colors motion-reduce:transition-none ${
                      adjustType === 'add' ? 'bg-green hover:bg-green/90' : 'bg-red hover:bg-red/90'
                    }`}
                  >
                    Confirm adjust
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
