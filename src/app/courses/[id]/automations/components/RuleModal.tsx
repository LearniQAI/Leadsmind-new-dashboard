"use client";

import React, { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getCourses } from "@/app/actions/lms";

interface RuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  editingRule?: any;
  workspaceId: string | null;
}

const TRIGGERS = [
  { value: "course_completed", label: "Course Completed" },
  { value: "lesson_completed", label: "Lesson Completed" },
  { value: "quiz_passed", label: "Quiz Passed" },
  { value: "quiz_failed", label: "Quiz Failed" },
  { value: "module_completed", label: "Module Completed" },
  { value: "enrollment_created", label: "Enrollment Created" },
  { value: "certificate_issued", label: "Certificate Issued" },
  { value: "struggling_detected", label: "Struggling Detected" }
];

const ACTIONS = [
  { value: "enroll_course", label: "Enroll in Course" },
  { value: "revoke_course", label: "Revoke Course Access" },
  { value: "enroll_bundle", label: "Enroll in Bundle" },
  { value: "grant_community", label: "Grant Community Access" },
  { value: "add_tag", label: "Add Tag" },
  { value: "send_email", label: "Send Email" },
  { value: "send_whatsapp", label: "Send WhatsApp" },
  { value: "assign_certificate", label: "Assign Certificate" },
  { value: "notify_instructor", label: "Notify Instructor" }
];

export default function RuleModal({
  isOpen,
  onClose,
  onSaved,
  editingRule,
  workspaceId
}: RuleModalProps) {
  const [name, setName] = useState("");
  const [triggerType, setTriggerType] = useState("course_completed");
  const [actionType, setActionType] = useState("enroll_course");

  // Trigger configurations
  const [minScore, setMinScore] = useState(70);
  const [struggleThreshold, setStruggleThreshold] = useState(3);

  // Action configurations
  const [targetCourseId, setTargetCourseId] = useState("");
  const [gracePeriod, setGracePeriod] = useState(0);
  const [tagName, setTagName] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [whatsappMessage, setWhatsappMessage] = useState("");
  const [instructorId, setInstructorId] = useState("");

  const [courses, setCourses] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      getCourses().then((res) => {
        if (res.data) setCourses(res.data);
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (editingRule && isOpen) {
      setName(editingRule.name || "");
      setTriggerType(editingRule.trigger_type || "course_completed");
      setActionType(editingRule.action_type || "enroll_course");
      
      const tc = editingRule.trigger_config || {};
      setMinScore(tc.min_score ?? 70);
      setStruggleThreshold(tc.struggle_threshold ?? 3);

      const ac = editingRule.action_config || {};
      setTargetCourseId(ac.course_id || "");
      setGracePeriod(ac.grace_period_days || 0);
      setTagName(ac.tag_name || "");
      setEmailSubject(ac.email_subject || "");
      setEmailBody(ac.email_body || "");
      setWhatsappMessage(ac.whatsapp_message || "");
      setInstructorId(ac.instructor_id || "");
    } else {
      setName("");
      setTriggerType("course_completed");
      setActionType("enroll_course");
      setMinScore(70);
      setStruggleThreshold(3);
      setTargetCourseId("");
      setGracePeriod(0);
      setTagName("");
      setEmailSubject("");
      setEmailBody("");
      setWhatsappMessage("");
      setInstructorId("");
    }
  }, [editingRule, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Rule name is required");
      return;
    }
    if (!workspaceId) {
      toast.error("No active workspace found");
      return;
    }

    setSaving(true);

    const trigger_config: any = {};
    if (triggerType === "quiz_passed" || triggerType === "quiz_failed") {
      trigger_config.min_score = minScore;
    } else if (triggerType === "struggling_detected") {
      trigger_config.struggle_threshold = struggleThreshold;
    }

    const action_config: any = {};
    if (actionType === "enroll_course") {
      action_config.course_id = targetCourseId;
    } else if (actionType === "revoke_course") {
      action_config.course_id = targetCourseId;
      action_config.grace_period_days = gracePeriod;
    } else if (actionType === "add_tag") {
      action_config.tag_name = tagName;
    } else if (actionType === "send_email") {
      action_config.email_subject = emailSubject;
      action_config.email_body = emailBody;
    } else if (actionType === "send_whatsapp") {
      action_config.whatsapp_message = whatsappMessage;
    } else if (actionType === "notify_instructor") {
      action_config.instructor_id = instructorId;
    }

    try {
      const url = editingRule ? `/api/lms/automations?id=${editingRule.id}` : "/api/lms/automations";
      const method = editingRule ? "PATCH" : "POST";
      const bodyPayload = editingRule
        ? { name, trigger_type: triggerType, trigger_config, action_type: actionType, action_config }
        : { workspace_id: workspaceId, name, trigger_type: triggerType, trigger_config, action_type: actionType, action_config };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload)
      });
      const resData = await res.json();
      if (resData.error) {
        toast.error(resData.error);
      } else {
        toast.success(editingRule ? "Rule updated successfully!" : "Rule created successfully!");
        onSaved();
        onClose();
      }
    } catch {
      toast.error("Failed to save automation rule");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[500] flex items-center justify-center p-4">
      <div className="bg-white border border-dash-border rounded-xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl relative flex flex-col !text-dash-text">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-dash-border">
          <h2 className="text-base font-semibold">
            {editingRule ? "Edit Rule" : "Create Automation Rule"}
          </h2>
          <button onClick={onClose} className="!text-dash-textMuted hover:!text-dash-text transition-colors motion-reduce:transition-none">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold !text-dash-textMuted">Rule Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Auto-Enroll in Advanced CRM on Quiz Pass"
              className="w-full bg-dash-surface border border-dash-border rounded-lg px-3 py-2 text-sm outline-none focus:border-dash-accent !text-dash-text"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold !text-dash-textMuted">Trigger Event</label>
              <select
                value={triggerType}
                onChange={(e) => setTriggerType(e.target.value)}
                className="w-full bg-dash-surface border border-dash-border rounded-lg px-3 py-2 text-xs outline-none focus:border-dash-accent !text-dash-text"
              >
                {TRIGGERS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold !text-dash-textMuted">Action Response</label>
              <select
                value={actionType}
                onChange={(e) => setActionType(e.target.value)}
                className="w-full bg-dash-surface border border-dash-border rounded-lg px-3 py-2 text-xs outline-none focus:border-dash-accent !text-dash-text"
              >
                {ACTIONS.map((a) => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Trigger Config Block */}
          {(triggerType === "quiz_passed" || triggerType === "quiz_failed" || triggerType === "struggling_detected") && (
            <div className="bg-dash-surface p-4 rounded-lg border border-dash-border space-y-3">
              <h4 className="text-[10px] font-bold text-dash-accent">Trigger Settings</h4>
              {(triggerType === "quiz_passed" || triggerType === "quiz_failed") && (
                <div className="space-y-1">
                  <label className="text-[11px] !text-dash-textMuted">Minimum Score (%)</label>
                  <input
                    type="number"
                    value={minScore}
                    onChange={(e) => setMinScore(parseInt(e.target.value) || 0)}
                    className="w-full bg-white border border-dash-border rounded-lg px-3 py-1.5 text-xs outline-none !text-dash-text"
                    min={0}
                    max={100}
                  />
                </div>
              )}
              {triggerType === "struggling_detected" && (
                <div className="space-y-1">
                  <label className="text-[11px] !text-dash-textMuted">Struggle Score Threshold (Consecutive failures)</label>
                  <input
                    type="number"
                    value={struggleThreshold}
                    onChange={(e) => setStruggleThreshold(parseInt(e.target.value) || 3)}
                    className="w-full bg-white border border-dash-border rounded-lg px-3 py-1.5 text-xs outline-none !text-dash-text"
                    min={1}
                  />
                </div>
              )}
            </div>
          )}

          {/* Action Config Block */}
          <div className="bg-dash-surface p-4 rounded-lg border border-dash-border space-y-3">
            <h4 className="text-[10px] font-bold text-dash-accent">Action Settings</h4>
            
            {(actionType === "enroll_course" || actionType === "revoke_course") && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] !text-dash-textMuted">Select Course</label>
                  <select
                    value={targetCourseId}
                    onChange={(e) => setTargetCourseId(e.target.value)}
                    className="w-full bg-dash-surface border border-dash-border rounded-lg px-3 py-2 text-xs outline-none focus:border-dash-accent !text-dash-text"
                    required
                  >
                    <option value="">-- Choose Course --</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                </div>
                {actionType === "revoke_course" && (
                  <div className="space-y-1">
                    <label className="text-[11px] !text-dash-textMuted">Grace Period (Days)</label>
                    <input
                      type="number"
                      value={gracePeriod}
                      onChange={(e) => setGracePeriod(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full bg-white border border-dash-border rounded-lg px-3 py-1.5 text-xs outline-none !text-dash-text"
                      min={0}
                    />
                  </div>
                )}
              </div>
            )}

            {actionType === "add_tag" && (
              <div className="space-y-1">
                <label className="text-[11px] !text-dash-textMuted">Tag Name</label>
                <input
                  type="text"
                  value={tagName}
                  onChange={(e) => setTagName(e.target.value)}
                  placeholder="e.g. lead-pass-quiz"
                  className="w-full bg-white border border-dash-border rounded-lg px-3 py-2 text-xs outline-none !text-dash-text"
                  required
                />
              </div>
            )}

            {actionType === "send_email" && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] !text-dash-textMuted">Subject</label>
                  <input
                    type="text"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    placeholder="Subject line"
                    className="w-full bg-white border border-dash-border rounded-lg px-3 py-2 text-xs outline-none !text-dash-text"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] !text-dash-textMuted">Body</label>
                  <textarea
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    placeholder="Write email body..."
                    rows={3}
                    className="w-full bg-white border border-dash-border rounded-lg px-3 py-2 text-xs outline-none font-mono !text-dash-text"
                    required
                  />
                </div>
              </div>
            )}

            {actionType === "send_whatsapp" && (
              <div className="space-y-1">
                <label className="text-[11px] !text-dash-textMuted">WhatsApp Message</label>
                <textarea
                  value={whatsappMessage}
                  onChange={(e) => setWhatsappMessage(e.target.value)}
                  placeholder="WhatsApp message body..."
                  rows={3}
                  className="w-full bg-white border border-dash-border rounded-lg px-3 py-2 text-xs outline-none font-mono !text-dash-text"
                  required
                />
              </div>
            )}

            {actionType === "notify_instructor" && (
              <div className="space-y-1">
                <label className="text-[11px] !text-dash-textMuted">Instructor Name / Email</label>
                <input
                  type="text"
                  value={instructorId}
                  onChange={(e) => setInstructorId(e.target.value)}
                  placeholder="e.g. instructor@workspace.com"
                  className="w-full bg-white border border-dash-border rounded-lg px-3 py-2 text-xs outline-none !text-dash-text"
                  required
                />
              </div>
            )}

            {!(["enroll_course", "revoke_course", "add_tag", "send_email", "send_whatsapp", "notify_instructor"].includes(actionType)) && (
              <div className="text-[10px] !text-dash-textMuted italic">No configuration required for this action response.</div>
            )}

          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-dash-border">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg !text-dash-textMuted hover:bg-dash-surface text-[10px] font-bold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-dash-accent hover:bg-dash-accent/90 text-white rounded-lg text-[10px] font-bold px-5 transition-colors motion-reduce:transition-none"
            >
              {saving ? <Loader2 size={14} className="animate-spin motion-reduce:animate-none mr-2" /> : "Save Rule"}
            </Button>
          </div>

        </form>
      </div>
    </div>
  );
}
