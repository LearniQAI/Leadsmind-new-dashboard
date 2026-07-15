"use client";

import React from "react";
import { Search } from "lucide-react";

interface ModulesToolbarProps {
  activeFilter: "All" | "draft" | "published" | "coming_soon";
  setActiveFilter: (filter: "All" | "draft" | "published" | "coming_soon") => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
}

export default function ModulesToolbar({
  activeFilter,
  setActiveFilter,
  searchTerm,
  setSearchTerm
}: ModulesToolbarProps) {
  return (
    <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white border border-dash-border rounded-2xl p-4 shadow-sm">
      <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
        {(["All", "draft", "published", "coming_soon"] as const).map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`px-4 py-2 rounded-xl text-[10px] font-bold capitalize transition-all motion-reduce:transition-none border shrink-0 ${activeFilter === filter
                ? "bg-primary/10 text-primary border-primary/20"
                : "bg-dash-surface !text-dash-textMuted border-transparent hover:!text-dash-text"
              }`}
          >
            {filter}
          </button>
        ))}
      </div>

      <div className="flex items-center bg-dash-surface border border-dash-border rounded-xl px-4 py-2 w-full md:max-w-xs focus-within:border-primary transition-all motion-reduce:transition-none">
        <Search size={14} className="!text-dash-textMuted mr-2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search module node..."
          className="bg-transparent border-none outline-none text-xs !text-dash-text placeholder:!text-dash-textMuted w-full"
        />
      </div>
    </div>
  );
}
