"use client";

import React from "react";
import { Switch } from "@/components/ui/switch";
import { PropertyGroup, SliderWithInput } from "@/components/builder/inspector/primitives";
import type { ModuleQuizRules } from "@/app/actions/moduleQuizzes";

// The grading / pacing / completion rules of a module's quizzes, rendered by the module quiz
// settings page (the only place they are edited). The fields are exactly the ones the student
// side enforces (see lib/lms/moduleQuizSettings.ts).

export const DEFAULT_QUIZ_RULES: ModuleQuizRules = {
  passPercentage: 70,
  timeLimitMinutes: 0,
  maxAttempts: -1,
  randomizeQuestions: false,
  isRequired: true,
};

const toggleCard = "flex items-center justify-between gap-3 rounded-xl border border-dash-border bg-dash-surface p-4";
const switchCls = "shrink-0 data-[state=checked]:bg-dash-accent data-[state=unchecked]:bg-dash-border";

function ToggleRow({
  title,
  hint,
  checked,
  onChange,
}: {
  title: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className={toggleCard}>
      <div className="min-w-0">
        <span className="block text-[12.5px] font-semibold !text-dash-text">{title}</span>
        <span className="mt-0.5 block text-[11px] leading-relaxed !text-dash-textMuted">{hint}</span>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={title} className={switchCls} />
    </div>
  );
}

interface QuizRulesFieldsProps {
  value: ModuleQuizRules;
  onChange: (next: ModuleQuizRules) => void;
}

export default function QuizRulesFields({ value, onChange }: QuizRulesFieldsProps) {
  const set = (patch: Partial<ModuleQuizRules>) => onChange({ ...value, ...patch });
  const unlimited = value.maxAttempts === -1;

  return (
    <div className="space-y-6">
      <PropertyGroup title="Grading & pacing">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <SliderWithInput
            label="Passing score"
            value={value.passPercentage}
            onChange={(v) => set({ passPercentage: Number(v) })}
            min={0}
            max={100}
            unit="%"
            numeric
          />
          <SliderWithInput
            label="Time limit"
            value={value.timeLimitMinutes}
            onChange={(v) => set({ timeLimitMinutes: Number(v) })}
            min={0}
            max={180}
            unit=" min"
            numeric
          />
        </div>
        <p className="-mt-1 text-[11px] leading-relaxed !text-dash-textMuted/90">
          Time limit <span className="font-medium">0</span> = no limit. When time runs out, the student&apos;s answers so far are submitted automatically.
        </p>

        <div className="space-y-3">
          <ToggleRow
            title="Unlimited attempts"
            hint="Students can retake the quiz as many times as they need"
            checked={unlimited}
            onChange={(on) => set({ maxAttempts: on ? -1 : 3 })}
          />
          {!unlimited && (
            <SliderWithInput
              label="Max attempts"
              value={value.maxAttempts}
              onChange={(v) => set({ maxAttempts: Math.max(1, Number(v)) })}
              min={1}
              max={20}
              unit=""
              numeric
            />
          )}
        </div>
      </PropertyGroup>

      <PropertyGroup title="Delivery & completion">
        <ToggleRow
          title="Shuffle questions"
          hint="Each attempt shows the questions in a different order"
          checked={value.randomizeQuestions}
          onChange={(v) => set({ randomizeQuestions: v })}
        />
        <ToggleRow
          title="Required for completion"
          hint="Students must pass this quiz to complete the course"
          checked={value.isRequired}
          onChange={(v) => set({ isRequired: v })}
        />
      </PropertyGroup>
    </div>
  );
}
