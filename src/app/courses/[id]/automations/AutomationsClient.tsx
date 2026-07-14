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
import { ConfirmDialog } from "@/components/common/ConfirmDialog";

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
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleSeedBlueprints = async () => {
    setSeeding(true);
    try {
      const result = await seedCourseBlueprints(course.id);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("5 core blueprints seeded successfully.");
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
        toast.success(active ? "Rule activated." : "Rule deactivated.");
        setRules(rules.map((r) => (r.id === id ? { ...r, active } : r)));
      }
    } catch {
      toast.error("Failed to toggle status");
    }
  };

  const handleDeleteRule = async (id: string) => {
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
    <div className="space-y-6 font-body">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-1.5 text-xs font-bold !text-dash-textMuted">
        <span className="hover:!text-dash-accent transition-colors motion-reduce:transition-none cursor-pointer" onClick={() => router.push("/courses")}>Courses</span>
        <span>›</span>
        <span className="hover:!text-dash-accent transition-colors motion-reduce:transition-none cursor-pointer" onClick={() => router.push(`/courses/${course.id}`)}>{course.title}</span>
        <span>›</span>
        <span className="!text-dash-text">Automations</span>
      </div>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-dash-border pb-6">
        <div>
          <span className="text-xs font-bold !text-dash-accent">Automations</span>
          <h1 className="text-3xl font-bold !text-dash-text mt-1.5">
            Automation <span className="text-dash-accent">rules</span>
          </h1>
          <p className="text-xs !text-dash-textMuted mt-2">
            Automate actions based on student events, like enrollments or quiz results
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={handleSeedBlueprints}
            disabled={seeding}
            className="bg-purple text-white rounded-xl text-xs font-bold h-11 px-6 shadow-sm hover:bg-purple/90 disabled:opacity-50 flex items-center gap-1.5 transition-colors motion-reduce:transition-none"
          >
            {seeding ? (
              <Loader2 className="animate-spin motion-reduce:animate-none" size={14} />
            ) : (
              <Zap size={14} />
            )}
            Seed core blueprints
          </Button>
          <Button
            onClick={() => { setEditingRule(null); setIsModalOpen(true); }}
            className="bg-dash-accent hover:bg-dash-accent/90 text-white rounded-xl text-xs font-bold h-11 px-6 shadow-sm flex items-center gap-1.5 transition-colors motion-reduce:transition-none"
          >
            <Plus size={14} /> New automation rule
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-xs !text-dash-textMuted flex items-center justify-center gap-2">
          <Loader2 className="animate-spin motion-reduce:animate-none" size={14} /> Loading rules...
        </div>
      ) : rules.length === 0 ? (
        <div className="py-20 bg-white border border-dash-border rounded-2xl shadow-sm flex flex-col items-center justify-center text-center px-4">
          <PlayCircle className="w-12 h-12 !text-dash-textMuted opacity-40 mb-4" />
          <h3 className="!text-dash-textMuted font-bold text-sm">No automation rules yet</h3>
          <p className="text-xs !text-dash-textMuted mt-2 max-w-sm">Create a rule to automate actions based on student events</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Rules sidebar */}
          <div className="lg:col-span-1 space-y-2.5 bg-white border border-dash-border shadow-sm p-4 rounded-2xl max-h-[500px] overflow-y-auto">
            <span className="text-[10px] font-bold !text-dash-textMuted block mb-2">Rules</span>
            {rules.map((rule) => (
              <div
                key={rule.id}
                onClick={() => setSelectedRuleId(rule.id)}
                className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-colors motion-reduce:transition-none select-none ${
                  selectedRuleId === rule.id
                    ? "bg-dash-accent/10 border-dash-accent !text-dash-text font-bold"
                    : "bg-dash-surface border-transparent !text-dash-textMuted hover:bg-dash-border/40 hover:!text-dash-text"
                }`}
              >
                <div className="flex justify-between items-start gap-2">
                  <span className="truncate">{rule.name}</span>
                  <Switch
                    checked={rule.active}
                    onClick={(e) => e.stopPropagation()}
                    onCheckedChange={(checked) => handleToggleActive(rule.id, checked)}
                    className="data-[state=checked]:bg-dash-accent scale-75"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Visual rule flow canvas */}
          <div className="lg:col-span-3 bg-white border border-dash-border shadow-sm rounded-2xl p-8 min-h-[450px] relative overflow-hidden flex flex-col items-center justify-center">
            {/* Canvas grid backdrop */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(15,23,42,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.03)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

            {selectedRule && (
              <div className="flex flex-col md:flex-row items-center gap-6 z-10 w-full max-w-2xl justify-center">
                {/* 1. Trigger card */}
                <div className="bg-white border border-dash-border hover:border-dash-accent/40 transition-colors motion-reduce:transition-none p-5 rounded-2xl shadow-sm w-60 shrink-0 text-center space-y-3 relative group">
                  <div className="w-10 h-10 bg-dash-accent/10 border border-dash-accent/20 text-dash-accent rounded-xl flex items-center justify-center mx-auto">
                    <Zap size={18} />
                  </div>
                  <div>
                    <span className="text-[9px] font-bold !text-dash-textMuted">Trigger</span>
                    <h4 className="text-xs font-bold !text-dash-text mt-1 truncate capitalize">
                      {selectedRule.trigger_type.replace(/_/g, " ")}
                    </h4>
                  </div>
                </div>

                {/* Arrow connector */}
                <ArrowRight className="!text-dash-textMuted opacity-40 hidden md:block" size={20} />

                {/* 2. Condition card */}
                <div className="bg-white border border-dash-border hover:border-purple/40 transition-colors motion-reduce:transition-none p-5 rounded-2xl shadow-sm w-60 shrink-0 text-center space-y-3 relative group">
                  <div className="w-10 h-10 bg-purple/10 border border-purple/20 text-purple rounded-xl flex items-center justify-center mx-auto">
                    <HelpCircle size={18} />
                  </div>
                  <div>
                    <span className="text-[9px] font-bold !text-dash-textMuted">Condition</span>
                    <h4 className="text-xs font-bold !text-dash-text mt-1">
                      {selectedRule.trigger_config?.conditions?.length > 0
                        ? `Check: ${selectedRule.trigger_config.conditions[0].field}`
                        : "Always"}
                    </h4>
                  </div>
                </div>

                {/* Arrow connector */}
                <ArrowRight className="!text-dash-textMuted opacity-40 hidden md:block" size={20} />

                {/* 3. Action card */}
                <div className="bg-white border border-dash-accent/30 p-5 rounded-2xl shadow-sm w-60 shrink-0 text-center space-y-3 relative group">
                  <div className="w-10 h-10 bg-dash-accent/10 border border-dash-accent/20 text-dash-accent rounded-xl flex items-center justify-center mx-auto">
                    {selectedRule.action_type === "send_email" && <Mail size={18} />}
                    {selectedRule.action_type === "send_whatsapp" && <MessageSquare size={18} />}
                    {selectedRule.action_type === "add_tag" && <Tag size={18} />}
                    {!(["send_email", "send_whatsapp", "add_tag"].includes(selectedRule.action_type)) && <Lock size={18} />}
                  </div>
                  <div>
                    <span className="text-[9px] font-bold !text-dash-textMuted">Action</span>
                    <h4 className="text-xs font-bold !text-dash-text mt-1 truncate capitalize">
                      {selectedRule.action_type.replace(/_/g, " ")}
                    </h4>
                  </div>
                </div>
              </div>
            )}

            {/* Quick actions overlay */}
            {selectedRule && (
              <div className="absolute bottom-5 right-5 flex gap-2 z-20">
                <button
                  onClick={() => {
                    setEditingRule(selectedRule);
                    setIsModalOpen(true);
                  }}
                  className="p-2.5 rounded-xl bg-dash-surface border border-dash-border !text-dash-textMuted hover:!text-dash-text hover:bg-dash-border/60 transition-colors motion-reduce:transition-none active:scale-95 flex items-center gap-1.5 text-[10px] font-bold"
                  title="Edit rule"
                >
                  <Settings size={14} /> Edit rule
                </button>
                <button
                  onClick={() => setConfirmDeleteId(selectedRule.id)}
                  className="p-2.5 rounded-xl bg-red/10 border border-red/10 text-red hover:bg-red/20 transition-colors motion-reduce:transition-none active:scale-95 flex items-center gap-1.5 text-[10px] font-bold"
                  title="Delete rule"
                >
                  <Trash2 size={14} /> Delete rule
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Rule create/edit modal */}
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

      <ConfirmDialog
        isOpen={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={() => {
          if (confirmDeleteId) handleDeleteRule(confirmDeleteId);
        }}
        title="Delete automation rule"
        description="Are you sure you want to delete this automation rule? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
      />
    </div>
  );
}
