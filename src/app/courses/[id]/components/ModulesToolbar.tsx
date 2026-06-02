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
    <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-[#080f28] border border-white/5 rounded-2xl p-4">
      <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
        {(["All", "draft", "published", "coming_soon"] as const).map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border shrink-0 ${activeFilter === filter
                ? "bg-primary/10 text-primary border-primary/20"
                : "bg-white/5 text-white/40 border-transparent hover:text-white/60"
              }`}
          >
            {filter}
          </button>
        ))}
      </div>

      <div className="flex items-center bg-white/5 border border-white/5 rounded-xl px-4 py-2 w-full md:max-w-xs focus-within:border-primary transition-all">
        <Search size={14} className="text-white/20 mr-2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search module node..."
          className="bg-transparent border-none outline-none text-xs text-white placeholder:text-white/20 w-full"
        />
      </div>
    </div>
  );
}
