'use client';

import React, { useState, useEffect } from 'react';

interface Agent {
  id: string;
  display_name: string;
  role_label: string | null;
  avatar_url: string | null;
  availability: 'online' | 'offline' | 'busy';
  routing_topics: string[];
  working_hours: Record<string, string>;
  avg_response_minutes: number;
}

interface AgentsTabProps {
  workspaceId: string;
}

export default function AgentsTab({ workspaceId }: AgentsTabProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);

  // Form states
  const [displayName, setDisplayName] = useState('');
  const [roleLabel, setRoleLabel] = useState('Support');
  const [availability, setAvailability] = useState<'online' | 'offline' | 'busy'>('offline');
  const [routingTopicsText, setRoutingTopicsText] = useState('');
  const [workingHoursStart, setWorkingHoursStart] = useState('09:00');
  const [workingHoursEnd, setWorkingHoursEnd] = useState('17:00');
  const [saving, setSaving] = useState(false);

  const fetchAgents = async () => {
    try {
      const res = await fetch(`/api/lena/agents?workspaceId=${workspaceId}`);
      const data = await res.json();
      if (res.ok) {
        setAgents(data.agents || []);
      }
    } catch (err) {
      console.error('Failed to fetch agents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, [workspaceId]);

  const openAddModal = () => {
    setEditingAgent(null);
    setDisplayName('');
    setRoleLabel('Support');
    setAvailability('offline');
    setRoutingTopicsText('');
    setWorkingHoursStart('09:00');
    setWorkingHoursEnd('17:00');
    setModalOpen(true);
  };

  const openEditModal = (ag: Agent) => {
    setEditingAgent(ag);
    setDisplayName(ag.display_name);
    setRoleLabel(ag.role_label || 'Support');
    setAvailability(ag.availability);
    setRoutingTopicsText(ag.routing_topics.join(', '));
    setWorkingHoursStart(ag.working_hours?.start || '09:00');
    setWorkingHoursEnd(ag.working_hours?.end || '17:00');
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;
    setSaving(true);

    const routingTopics = routingTopicsText
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const payload = {
      workspaceId,
      display_name: displayName,
      role_label: roleLabel,
      availability,
      routing_topics: routingTopics,
      working_hours: { start: workingHoursStart, end: workingHoursEnd }
    };

    try {
      const url = editingAgent ? `/api/lena/agents?id=${editingAgent.id}` : '/api/lena/agents';
      const method = editingAgent ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setModalOpen(false);
        fetchAgents();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to save agent.');
      }
    } catch {
      alert('Network error saving agent.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this agent?')) return;
    try {
      const res = await fetch(`/api/lena/agents?id=${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchAgents();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to delete agent.');
      }
    } catch {
      alert('Network error deleting agent.');
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const getAvailabilityBadge = (status: 'online' | 'offline' | 'busy') => {
    switch (status) {
      case 'online':
        return 'bg-[#10b981]/15 text-[#34d399] border-[#10b981]/25';
      case 'busy':
        return 'bg-[#f59e0b]/15 text-[#fbbf24] border-[#f59e0b]/25';
      default:
        return 'bg-white/5 text-[#94a3c8] border-white/10';
    }
  };

  if (loading) {
    return <div className="h-40 bg-white/[0.02] animate-pulse rounded-xl" />;
  }

  return (
    <div className="space-y-6 w-full">
      {/* Header bar */}
      <div className="flex justify-between items-center bg-[rgba(12,21,53,0.85)] border border-[rgba(255,255,255,0.07)] p-4 rounded-xl">
        <div>
          <span className="text-[14px] font-semibold text-[#eef2ff] block font-space-grotesk">
            Support Representatives
          </span>
          <span className="text-[11.5px] text-[#4a5a82] font-dm-sans">
            Configure agent routing and statuses when chatbot escalates conversation to human.
          </span>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-[12px] font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          + Add Agent
        </button>
      </div>

      {/* Agents grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.length === 0 ? (
          <div className="bg-[rgba(12,21,53,0.85)] border border-dashed border-[rgba(255,255,255,0.1)] p-8 rounded-xl text-center col-span-full flex flex-col items-center gap-3">
            <span className="text-[28px] text-[#4a5a82] opacity-55">👤</span>
            <span className="text-[13px] font-semibold text-[#94a3c8]">No Support Agents Added</span>
            <p className="text-[12px] text-[#4a5a82] max-w-[280px]">
              Add live agents to take over conversations when visitors request human assistance.
            </p>
            <button
              onClick={openAddModal}
              className="bg-[#2563eb] text-white text-[12px] font-semibold rounded-lg px-4 py-1.5 mt-2 hover:bg-[#1d4ed8]"
            >
              + Create First Agent
            </button>
          </div>
        ) : (
          agents.map((agent) => (
            <div
              key={agent.id}
              className="bg-[rgba(12,21,53,0.85)] border border-[rgba(255,255,255,0.07)] rounded-xl p-5 flex flex-col justify-between"
            >
              <div className="flex gap-4">
                <div className="w-11 h-11 rounded-full bg-[#111d47] border border-white/5 flex items-center justify-center text-white font-bold font-space-grotesk text-[14px]">
                  {getInitials(agent.display_name)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[#eef2ff] font-semibold text-[13.5px] font-space-grotesk">
                      {agent.display_name}
                    </span>
                    <span className={`text-[9.5px] font-semibold px-2 py-0.5 rounded-full border uppercase ${getAvailabilityBadge(agent.availability)}`}>
                      {agent.availability}
                    </span>
                  </div>
                  <span className="text-[#94a3c8] text-[11.5px] font-medium block mt-0.5">
                    {agent.role_label || 'Support Agent'}
                  </span>
                </div>
              </div>

              {agent.routing_topics?.length > 0 && (
                <div className="mt-4">
                  <div className="text-[9.5px] font-bold text-[#4a5a82] uppercase tracking-[0.5px] mb-1">
                    Handles
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {agent.routing_topics.map((t, idx) => (
                      <span
                        key={idx}
                        className="bg-white/5 border border-white/10 text-[10px] text-[#94a3c8] px-2 py-0.5 rounded"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between border-t border-white/5 mt-5 pt-3.5">
                <span className="text-[10px] text-[#4a5a82] font-semibold">
                  Shift: {agent.working_hours?.start || '09:00'} - {agent.working_hours?.end || '17:00'}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEditModal(agent)}
                    className="text-[11.5px] font-semibold text-[#3b82f6] hover:text-white transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(agent.id)}
                    className="text-[11.5px] font-semibold text-red-400 hover:text-white transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-[#04091a]/75 backdrop-blur-[4px] z-[500] flex items-center justify-center p-4">
          <div className="bg-[#080f28] border border-[rgba(255,255,255,0.13)] rounded-2xl w-full max-w-[480px] p-6 max-h-[90vh] overflow-y-auto flex flex-col">
            <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
              <span className="text-[15px] font-semibold text-white font-space-grotesk">
                {editingAgent ? 'Edit Agent Profile' : 'Register Support Agent'}
              </span>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-[#94a3c8] hover:text-white text-[16px]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-[0.6px] text-[#4a5a82] mb-1.5 block">
                  Display Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  className="bg-white/[0.05] border border-[rgba(255,255,255,0.07)] rounded-lg px-4 py-2 text-white text-[13px] focus:outline-none focus:border-[#2563eb] w-full"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold uppercase tracking-[0.6px] text-[#4a5a82] mb-1.5 block">
                  Role Label
                </label>
                <input
                  type="text"
                  placeholder="e.g. Technical Support, Billing Agent"
                  value={roleLabel}
                  onChange={(e) => setRoleLabel(e.target.value)}
                  className="bg-white/[0.05] border border-[rgba(255,255,255,0.07)] rounded-lg px-4 py-2 text-white text-[13px] focus:outline-none focus:border-[#2563eb] w-full"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold uppercase tracking-[0.6px] text-[#4a5a82] mb-1.5 block">
                  Availability status
                </label>
                <select
                  value={availability}
                  onChange={(e: any) => setAvailability(e.target.value)}
                  className="bg-[#111d47] border border-[rgba(255,255,255,0.07)] rounded-lg px-4 py-2 text-white text-[13px] focus:outline-none focus:border-[#2563eb] w-full"
                >
                  <option value="offline">Offline (Ghost mode)</option>
                  <option value="online">Online (Available for handoff)</option>
                  <option value="busy">Busy (DND)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold uppercase tracking-[0.6px] text-[#4a5a82] mb-1.5 block">
                  Routing Topics (Comma separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. billing, setup, integration, refunds"
                  value={routingTopicsText}
                  onChange={(e) => setRoutingTopicsText(e.target.value)}
                  className="bg-white/[0.05] border border-[rgba(255,255,255,0.07)] rounded-lg px-4 py-2 text-white text-[13px] focus:outline-none focus:border-[#2563eb] w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-[0.6px] text-[#4a5a82] mb-1.5 block">
                    Shift Start
                  </label>
                  <input
                    type="time"
                    value={workingHoursStart}
                    onChange={(e) => setWorkingHoursStart(e.target.value)}
                    className="bg-white/[0.05] border border-[rgba(255,255,255,0.07)] rounded-lg px-4 py-2 text-white text-[13px] focus:outline-none focus:border-[#2563eb] w-full"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-[0.6px] text-[#4a5a82] mb-1.5 block">
                    Shift End
                  </label>
                  <input
                    type="time"
                    value={workingHoursEnd}
                    onChange={(e) => setWorkingHoursEnd(e.target.value)}
                    className="bg-white/[0.05] border border-[rgba(255,255,255,0.07)] rounded-lg px-4 py-2 text-white text-[13px] focus:outline-none focus:border-[#2563eb] w-full"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/5 mt-6">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="bg-white/5 hover:bg-white/10 text-white text-[12.5px] font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-[12.5px] font-semibold px-5 py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Register Agent'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
