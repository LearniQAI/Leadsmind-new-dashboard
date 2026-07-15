'use client';

import React, { useState, useEffect } from 'react';
import { Copy, Code, Check, Save, ArrowLeft, Plus, Trash2, Mail, MessageSquare, ToggleLeft, ToggleRight, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function SupportWidgetSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [workspaceId, setWorkspaceId] = useState('');
  const [widgetKey, setWidgetKey] = useState('');
  
  // Settings States
  const [welcomeMessage, setWelcomeMessage] = useState('How can we help you today?');
  const [brandColor, setBrandColor] = useState('#2563eb');
  const [logoUrl, setLogoUrl] = useState('');
  const [departments, setDepartments] = useState<{ id: string; name: string; email: string }[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string; description: string }[]>([]);
  const [notificationPreferences, setNotificationPreferences] = useState({ email: true, in_app: true });

  // Input states for adding departments/categories
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptEmail, setNewDeptEmail] = useState('');
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');

  // Fetch Settings on mount
  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/support/widget-settings');
        const data = await res.json();
        if (data.settings) {
          const s = data.settings;
          setWorkspaceId(s.workspace_id);
          setWidgetKey(s.widget_key);
          setWelcomeMessage(s.welcome_message || 'How can we help you today?');
          setBrandColor(s.brand_color || '#2563eb');
          setLogoUrl(s.logo_url || '');
          setDepartments(s.departments || []);
          setCategories(s.categories || []);
          setNotificationPreferences(s.notification_preferences || { email: true, in_app: true });
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
        toast.error('Failed to load support widget configurations.');
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/support/widget-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          welcome_message: welcomeMessage,
          brand_color: brandColor,
          logo_url: logoUrl,
          departments,
          categories,
          notification_preferences: notificationPreferences
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Support widget settings saved successfully!');
      } else {
        toast.error(data.error || 'Failed to save settings');
      }
    } catch (err) {
      toast.error('An error occurred while saving widget settings.');
    } finally {
      setSaving(false);
    }
  };

  const addDepartment = () => {
    if (!newDeptName.trim()) {
      toast.error('Department name is required');
      return;
    }
    const id = newDeptName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    if (departments.some(d => d.id === id)) {
      toast.error('Department already exists');
      return;
    }
    setDepartments([...departments, { id, name: newDeptName, email: newDeptEmail }]);
    setNewDeptName('');
    setNewDeptEmail('');
    toast.success('Department route added');
  };

  const removeDepartment = (id: string) => {
    setDepartments(departments.filter(d => d.id !== id));
  };

  const addCategory = () => {
    if (!newCatName.trim()) {
      toast.error('Category name is required');
      return;
    }
    const id = newCatName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    if (categories.some(c => c.id === id)) {
      toast.error('Category already exists');
      return;
    }
    setCategories([...categories, { id, name: newCatName, description: newCatDesc }]);
    setNewCatName('');
    setNewCatDesc('');
    toast.success('Inquiry category added');
  };

  const removeCategory = (id: string) => {
    setCategories(categories.filter(c => c.id !== id));
  };

  const embedCode = `<script 
  src="https://leadsmind.io/widget.js" 
  data-key="${widgetKey || 'YOUR_WIDGET_KEY'}" 
  data-color="${brandColor}"
></script>`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    toast.success('Widget embed code copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-dash-accent border-t-transparent rounded-full animate-spin motion-reduce:animate-none mx-auto mb-4"></div>
          <p className="!text-dash-textMuted text-xs font-bold">Configuring node...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white !text-dash-text pb-16">
      <div className="max-w-5xl mx-auto px-6 py-10">

        {/* Top bar */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/support" className="flex items-center gap-2 !text-dash-textMuted hover:!text-dash-text transition-colors motion-reduce:transition-none text-xs font-bold">
            <ArrowLeft className="w-4 h-4" /> Back to support hub
          </Link>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-dash-accent hover:bg-dash-accent/90 text-white px-5 py-2.5 rounded-xl font-bold text-[11px] transition-all motion-reduce:transition-none disabled:opacity-50 cursor-pointer shadow-lg shadow-dash-accent/25"
          >
            <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save settings'}
          </button>
        </div>

        {/* Title */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold tracking-tight">Support widget <span className="text-dash-accent">settings</span></h1>
            <span className="bg-dash-accent/10 border border-dash-accent/20 text-dash-accent text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Live
            </span>
          </div>
          <p className="!text-dash-textMuted text-sm">Configure, customize, and generate embed scripts for your live website support widget.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Settings Panels */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* 1. Widget Identity & Keys */}
            <div className="bg-white border border-dash-border rounded-2xl p-6 shadow-sm">
              <h2 className="text-md font-bold mb-4 !text-dash-text">1. Widget keys & status</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold !text-dash-textMuted mb-2">Workspace ID</label>
                  <input
                    type="text"
                    disabled
                    value={workspaceId}
                    className="w-full bg-dash-surface border border-dash-border rounded-xl px-4 py-2.5 text-xs !text-dash-textMuted font-mono cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold !text-dash-textMuted mb-2">Widget token</label>
                  <input
                    type="text"
                    disabled
                    value={widgetKey}
                    className="w-full bg-dash-surface border border-dash-border rounded-xl px-4 py-2.5 text-xs text-dash-accent font-mono cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {/* 2. Visual & Custom Branding */}
            <div className="bg-white border border-dash-border rounded-2xl p-6 shadow-sm">
              <h2 className="text-md font-bold mb-4 !text-dash-text">2. Design & welcome screen</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold !text-dash-textMuted mb-2">Welcome message</label>
                  <input
                    type="text"
                    value={welcomeMessage}
                    onChange={(e) => setWelcomeMessage(e.target.value)}
                    placeholder="E.g., How can we help you today?"
                    className="w-full bg-white border border-dash-border rounded-xl px-4 py-2.5 text-sm !text-dash-text focus:border-dash-accent/50 outline-none"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold !text-dash-textMuted mb-2">Brand accent color</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={brandColor}
                        onChange={(e) => setBrandColor(e.target.value)}
                        className="w-10 h-10 rounded-xl bg-transparent border-0 cursor-pointer p-0"
                      />
                      <input
                        type="text"
                        value={brandColor}
                        onChange={(e) => setBrandColor(e.target.value)}
                        className="flex-1 bg-white border border-dash-border rounded-xl px-4 py-2 text-sm !text-dash-text focus:border-dash-accent/50 outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold !text-dash-textMuted mb-2">Logo URL (optional)</label>
                    <input
                      type="text"
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      placeholder="Https://example.com/logo.png"
                      className="w-full bg-white border border-dash-border rounded-xl px-4 py-2.5 text-sm !text-dash-text focus:border-dash-accent/50 outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Department Routing */}
            <div className="bg-white border border-dash-border rounded-2xl p-6 shadow-sm">
              <h2 className="text-md font-bold mb-2 !text-dash-text">3. Department routing</h2>
              <p className="text-xs !text-dash-textMuted mb-4">Route customer inquiries directly to specific support departments.</p>

              <div className="space-y-4">
                {/* List */}
                <div className="space-y-2">
                  {departments.map((d) => (
                    <div key={d.id} className="flex items-center justify-between p-3 bg-dash-surface border border-dash-border rounded-xl">
                      <div>
                        <h4 className="text-xs font-bold !text-dash-text">{d.name}</h4>
                        {d.email && <p className="text-[10px] !text-dash-textMuted font-mono">{d.email}</p>}
                      </div>
                      <button
                        onClick={() => removeDepartment(d.id)}
                        className="p-1.5 hover:bg-red/10 rounded-lg !text-dash-textMuted hover:text-red transition-all motion-reduce:transition-none cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {departments.length === 0 && (
                    <p className="text-xs !text-dash-textMuted italic text-center py-4">No custom department routes configured.</p>
                  )}
                </div>

                {/* Add Form */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 bg-dash-surface p-3 border border-dash-border rounded-xl">
                  <input
                    type="text"
                    placeholder="Dept name (e.g. Technical Support)"
                    value={newDeptName}
                    onChange={(e) => setNewDeptName(e.target.value)}
                    className="bg-white border border-dash-border rounded-lg px-3 py-1.5 text-xs !text-dash-text focus:border-dash-accent/50 outline-none"
                  />
                  <input
                    type="email"
                    placeholder="Route email (optional)"
                    value={newDeptEmail}
                    onChange={(e) => setNewDeptEmail(e.target.value)}
                    className="bg-white border border-dash-border rounded-lg px-3 py-1.5 text-xs !text-dash-text focus:border-dash-accent/50 outline-none"
                  />
                  <button
                    type="button"
                    onClick={addDepartment}
                    className="md:col-span-2 flex items-center justify-center gap-1.5 bg-dash-surface hover:bg-dash-border/60 !text-dash-text font-bold text-[10px] py-2 rounded-lg transition-all motion-reduce:transition-none cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add department route
                  </button>
                </div>
              </div>
            </div>

            {/* 4. Category Routing */}
            <div className="bg-white border border-dash-border rounded-2xl p-6 shadow-sm">
              <h2 className="text-md font-bold mb-2 !text-dash-text">4. Inquiry categories</h2>
              <p className="text-xs !text-dash-textMuted mb-4">Let customers categorize their requests to optimize priority sorting.</p>

              <div className="space-y-4">
                {/* List */}
                <div className="space-y-2">
                  {categories.map((c) => (
                    <div key={c.id} className="flex items-center justify-between p-3 bg-dash-surface border border-dash-border rounded-xl">
                      <div>
                        <h4 className="text-xs font-bold !text-dash-text">{c.name}</h4>
                        {c.description && <p className="text-[10px] !text-dash-textMuted">{c.description}</p>}
                      </div>
                      <button
                        onClick={() => removeCategory(c.id)}
                        className="p-1.5 hover:bg-red/10 rounded-lg !text-dash-textMuted hover:text-red transition-all motion-reduce:transition-none cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {categories.length === 0 && (
                    <p className="text-xs !text-dash-textMuted italic text-center py-4">No categories configured.</p>
                  )}
                </div>

                {/* Add Form */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 bg-dash-surface p-3 border border-dash-border rounded-xl">
                  <input
                    type="text"
                    placeholder="Category name (e.g. Bug Report)"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="bg-white border border-dash-border rounded-lg px-3 py-1.5 text-xs !text-dash-text focus:border-dash-accent/50 outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Short description"
                    value={newCatDesc}
                    onChange={(e) => setNewCatDesc(e.target.value)}
                    className="bg-white border border-dash-border rounded-lg px-3 py-1.5 text-xs !text-dash-text focus:border-dash-accent/50 outline-none"
                  />
                  <button
                    type="button"
                    onClick={addCategory}
                    className="md:col-span-2 flex items-center justify-center gap-1.5 bg-dash-surface hover:bg-dash-border/60 !text-dash-text font-bold text-[10px] py-2 rounded-lg transition-all motion-reduce:transition-none cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add inquiry category
                  </button>
                </div>
              </div>
            </div>

            {/* 5. Notification Preferences */}
            <div className="bg-white border border-dash-border rounded-2xl p-6 shadow-sm">
              <h2 className="text-md font-bold mb-4 !text-dash-text">5. Alert & notification routing</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-dash-accent" />
                    <div>
                      <h4 className="text-xs font-bold !text-dash-text">Email dispatch</h4>
                      <p className="text-[10px] !text-dash-textMuted mt-0.5">Send alerts for new tickets via support@leadsmind.io.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setNotificationPreferences({ ...notificationPreferences, email: !notificationPreferences.email })}
                    className="!text-dash-textMuted hover:!text-dash-text transition-colors motion-reduce:transition-none cursor-pointer"
                  >
                    {notificationPreferences.email ? <ToggleRight className="w-8 h-8 text-green" /> : <ToggleLeft className="w-8 h-8 !text-dash-textMuted" />}
                  </button>
                </div>

                <div className="flex items-center justify-between border-t border-dash-border pt-4">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-5 h-5 text-dash-accent" />
                    <div>
                      <h4 className="text-xs font-bold !text-dash-text">Dashboard in-app feed</h4>
                      <p className="text-[10px] !text-dash-textMuted mt-0.5">Publish new tickets instantly inside the agent dashboard notification center.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setNotificationPreferences({ ...notificationPreferences, in_app: !notificationPreferences.in_app })}
                    className="!text-dash-textMuted hover:!text-dash-text transition-colors motion-reduce:transition-none cursor-pointer"
                  >
                    {notificationPreferences.in_app ? <ToggleRight className="w-8 h-8 text-green" /> : <ToggleLeft className="w-8 h-8 !text-dash-textMuted" />}
                  </button>
                </div>
              </div>
            </div>

          </div>

          {/* Embed Code side preview */}
          <div className="space-y-6">
            <div className="bg-white border border-dash-border rounded-2xl p-6 sticky top-6 shadow-sm">
              <h2 className="text-md font-bold mb-2 !text-dash-text flex items-center gap-2">
                <Code className="w-5 h-5 text-dash-accent" /> Embed script
              </h2>
              <p className="text-xs !text-dash-textMuted mb-4">Paste this asynchronous script directly inside the header or footer tag of your website.</p>

              <div className="relative group mb-6">
                <pre className="bg-dash-surface p-4 rounded-xl border border-dash-border !text-dash-text text-[10px] font-mono overflow-x-auto whitespace-pre-wrap break-all leading-normal">
                  <code>{embedCode}</code>
                </pre>
                <button
                  onClick={copyToClipboard}
                  className="absolute top-3.5 right-3.5 p-2 bg-dash-border/60 hover:bg-dash-border rounded-lg !text-dash-text transition-all motion-reduce:transition-none cursor-pointer"
                  title="Copy embed code"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-green" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Mock Widget Visualizer Preview */}
              <div className="border border-dash-border rounded-2xl overflow-hidden bg-dash-surface">
                <div className="px-4 py-3 bg-white border-b border-dash-border flex items-center justify-between">
                  <span className="text-[10px] font-bold !text-dash-textMuted">Live widget mockup</span>
                  <div className="w-2.5 h-2.5 bg-green rounded-full animate-ping motion-reduce:animate-none" />
                </div>
                <div className="p-6 flex flex-col items-center justify-center text-center">
                  {/* Live preview of the workspace's chosen widget brand color — not theme chrome, left dynamic */}
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center mb-4 text-white shadow-lg font-bold"
                    style={{ backgroundColor: brandColor }}
                  >
                    💬
                  </div>
                  <h4 className="text-xs font-bold !text-dash-text mb-1">{welcomeMessage}</h4>
                  <p className="text-[10px] !text-dash-textMuted mb-3">Powered by LeadsMind Support</p>

                  <div className="w-full space-y-1">
                    <div className="h-6 bg-white border border-dash-border rounded-lg text-[9px] !text-dash-textMuted flex items-center px-2">Choose inquiry category...</div>
                    <div className="h-6 bg-white border border-dash-border rounded-lg text-[9px] !text-dash-textMuted flex items-center px-2">Type message...</div>
                    <div
                      className="h-7 rounded-lg text-[9px] font-bold text-white flex items-center justify-center cursor-not-allowed shadow-md"
                      style={{ backgroundColor: brandColor }}
                    >
                      Submit ticket
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
