"use client";

import React, { useEffect, useRef, useState } from "react";
import Editor, { loader } from "@monaco-editor/react";
import { AlertCircle, ShieldCheck } from "lucide-react";
import type { ContentBlock } from "../ContentBlockList";
import { PropertyGroup } from "@/components/builder/inspector/primitives";
import { SandboxedHtml } from "@/components/lms/SandboxedHtml";

// Same CDN worker recipe the builder's Custom Code block uses — avoids local worker
// bundling conflicts in this nested route.
if (typeof window !== "undefined") {
  loader.config({ paths: { vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.43.0/min/vs" } });
}

class MonacoErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="h-[320px] w-full flex flex-col items-center justify-center bg-dash-surface rounded-xl border border-red-500/20 text-center p-6 gap-2">
          <AlertCircle className="w-7 h-7 text-red-500 opacity-50" />
          <h4 className="text-xs font-bold !text-dash-text">Editor failed to load</h4>
          <p className="text-[10px] !text-dash-textMuted leading-relaxed max-w-[220px]">
            The code editor worker hit a conflict. Refresh the page to retry.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

interface HtmlCodeBlockEditorProps {
  block: ContentBlock;
  onChange: (patch: Partial<ContentBlock>) => void;
}

const DEBOUNCE_MS = 500;

export default function HtmlCodeBlockEditor({ block, onChange }: HtmlCodeBlockEditorProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [code, setCode] = useState<string>(block.content?.html || "");
  // Debounced value that actually drives the sandboxed preview + the persisted patch, so
  // the iframe isn't torn down and rebuilt on every keystroke.
  const [committed, setCommitted] = useState<string>(block.content?.html || "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setCommitted(code);
      if (code !== (block.content?.html || "")) {
        onChange({ content: { ...block.content, html: code } });
      }
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  return (
    <div className="space-y-5">
      <PropertyGroup title="HTML">
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold !text-dash-textMuted flex items-center justify-between">
            <span>Raw HTML</span>
            <span className="text-primary">● Live preview</span>
          </label>
          <div className="rounded-xl overflow-hidden border border-dash-border h-[320px] bg-[#1e1e1e]">
            {isMounted ? (
              <MonacoErrorBoundary>
                <Editor
                  height="100%"
                  defaultLanguage="html"
                  theme="vs-dark"
                  value={code}
                  loading={
                    <div className="h-full w-full bg-zinc-900 animate-pulse motion-reduce:animate-none flex items-center justify-center text-[10px] text-white/20 font-bold">
                      Initializing editor...
                    </div>
                  }
                  onChange={(value) => setCode(value ?? "")}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 12,
                    lineNumbers: "on",
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    padding: { top: 16, bottom: 16 },
                    wordWrap: "on",
                  }}
                />
              </MonacoErrorBoundary>
            ) : (
              <div className="h-full w-full bg-zinc-900 animate-pulse motion-reduce:animate-none rounded-xl" />
            )}
          </div>
          <div className="flex items-start gap-1.5 text-[10px] !text-dash-textMuted">
            <ShieldCheck size={12} className="shrink-0 mt-0.5 text-green" />
            Rendered only inside a locked-down <code className="font-mono">sandbox="allow-scripts"</code> iframe
            (no <code className="font-mono">allow-same-origin</code>) — pasted scripts run in an isolated origin
            and cannot read cookies, storage, or act as the logged-in user.
          </div>
        </div>
      </PropertyGroup>

      <PropertyGroup title="Live Preview">
        {committed.trim() ? (
          <SandboxedHtml
            html={committed}
            className="rounded-lg overflow-hidden border border-dash-border h-[360px] bg-white"
            title="HTML block preview"
          />
        ) : (
          <div className="text-[10px] !text-dash-textMuted py-6 text-center border border-dashed border-dash-border rounded-xl">
            Type or paste HTML above to see it rendered
          </div>
        )}
      </PropertyGroup>
    </div>
  );
}
