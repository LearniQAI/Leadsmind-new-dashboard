"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { ListTree, Plus, Trash2, ChevronDown, ChevronUp, AlertTriangle, Phone, Mic, PhoneForwarded, Users, Voicemail } from 'lucide-react';
import { toast } from 'sonner';
import {
  listIvrMenus,
  getIvrMenu,
  createIvrMenu,
  updateIvrMenu,
  deleteIvrMenu,
  upsertMenuOption,
  deleteMenuOption,
  assignMenuToNumber,
  type IvrMenu,
  type IvrMenuOption,
} from '@/app/actions/ivr';
import { listWorkspacePhoneNumbers, type WorkspacePhoneNumber } from '@/app/actions/telephony';
import { DashButton } from '@/components/dashboard-ui';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

const KEYPAD = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].filter((k) => k !== '*' && k !== '#');

const DESTINATION_LABEL: Record<string, string> = {
  submenu: 'Route to submenu',
  forward: 'Forward to number',
  voicemail: 'Send to voicemail',
  ring_group: 'Ring a group',
};

function destinationIcon(type: string) {
  if (type === 'forward') return <PhoneForwarded size={12} />;
  if (type === 'ring_group') return <Users size={12} />;
  if (type === 'voicemail') return <Voicemail size={12} />;
  return <ListTree size={12} />;
}

function summarizeDestination(opt: IvrMenuOption, menus: IvrMenu[]): string {
  if (opt.destination_type === 'forward') return opt.destination_value?.number || '';
  if (opt.destination_type === 'ring_group') return `${(opt.destination_value?.numbers || []).length} numbers, ${opt.destination_value?.strategy}`;
  if (opt.destination_type === 'submenu') return menus.find((m) => m.id === opt.destination_value?.menuId)?.name || 'Unknown menu';
  return 'Caller leaves a message';
}

export default function IvrMenusSection() {
  const [menus, setMenus] = useState<IvrMenu[]>([]);
  const [loading, setLoading] = useState(true);
  const [numbers, setNumbers] = useState<WorkspacePhoneNumber[]>([]);
  const [expandedMenuId, setExpandedMenuId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newGreeting, setNewGreeting] = useState('');
  const [pendingDelete, setPendingDelete] = useState<IvrMenu | null>(null);
  const [assigning, setAssigning] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [menuRes, numberRes] = await Promise.all([listIvrMenus(), listWorkspacePhoneNumbers()]);
    if (menuRes.error) toast.error(menuRes.error);
    if (numberRes.error) toast.error(numberRes.error);
    setMenus(menuRes.data || []);
    setNumbers(numberRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newGreeting.trim()) return;
    const res = await createIvrMenu({ name: newName.trim(), greetingText: newGreeting.trim() });
    if (res.error) { toast.error(res.error); return; }
    toast.success('Menu created — add options below.');
    setNewName('');
    setNewGreeting('');
    setCreating(false);
    await refresh();
    if (res.data) setExpandedMenuId(res.data.id);
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    const res = await deleteIvrMenu(pendingDelete.id);
    setPendingDelete(null);
    if (res.error) { toast.error(res.error); return; }
    toast.success('Menu deleted.');
    refresh();
  };

  const handleAssign = async (numberId: string, menuId: string) => {
    setAssigning(numberId);
    const res = await assignMenuToNumber(numberId, menuId || null);
    setAssigning(null);
    if (res.error) { toast.error(res.error); return; }
    toast.success(menuId ? 'Menu assigned to number.' : 'Menu unassigned from number.');
    refresh();
  };

  return (
    <div className="bg-white border border-dash-border rounded-2xl p-8 space-y-6 shadow-sm">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h4 className="text-[15px] font-bold !text-dash-text">IVR menus</h4>
          <p className="text-[11px] !text-dash-textMuted mt-0.5">Build menus and assign them to your numbers to handle real inbound calls.</p>
        </div>
        <button
          onClick={() => setCreating((v) => !v)}
          className="flex items-center gap-1.5 text-[11px] font-bold text-dash-accent hover:text-dash-accent/80 transition-colors motion-reduce:transition-none"
        >
          <Plus size={13} /> New menu
        </button>
      </div>

      {creating && (
        <form onSubmit={handleCreate} className="border border-dash-border rounded-xl p-4 space-y-3">
          <div>
            <label className="block text-[11px] font-bold !text-dash-text mb-1.5">Menu name</label>
            <input
              type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
              placeholder="Main greeting"
              className="w-full bg-dash-surface border border-dash-border rounded-xl px-3 py-2.5 text-[12px] !text-dash-text outline-none focus:border-dash-accent"
              required
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold !text-dash-text mb-1.5">Greeting (spoken to callers)</label>
            <textarea
              value={newGreeting} onChange={(e) => setNewGreeting(e.target.value)}
              placeholder="Thanks for calling. Press 1 for sales, press 2 for support."
              rows={2}
              className="w-full bg-dash-surface border border-dash-border rounded-xl px-3 py-2.5 text-[12px] !text-dash-text outline-none focus:border-dash-accent resize-none"
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <DashButton type="button" variant="secondary" size="sm" onClick={() => setCreating(false)}>Cancel</DashButton>
            <DashButton type="submit" variant="primary" size="sm">Create menu</DashButton>
          </div>
        </form>
      )}

      {loading ? (
        <div className="p-8 flex justify-center"><div className="w-5 h-5 border-2 border-dash-accent border-t-transparent rounded-full animate-spin motion-reduce:animate-none" /></div>
      ) : menus.length === 0 ? (
        <div className="p-8 flex flex-col items-center justify-center text-center border border-dashed border-dash-border rounded-xl">
          <ListTree size={24} className="!text-dash-textMuted mb-2 opacity-40" />
          <p className="text-[12px] font-semibold !text-dash-textMuted">No IVR menus yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {menus.map((menu) => (
            <MenuCard
              key={menu.id}
              menu={menu}
              menus={menus}
              expanded={expandedMenuId === menu.id}
              onToggle={() => setExpandedMenuId(expandedMenuId === menu.id ? null : menu.id)}
              onDelete={() => setPendingDelete(menu)}
              onChanged={refresh}
            />
          ))}
        </div>
      )}

      {/* Number assignment */}
      {numbers.length > 0 && (
        <div className="border border-dash-border rounded-xl p-4 space-y-3">
          <p className="text-[12px] font-bold !text-dash-text">Assign a menu to a number</p>
          {numbers.map((n) => {
            const currentMenuId = menus.find((m) => m.assignedNumbers?.includes(n.phone_number))?.id || '';
            return (
              <div key={n.id} className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <Phone size={13} className="text-blue-500" />
                  <span className="text-[12px] font-mono font-semibold !text-dash-text">{n.phone_number}</span>
                </div>
                <select
                  value={currentMenuId}
                  disabled={assigning === n.id}
                  onChange={(e) => handleAssign(n.id, e.target.value)}
                  className="bg-dash-surface border border-dash-border rounded-lg px-3 py-2 text-[12px] !text-dash-text outline-none focus:border-dash-accent"
                >
                  <option value="">No menu (calls not handled)</option>
                  {menus.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        isOpen={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={handleDelete}
        title="Delete this menu?"
        description={`This permanently deletes "${pendingDelete?.name}" and all its options. This cannot be undone.`}
        confirmLabel="Delete menu"
        variant="danger"
      />
    </div>
  );
}

function MenuCard({ menu, menus, expanded, onToggle, onDelete, onChanged }: {
  menu: IvrMenu;
  menus: IvrMenu[];
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onChanged: () => void;
}) {
  const [detail, setDetail] = useState<IvrMenu | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [savingMeta, setSavingMeta] = useState(false);
  const [name, setName] = useState(menu.name);
  const [greeting, setGreeting] = useState(menu.greeting_text);
  const [fallbackType, setFallbackType] = useState(menu.fallback_destination_type);
  const [fallbackNumber, setFallbackNumber] = useState(menu.fallback_destination_value?.number || '');
  const [recordCalls, setRecordCalls] = useState(menu.record_calls);
  const [addingOption, setAddingOption] = useState(false);

  const loadDetail = useCallback(async () => {
    setLoadingDetail(true);
    const res = await getIvrMenu(menu.id);
    if (res.error) toast.error(res.error);
    setDetail(res.data || null);
    setLoadingDetail(false);
  }, [menu.id]);

  useEffect(() => { if (expanded) loadDetail(); }, [expanded, loadDetail]);

  const saveMeta = async () => {
    setSavingMeta(true);
    const res = await updateIvrMenu(menu.id, {
      name,
      greetingText: greeting,
      fallbackDestinationType: fallbackType,
      fallbackDestinationValue: fallbackType === 'forward' ? { number: fallbackNumber } : {},
      recordCalls,
    });
    setSavingMeta(false);
    if (res.error) { toast.error(res.error); return; }
    toast.success('Menu updated.');
    onChanged();
  };

  const handleDeleteOption = async (optionId: string) => {
    const res = await deleteMenuOption(optionId, menu.id);
    if (res.error) { toast.error(res.error); return; }
    toast.success('Option removed.');
    loadDetail();
    onChanged();
  };

  const usedKeys = new Set((detail?.options || []).map((o) => o.keypress));
  const noRealFallback = fallbackType === 'hangup';

  return (
    <div className="border border-dash-border rounded-xl overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center justify-between p-4 hover:bg-dash-surface transition-colors motion-reduce:transition-none">
        <div className="flex items-center gap-3">
          <ListTree size={15} className="text-dash-accent" />
          <div className="text-left">
            <p className="text-[13px] font-bold !text-dash-text">{menu.name}</p>
            <p className="text-[11px] !text-dash-textMuted">
              {menu.assignedNumbers && menu.assignedNumbers.length > 0
                ? `Assigned to ${menu.assignedNumbers.join(', ')}`
                : 'Not assigned to a number'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-red-600 hover:text-red-700 transition-colors motion-reduce:transition-none">
            <Trash2 size={14} />
          </button>
          {expanded ? <ChevronUp size={16} className="!text-dash-textMuted" /> : <ChevronDown size={16} className="!text-dash-textMuted" />}
        </div>
      </button>

      {expanded && (
        <div className="p-4 border-t border-dash-border space-y-5">
          {loadingDetail ? (
            <div className="p-4 flex justify-center"><div className="w-5 h-5 border-2 border-dash-accent border-t-transparent rounded-full animate-spin motion-reduce:animate-none" /></div>
          ) : (
            <>
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold !text-dash-text mb-1.5">Name</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-dash-surface border border-dash-border rounded-xl px-3 py-2.5 text-[12px] !text-dash-text outline-none focus:border-dash-accent" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold !text-dash-text mb-1.5">Greeting</label>
                  <textarea value={greeting} onChange={(e) => setGreeting(e.target.value)} rows={2} className="w-full bg-dash-surface border border-dash-border rounded-xl px-3 py-2.5 text-[12px] !text-dash-text outline-none focus:border-dash-accent resize-none" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold !text-dash-text mb-1.5">If no valid input after retries</label>
                    <select value={fallbackType} onChange={(e) => setFallbackType(e.target.value as any)} className="w-full bg-dash-surface border border-dash-border rounded-xl px-3 py-2.5 text-[12px] !text-dash-text outline-none focus:border-dash-accent">
                      <option value="hangup">Play goodbye message and hang up</option>
                      <option value="voicemail">Send to voicemail</option>
                      <option value="forward">Forward to a number</option>
                    </select>
                  </div>
                  {fallbackType === 'forward' && (
                    <div>
                      <label className="block text-[11px] font-bold !text-dash-text mb-1.5">Fallback number</label>
                      <input value={fallbackNumber} onChange={(e) => setFallbackNumber(e.target.value)} placeholder="+27..." className="w-full bg-dash-surface border border-dash-border rounded-xl px-3 py-2.5 text-[12px] font-mono !text-dash-text outline-none focus:border-dash-accent" />
                    </div>
                  )}
                </div>

                {noRealFallback && (
                  <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                    <AlertTriangle size={13} className="text-amber-600 mt-0.5 flex-shrink-0" />
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      This menu has no real fallback — callers who never press a valid key just hear a goodbye message and get hung up on. Consider voicemail or a forwarding number instead.
                    </p>
                  </div>
                )}

                <label className="flex items-start gap-2 p-3 bg-dash-surface border border-dash-border rounded-xl cursor-pointer">
                  <input type="checkbox" checked={recordCalls} onChange={(e) => setRecordCalls(e.target.checked)} className="mt-0.5" />
                  <span className="text-[11px] !text-dash-textMuted leading-relaxed">
                    <span className="font-bold !text-dash-text">Record full calls on this menu.</span> Beyond voicemail — records the entire bridged conversation.
                    {' '}<span className="text-amber-700 font-semibold">Enabling this may require notifying callers that calls are recorded, depending on your jurisdiction (e.g. two-party consent laws) — you are responsible for that disclosure.</span>
                  </span>
                </label>

                <div className="flex justify-end">
                  <DashButton size="sm" variant="primary" disabled={savingMeta} onClick={saveMeta}>
                    {savingMeta ? 'Saving…' : 'Save menu settings'}
                  </DashButton>
                </div>
              </div>

              <div className="border-t border-dash-border pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[12px] font-bold !text-dash-text">Options ({(detail?.options || []).length})</p>
                  <button onClick={() => setAddingOption((v) => !v)} className="flex items-center gap-1 text-[11px] font-bold text-dash-accent hover:text-dash-accent/80 transition-colors motion-reduce:transition-none">
                    <Plus size={12} /> Add option
                  </button>
                </div>

                {(detail?.options || []).length === 0 && !addingOption && (
                  <p className="text-[11px] !text-dash-textMuted py-2">No options yet — this menu can't be assigned to a number until it has at least one.</p>
                )}

                <div className="space-y-2">
                  {(detail?.options || []).map((opt) => (
                    <div key={opt.id} className="flex items-center justify-between gap-3 p-3 bg-dash-surface border border-dash-border rounded-xl">
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-lg bg-dash-accent/10 text-dash-accent font-bold text-[12px] flex items-center justify-center flex-shrink-0">{opt.keypress}</span>
                        <div>
                          <p className="text-[11px] font-bold !text-dash-text flex items-center gap-1.5">{destinationIcon(opt.destination_type)} {DESTINATION_LABEL[opt.destination_type]}</p>
                          <p className="text-[10px] !text-dash-textMuted font-mono">{summarizeDestination(opt, menus)}</p>
                        </div>
                      </div>
                      <button onClick={() => handleDeleteOption(opt.id)} className="text-red-600 hover:text-red-700 transition-colors motion-reduce:transition-none">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>

                {addingOption && (
                  <OptionForm
                    menuId={menu.id}
                    usedKeys={usedKeys}
                    otherMenus={menus.filter((m) => m.id !== menu.id)}
                    onSaved={() => { setAddingOption(false); loadDetail(); onChanged(); }}
                    onCancel={() => setAddingOption(false)}
                  />
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function OptionForm({ menuId, usedKeys, otherMenus, onSaved, onCancel }: {
  menuId: string;
  usedKeys: Set<string>;
  otherMenus: IvrMenu[];
  onSaved: () => void;
  onCancel: () => void;
}) {
  const availableKeys = KEYPAD.filter((k) => !usedKeys.has(k));
  const [keypress, setKeypress] = useState(availableKeys[0] || '');
  const [destinationType, setDestinationType] = useState<'submenu' | 'forward' | 'voicemail' | 'ring_group'>('forward');
  const [label, setLabel] = useState('');
  const [forwardNumber, setForwardNumber] = useState('');
  const [submenuId, setSubmenuId] = useState(otherMenus[0]?.id || '');
  const [ringNumbers, setRingNumbers] = useState('');
  const [ringStrategy, setRingStrategy] = useState<'simultaneous' | 'sequential'>('simultaneous');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keypress) { toast.error('All keys are already used on this menu.'); return; }

    let destinationValue: any = {};
    if (destinationType === 'forward') destinationValue = { number: forwardNumber.trim() };
    else if (destinationType === 'submenu') destinationValue = { menuId: submenuId };
    else if (destinationType === 'ring_group') {
      destinationValue = {
        strategy: ringStrategy,
        numbers: ringNumbers.split(',').map((n) => n.trim()).filter(Boolean),
      };
    }

    setSaving(true);
    const res = await upsertMenuOption({ menuId, keypress, label, destinationType, destinationValue });
    setSaving(false);
    if (res.error) { toast.error(res.error); return; }
    toast.success('Option saved.');
    onSaved();
  };

  return (
    <form onSubmit={handleSave} className="border border-dash-border rounded-xl p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-bold !text-dash-text mb-1.5">Key</label>
          <select value={keypress} onChange={(e) => setKeypress(e.target.value)} className="w-full bg-dash-surface border border-dash-border rounded-lg px-3 py-2 text-[12px] !text-dash-text outline-none focus:border-dash-accent">
            {availableKeys.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-bold !text-dash-text mb-1.5">Label (optional)</label>
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Sales" className="w-full bg-dash-surface border border-dash-border rounded-lg px-3 py-2 text-[12px] !text-dash-text outline-none focus:border-dash-accent" />
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-bold !text-dash-text mb-1.5">Action</label>
        <select value={destinationType} onChange={(e) => setDestinationType(e.target.value as any)} className="w-full bg-dash-surface border border-dash-border rounded-lg px-3 py-2 text-[12px] !text-dash-text outline-none focus:border-dash-accent">
          <option value="forward">Forward to a number</option>
          <option value="ring_group">Ring a group of numbers</option>
          <option value="voicemail">Send to voicemail</option>
          <option value="submenu">Route to a submenu</option>
        </select>
      </div>

      {destinationType === 'forward' && (
        <div>
          <label className="block text-[11px] font-bold !text-dash-text mb-1.5">Number</label>
          <input value={forwardNumber} onChange={(e) => setForwardNumber(e.target.value)} placeholder="+27..." className="w-full bg-dash-surface border border-dash-border rounded-lg px-3 py-2 text-[12px] font-mono !text-dash-text outline-none focus:border-dash-accent" required />
        </div>
      )}

      {destinationType === 'ring_group' && (
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-bold !text-dash-text mb-1.5">Numbers (comma separated)</label>
            <input value={ringNumbers} onChange={(e) => setRingNumbers(e.target.value)} placeholder="+2711..., +2782..." className="w-full bg-dash-surface border border-dash-border rounded-lg px-3 py-2 text-[12px] font-mono !text-dash-text outline-none focus:border-dash-accent" required />
          </div>
          <div>
            <label className="block text-[11px] font-bold !text-dash-text mb-1.5">Ring strategy</label>
            <select value={ringStrategy} onChange={(e) => setRingStrategy(e.target.value as any)} className="w-full bg-dash-surface border border-dash-border rounded-lg px-3 py-2 text-[12px] !text-dash-text outline-none focus:border-dash-accent">
              <option value="simultaneous">Ring all at once</option>
              <option value="sequential">Ring one at a time, in order</option>
            </select>
          </div>
        </div>
      )}

      {destinationType === 'submenu' && (
        <div>
          <label className="block text-[11px] font-bold !text-dash-text mb-1.5">Submenu</label>
          {otherMenus.length === 0 ? (
            <p className="text-[11px] !text-dash-textMuted">Create another menu first to route into it.</p>
          ) : (
            <select value={submenuId} onChange={(e) => setSubmenuId(e.target.value)} className="w-full bg-dash-surface border border-dash-border rounded-lg px-3 py-2 text-[12px] !text-dash-text outline-none focus:border-dash-accent">
              {otherMenus.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          )}
        </div>
      )}

      {destinationType === 'voicemail' && (
        <div className="flex items-center gap-2 p-3 bg-dash-surface border border-dash-border rounded-lg">
          <Mic size={13} className="text-dash-accent" />
          <p className="text-[11px] !text-dash-textMuted">Workspace admins are notified by email whenever a voicemail is left here.</p>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <DashButton type="button" variant="secondary" size="sm" onClick={onCancel}>Cancel</DashButton>
        <DashButton type="submit" variant="primary" size="sm" disabled={saving || (destinationType === 'submenu' && otherMenus.length === 0)}>
          {saving ? 'Saving…' : 'Save option'}
        </DashButton>
      </div>
    </form>
  );
}
