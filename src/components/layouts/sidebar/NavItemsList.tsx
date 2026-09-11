"use client";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { NavItem } from "@/interface";
import { level2Content, level2LenaQuestion } from "@/data/sidebar-hover-content";
import HoverInfoTrigger from "./hover-info/HoverInfoTrigger";

interface NavItemsListProps {
  items: NavItem[];
  pathname: string;
  activeItemId?: number;
  onNavigate?: () => void;
  /** Parent module label (e.g. "CRM & Sales") — used for the Level 2 hover card's LENA question. */
  moduleLabel?: string;
}

const NavItemsList: React.FC<NavItemsListProps> = ({ items, pathname, activeItemId, onNavigate, moduleLabel }) => {
  const [expandedId, setExpandedId] = useState<number | null>(activeItemId ?? null);

  useEffect(() => {
    setExpandedId(activeItemId ?? null);
  }, [activeItemId]);

  return (
    <div className="space-y-1">
      {items.map((item) => {
        const isActive =
          pathname === item.link || (item.subItems?.some((sub) => sub.link === pathname) ?? false);

        const hoverDescription = item.link ? level2Content[item.link] : undefined;

        return (
          <div key={item.id}>
            <div className="flex items-center gap-0.5">
              <Link
                href={item.link || "#"}
                onClick={(e) => {
                  if (item.subItems?.length) {
                    e.preventDefault();
                    setExpandedId(expandedId === item.id ? null : item.id);
                  } else {
                    onNavigate?.();
                  }
                }}
                className={`flex-1 min-w-0 flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-150 group ${
                  isActive
                    ? "bg-dash-accent/10 text-dash-accent font-bold"
                    : "text-dash-textMuted hover:bg-dash-accent/5 hover:text-dash-text"
                }`}
              >
                <div className="flex-shrink-0 w-5 flex items-center justify-center">
                  <i className={`${item.icon} text-[13px]`}></i>
                </div>
                <span className="text-[13px] flex-1 truncate">{item.label}</span>
                {item.subItems && (
                  <ChevronDown
                    size={13}
                    className={`opacity-50 transition-transform duration-200 ${
                      expandedId === item.id ? "rotate-180" : ""
                    }`}
                  />
                )}
              </Link>
              {hoverDescription && (
                <HoverInfoTrigger
                  className="w-6 h-6 mr-0.5"
                  content={{
                    level: 2,
                    icon: item.icon,
                    title: item.label,
                    description: hoverDescription,
                    lenaQuestion: level2LenaQuestion(moduleLabel || "", item.label),
                  }}
                />
              )}
            </div>

            {item.subItems && expandedId === item.id && (
              <div className="ml-4 mt-1 border-l border-dash-border space-y-0.5">
                {item.subItems.map((sub) => (
                  <Link
                    key={sub.link}
                    href={sub.link}
                    onClick={() => onNavigate?.()}
                    className={`block text-[12px] py-1.5 pl-4 pr-3 rounded-r-lg transition-colors ${
                      pathname === sub.link
                        ? "text-dash-accent font-bold bg-dash-accent/5"
                        : "text-dash-textMuted hover:text-dash-text hover:bg-dash-surface"
                    }`}
                  >
                    {sub.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default NavItemsList;
