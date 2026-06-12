"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Plus, PlayCircle, Loader2, Trash2, ArrowRight, Zap, HelpCircle, Mail, MessageSquare, Tag, Lock, Settings 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useDashboardContext } from "@/components/layouts/DashboardProvider";
import RuleModal from "./components/RuleModal";
import { seedCourseBlueprints } from "@/app/actions/courseBlueprints";

interface AutomationsClientProps {
  course: any;
}

export default function AutomationsClient({ course }: AutomationsClientProps) {
  const router = useRouter();
  const { workspace } = useDashboardContext();
  const workspaceId = workspace?.id || null;

  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<any | null>(null);

  const handleSeedBlueprints = async () => {
    setSeeding(true);
    try {
      const result = await seedCourseBlueprints(course.id);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("5 Core blueprints seeded successfully!");
        await loadRules();
      }
    } catch (err: any) {
      toast.error(err.message || "Seeding failed");
    } finally {
      setSeeding(false);
    }
  };

  useEffect(() => {
    if (workspaceId) {
      loadRules();
    }
  }, [workspaceId]);

  const loadRules = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/lms/automations?workspaceId=${workspaceId}`);
      const resData = await res.json();
      if (resData.data) {
        setRules(resData.data);
        if (resData.data.length > 0) {
          setSelectedRuleId(resData.data[0].id);
        }
      }
    } catch {
      toast.error("Failed to load automation rules");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (id: string, active: boolean) => {
    try {
      const res = await fetch(`/api/lms/automations?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active })
      });
      const resData = await res.json();
      if (resData.error) toast.error(resData.error);
      else {
        toast.success(active ? "Rule activated!" : "Rule deactivated.");
        setRules(rules.map((r) => (r.id === id ? { ...r, active } : r)));
      }
    } catch {
      toast.error("Failed to toggle status");
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this automation rule?")) return;
    try {
      const res = await fetch(`/api/lms/automations?id=${id}`, { method: "DELETE" });
      const resData = await res.json();
      if (resData.error) toast.error(resData.error);
      else {
        toast.success("Automation rule deleted.");
        setRules(rules.filter((r) => r.id !== id));
        if (selectedRuleId === id) setSelectedRuleId(rules[0]?.id || null);
      }
    } catch {
      toast.error("Failed to delete rule");
    }
  };

  const selectedRule = rules.find((r) => r.id === selectedRuleId);

  return (
    <div className="space-y-6 text-white font-body">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white/30 font-mono">
        <span className="hover:text-primary transition-colors cursor-pointer" onClick={() => router.push("/courses")}>Courses</span>
        <span>›</span>
        <span className="hover:text-primary transition-colors cursor-pointer" onClick={() => router.push(`/courses/${course.id}`)}>{course.title}</span>
        <span>›</span>
        <span className="text-white/60">Automations</span>
      </div>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-6">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">Visual Flow Canvas</span>
          <h1 className="text-3xl font-space-grotesk font-black uppercase tracking-tighter text-white mt-1.5">
            Automation <span className="text-[#3b82f6]">Builder</span>
          </h1>
          <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-2">
            Build interactive drag-and-drop workflow node mappings for student events
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={handleSeedBlueprints}
            disabled={seeding}
            className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl uppercase tracking-wider text-[10px] font-black h-11 px-6 shadow-lg shadow-purple-600/20 flex items-center gap-1.5"
          >
            {seeding ? (
              <Loader2 className="animate-spin" size={14} />
            ) : (
              <Zap size={14} />
            )}
            Seed Core Blueprints
          </Button>
          <Button
            onClick={() => { setEditingRule(null); setIsModalOpen(true); }}
            className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-xl uppercase tracking-wider text-[10px] font-black h-11 px-6 shadow-lg shadow-primary/20 flex items-center gap-1.5"
          >
            <Plus size={14} /> Initialize Workflow
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-xs text-white/40 flex items-center justify-center gap-2">
          <Loader2 className="animate-spin" size={14} /> Loading rules...
        </div>
      ) : rules.length === 0 ? (
        <div className="py-20 bg-[#080f28] border border-white/5 rounded-3xl flex flex-col items-center justify-center text-center px-4">
          <PlayCircle className="w-8 h-8 text-white/20 mb-4 animate-pulse" />
          <h3 className="text-base font-space-grotesk font-black uppercase text-white/50 tracking-wider">No Workflows Initialized</h3>
          <p className="text-[10px] text-white/30 uppercase mt-2 max-w-sm">Create a trigger-based action sequence block to start orchestrating student lifecycles</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Rules Sidebar */}
          <div className="lg:col-span-1 space-y-2.5 bg-[#080f28]/60 border border-white/5 p-4 rounded-2xl max-h-[500px] overflow-y-auto">
            <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider block mb-2 font-mono">Workflow Index</span>
            {rules.map((rule) => (
              <div
                key={rule.id}
                onClick={() => setSelectedRuleId(rule.id)}
                className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all select-none ${
                  selectedRuleId === rule.id
                    ? "bg-primary/10 border-primary text-white font-bold"
                    : "bg-white/[0.01] border-transparent text-white/50 hover:bg-white/[0.02] hover:text-white"
                }`}
              >
                <div className="flex justify-between items-start gap-2">
                  <span className="truncate">{rule.name}</span>
                  <Switch
                    checked={rule.active}
                    onClick={(e) => e.stopPropagation()}
                    onCheckedChange={(checked) => handleToggleActive(rule.id, checked)}
                    className="data-[state=checked]:bg-[#2563eb] scale-75"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Visual card flow interface canvas */}
          <div className="lg:col-span-3 bg-[#04091a]/40 border border-white/5 rounded-3xl p-8 min-h-[450px] relative overflow-hidden flex flex-col items-center justify-center">
            {/* Visual Canvas Grids */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

            {selectedRule && (
              <div className="flex flex-col md:flex-row items-center gap-6 z-10 w-full max-w-2xl justify-center">
                {/* 1. Trigger Card Node */}
                <div className="bg-[#0c1535] border border-white/5 hover:border-primary/20 p-5 rounded-2xl shadow-xl w-60 shrink-0 text-center space-y-3 relative group">
                  <div className="w-10 h-10 bg-primary/10 border border-primary/20 text-primary rounded-xl flex items-center justify-center mx-auto">
                    <Zap size={18} className="animate-pulse" />
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest font-mono">1. Trigger Block</span>
                    <h4 className="text-xs font-black uppercase text-white mt-1 truncate">
                      {selectedRule.trigger_type.replace(/_/g, " ")}
                    </h4>
                  </div>
                </div>

                {/* Arrow Connector */}
                <ArrowRight className="text-white/25 hidden md:block" size={20} />

                {/* 2. Condition Card Node */}
                <div className="bg-[#0c1535] border border-white/5 hover:border-purple-500/20 p-5 rounded-2xl shadow-xl w-60 shrink-0 text-center space-y-3 relative group">
                  <div className="w-10 h-10 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-xl flex items-center justify-center mx-auto">
                    <HelpCircle size={18} />
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest font-mono">2. Branch Block</span>
                    <h4 className="text-xs font-black uppercase text-white mt-1">
                      {selectedRule.trigger_config?.conditions?.length > 0 
                        ? `Check: ${selectedRule.trigger_config.conditions[0].field}` 
                        : "Route: Always"}
                    </h4>
                  </div>
                </div>

                {/* Arrow Connector */}
                <ArrowRight className="text-white/25 hidden md:block" size={20} />

                {/* 3. Action Card Node */}
                <div className="bg-[#0c1535] border border-[#2563eb]/20 p-5 rounded-2xl shadow-xl w-60 shrink-0 text-center space-y-3 relative group">
                  <div className="w-10 h-10 bg-[#2563eb]/10 border border-[#2563eb]/20 text-[#3b82f6] rounded-xl flex items-center justify-center mx-auto">
                    {selectedRule.action_type === "send_email" && <Mail size={18} />}
                    {selectedRule.action_type === "send_whatsapp" && <MessageSquare size={18} />}
                    {selectedRule.action_type === "add_tag" && <Tag size={18} />}
                    {!(["send_email", "send_whatsapp", "add_tag"].includes(selectedRule.action_type)) && <Lock size={18} />}
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest font-mono">3. Action Block</span>
                    <h4 className="text-xs font-black uppercase text-white mt-1 truncate">
                      {selectedRule.action_type.replace(/_/g, " ")}
                    </h4>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Actions overlay */}
            {selectedRule && (
              <div className="absolute bottom-5 right-5 flex gap-2 z-20">
                <button
                  onClick={() => {
                    setEditingRule(selectedRule);
                    setIsModalOpen(true);
                  }}
                  className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-all active:scale-95 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider font-mono"
                  title="Configure Workflow Parameters"
                >
                  <Settings size={14} /> Configure Node
                </button>
                <button
                  onClick={() => handleDeleteRule(selectedRule.id)}
                  className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/10 text-red-400 hover:bg-red-500/20 transition-all active:scale-95 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider font-mono"
                  title="Delete Workflow"
                >
                  <Trash2 size={14} /> Remove Flow
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal config interface */}
      <RuleModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingRule(null);
        }}
        onSaved={loadRules}
        editingRule={editingRule}
        workspaceId={workspaceId}
      />
    </div>
  );
}
