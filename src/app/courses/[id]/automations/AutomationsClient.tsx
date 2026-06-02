"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, PlayCircle, Loader2, Sparkles, Trash2, Edit2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useDashboardContext } from "@/components/layouts/DashboardProvider";
import RuleModal from "./components/RuleModal";

interface AutomationsClientProps {
  course: any;
}

export default function AutomationsClient({ course }: AutomationsClientProps) {
  const router = useRouter();
  const { workspace } = useDashboardContext();
  const workspaceId = workspace?.id || null;

  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<any | null>(null);

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
      if (resData.error) {
        toast.error(resData.error);
      } else {
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
      const res = await fetch(`/api/lms/automations?id=${id}`, {
        method: "DELETE"
      });
      const resData = await res.json();
      if (resData.error) {
        toast.error(resData.error);
      } else {
        toast.success("Automation rule deleted.");
        setRules(rules.filter((r) => r.id !== id));
      }
    } catch {
      toast.error("Failed to delete rule");
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Breadcrumbs */}
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white/30 font-mono">
        <span className="hover:text-primary transition-colors cursor-pointer" onClick={() => router.push("/courses")}>Courses</span>
        <span>›</span>
        <span className="hover:text-primary transition-colors cursor-pointer" onClick={() => router.push(`/courses/${course.id}`)}>{course.title}</span>
        <span>›</span>
        <span className="text-white/60">Automations</span>
      </div>

      {/* Back button */}
      <div>
        <button
          onClick={() => router.push(`/courses/${course.id}`)}
          className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white uppercase tracking-wider font-bold bg-white/5 border border-white/5 hover:bg-white/10 px-3 py-1.5 rounded-xl transition-all"
        >
          <ArrowLeft size={13} /> Back to Course
        </button>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-6">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">Rules Engine</span>
          <h1 className="text-3xl font-space-grotesk font-black uppercase tracking-tighter text-white mt-1.5">
            Course <span className="text-primary-light">Automations</span>
          </h1>
          <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-2">
            Configure system triggers and action nodes for student outcomes
          </p>
        </div>

        <Button
          onClick={() => {
            setEditingRule(null);
            setIsModalOpen(true);
          }}
          className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-xl uppercase tracking-wider text-[10px] font-black h-11 px-6 shadow-lg shadow-primary/20 flex items-center gap-1.5"
        >
          <Plus size={14} /> New Rule
        </Button>
      </div>

      {/* Rules List */}
      {loading ? (
        <div className="py-20 text-center text-xs text-white/40 flex items-center justify-center gap-2">
          <Loader2 className="animate-spin" size={14} /> Loading rules...
        </div>
      ) : rules.length === 0 ? (
        <div className="py-20 bg-[#080f28] border-2 border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center text-center px-4">
          <div className="w-16 h-16 bg-[#111d47] rounded-full flex items-center justify-center mb-5 border border-white/5">
            <PlayCircle className="w-8 h-8 text-white/20" />
          </div>
          <h3 className="text-lg font-space-grotesk font-black text-white/50 uppercase tracking-widest">
            No Automation Rules
          </h3>
          <p className="text-white/20 text-[10px] font-bold mt-2 uppercase tracking-wider max-w-sm">
            Create trigger-based events to enroll students, award tags, send emails, and unlock learning steps.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className="bg-[rgba(12,21,53,0.85)] border border-[rgba(255,255,255,0.07)] rounded-xl p-5 flex items-center justify-between gap-4 transition-all hover:bg-white/[0.02]"
            >
              <div className="space-y-1.5">
                <h4 className="text-sm font-semibold text-white">{rule.name}</h4>
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="bg-white/5 border border-white/10 rounded-full px-3 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white/50">
                    ⚡ Trigger: {rule.trigger_type.replace(/_/g, " ")}
                  </span>
                  <span className="bg-primary/10 border border-primary/20 rounded-full px-3 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#3b82f6]">
                    ⚙️ Action: {rule.action_type.replace(/_/g, " ")}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                    {rule.active ? "Active" : "Inactive"}
                  </span>
                  <Switch
                    checked={rule.active}
                    onCheckedChange={(checked) => handleToggleActive(rule.id, checked)}
                    className="data-[state=checked]:bg-[#2563eb]"
                  />
                </div>

                <button
                  onClick={() => {
                    setEditingRule(rule);
                    setIsModalOpen(true);
                  }}
                  className="p-2 text-white/40 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg transition-all"
                  title="Edit Rule"
                >
                  <Edit2 size={13} />
                </button>

                <button
                  onClick={() => handleDeleteRule(rule.id)}
                  className="p-2 text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/10 rounded-lg transition-all"
                  title="Delete Rule"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Dialog */}
      <RuleModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingRule(null);
        }}
        onSaved={() => {
          loadRules();
        }}
        editingRule={editingRule}
        workspaceId={workspaceId}
      />

    </div>
  );
}
