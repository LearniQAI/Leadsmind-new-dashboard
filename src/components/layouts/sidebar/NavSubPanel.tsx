"use client";
import React, { useEffect, useState } from "react";
import { NavModule } from "@/interface";
import NavItemsList from "./NavItemsList";

interface NavSubPanelProps {
  module: NavModule | undefined;
  pathname: string;
  activeItemId?: number;
}

const NavSubPanel: React.FC<NavSubPanelProps> = ({ module, pathname, activeItemId }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(false);
    const raf = requestAnimationFrame(() => setIsVisible(true));
    return () => cancelAnimationFrame(raf);
  }, [module?.id]);

  if (!module?.items) return null;

  return (
    <div
      key={module.id}
      className={`hidden lg:flex flex-col w-[220px] flex-shrink-0 h-full bg-dash-surface border-r border-dash-border
        transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none motion-reduce:transform-none
        ${isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-1"}`}
    >
      <div className="h-[70px] flex items-center px-5 border-b border-dash-border flex-shrink-0">
        <h2 className="text-[13px] font-black uppercase tracking-wider !text-dash-text truncate">
          {module.label}
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto no-scrollbar py-4 px-3">
        <NavItemsList items={module.items} pathname={pathname} activeItemId={activeItemId} />
      </div>
    </div>
  );
};

export default NavSubPanel;
