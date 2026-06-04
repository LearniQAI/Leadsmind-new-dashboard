"use client";
import Link from "next/link";
import React, { useEffect, useState, useRef } from "react";
import useGlobalContext from "@/hooks/use-context";
import sidebarData from "@/data/sidebar-data";
import { usePathname } from "next/navigation";
import { useDashboardContext } from "../DashboardProvider";
import { X, ChevronDown, Activity, Target, Zap, Layers, BarChart3, Users, Settings } from "lucide-react";

const DashBoardSidebar = () => {
  const { isCollapse, setIsCollapse, sideMenuOpen, setSideMenuOpen } = useGlobalContext();
  const { enrichedWorkspace, role, permissions } = useDashboardContext() as any;
  const [linkId, setlinkId] = useState<number | null>(null);
  const pathName = usePathname();
  const sidebarRef = useRef<HTMLDivElement>(null);

  const handleClick = (id: number) => {
    setlinkId(linkId === id ? null : id);
  };

  useEffect(() => {
    const findLayerIds = () => {
      let foundFirstLayerId = null;
      sidebarData.forEach((category) => {
        category.items.forEach((item) => {
          if (item.link === pathName) {
            foundFirstLayerId = item.id;
          } else if (item.subItems) {
            item.subItems.forEach((subItem) => {
              if (subItem.link === pathName) {
                foundFirstLayerId = item.id;
              }
            });
          }
        });
      });
      setlinkId(foundFirstLayerId);
    };
    findLayerIds();

    if (window.innerWidth < 1200) {
      setSideMenuOpen(false);
    }
  }, [pathName, setSideMenuOpen]);

  useEffect(() => {
    const saved = sessionStorage.getItem('sidebar-scroll');
    if (saved && sidebarRef.current) {
      sidebarRef.current.scrollTop = parseInt(saved);
    }
  }, []);

  // Force full width on mobile
  const sidebarWidth = sideMenuOpen ? "w-[280px]" : (isCollapse ? "w-[80px]" : "w-[280px]");

  return (
    <>
      {/* Mobile Sidebar Overlay */}
      {sideMenuOpen && (
        <div
          onClick={() => setSideMenuOpen(false)}
          className="fixed inset-0 bg-n900/95 backdrop-blur-md z-[1000] lg:hidden animate-in fade-in duration-300"
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full bg-n900 border-r border-white/5 z-[1000] transition-all duration-300 ease-in-out flex flex-col ${sidebarWidth} ${sideMenuOpen ? "translate-x-0 shadow-2xl shadow-black" : "-translate-x-full lg:translate-x-0"
          }`}
      >
        {/* Logo Area */}
        <div className={`h-[70px] flex items-center px-6 border-b border-white/5 flex-shrink-0 ${isCollapse && !sideMenuOpen ? "justify-center" : "justify-between"}`}>
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent to-accent2 flex items-center justify-center shadow-lg shadow-accent/20 flex-shrink-0">
              <Zap size={20} className="text-white fill-white" />
            </div>
            {(!isCollapse || sideMenuOpen) && (
              <div className="flex flex-col min-w-0">
                <span className="text-[15px] font-space font-black text-t1 tracking-tighter truncate leading-none">LEADSMIND</span>
                <span className="text-[9px] font-black text-accent2 tracking-[0.2em] uppercase opacity-80 mt-0.5">Operating System</span>
              </div>
            )}
          </Link>
          {sideMenuOpen && (
            <button onClick={() => setSideMenuOpen(false)} className="lg:hidden w-8 h-8 flex items-center justify-center bg-white/5 rounded-lg text-t3 hover:text-t1 transition-colors">
              <X size={18} />
            </button>
          )}
        </div>

        {/* Navigation */}
        <div
          ref={sidebarRef}
          onScroll={(e) => {
            sessionStorage.setItem('sidebar-scroll', String((e.target as HTMLDivElement).scrollTop));
          }}
          className="flex-1 overflow-y-auto no-scrollbar py-6 px-4 space-y-8"
        >
          {sidebarData.map((category) => {
            // Filter items in category based on permissions
            const filteredItems = category.items.filter(item => {
              if (role === 'admin' || role === 'owner') return true;
              
              // Special case: HR & Payroll is allowed for hr and payroll roles
              if (item.link === '/hr' && (role === 'hr' || role === 'payroll')) {
                return true;
              }

              // Use the permission key from sidebarData
              const requiredPermission = item.permission;
              if (!requiredPermission) return true; // Items without explicit permission are public or basic

              return permissions.includes(requiredPermission);
            });

            if (filteredItems.length === 0) return null;

            return (
              <div key={category.id} className="space-y-2">
                {(!isCollapse || sideMenuOpen) && (
                  <h5 className="px-3 text-[9px] font-black uppercase tracking-[0.25em] text-t4">
                    {category.category}
                  </h5>
                )}
                <div className="space-y-1">
                  {filteredItems.map((item) => {
                    const isActive = pathName === item.link || (linkId === item.id && item.subItems);
                    return (
                      <div key={item.id} className="relative">
                        <Link
                          onClick={(e) => {
                            if (item.subItems?.length) {
                              e.preventDefault();
                              handleClick(item.id);
                            }
                          }}
                          href={item.link || "#"}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative ${isActive
                            ? "bg-accent/10 text-accent2 shadow-sm shadow-accent/5"
                            : "text-t2 hover:bg-white/[0.03] hover:text-t1"
                            } ${isCollapse && !sideMenuOpen ? "justify-center px-0" : ""}`}
                        >
                          {isActive && !isCollapse && <div className="absolute left-[-4px] top-3 bottom-3 w-[4px] bg-accent rounded-r-full shadow-[2px_0_10px_rgba(37,99,235,0.4)]"></div>}
                          <div className={`flex-shrink-0 w-6 flex items-center justify-center ${isActive ? "text-accent2" : "text-t3 group-hover:text-t2"}`}>
                            <i className={`${item.icon} text-[15px]`}></i>
                          </div>
                          {(!isCollapse || sideMenuOpen) && (
                            <>
                              <span className="text-[13px] font-bold flex-1 truncate">{item.label}</span>
                              {item.subItems && (
                                <ChevronDown
                                  size={14}
                                  className={`transition-transform duration-200 opacity-40 group-hover:opacity-100 ${linkId === item.id ? "rotate-180" : ""}`}
                                />
                              )}
                            </>
                          )}
                        </Link>

                        {item.subItems && (!isCollapse || sideMenuOpen) && linkId === item.id && (
                          <div className="mt-1 ml-4 border-l border-white/5 space-y-1 animate-in slide-in-from-top-2 duration-200">
                            {item.subItems
                              .filter(sub => {
                                if (role === 'admin' || role === 'owner') return true;
                                if (sub.link === '/hr/employees') {
                                  return role === 'hr';
                                }
                                if (sub.link === '/hr/payroll') {
                                  return role === 'hr' || role === 'payroll';
                                }
                                return true;
                              })
                              .map((sub, idx) => (
                                <Link
                                  key={idx}
                                  href={sub.link || "/"}
                                  className={`text-[12px] py-1.5 pl-6 pr-4 flex items-center transition-all rounded-r-lg ${pathName === sub.link ? "text-t1 font-bold bg-white/[0.02]" : "text-t3 hover:text-t1 hover:bg-white/[0.01]"
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
              </div>
            );
          })}
        </div>

        {/* Sidebar Bottom */}
        <div className="p-4 border-t border-white/5 bg-white/[0.01] hidden lg:block">
          <button
            onClick={() => setIsCollapse(!isCollapse)}
            className={`w-full flex items-center gap-3 py-2.5 rounded-xl hover:bg-white/5 text-t3 hover:text-t1 transition-all ${isCollapse ? "justify-center" : "px-4"}`}
          >
            <div className="w-6 flex items-center justify-center">
              <i className={`fa-solid fa-angles-${isCollapse ? "right" : "left"} text-xs`}></i>
            </div>
            {!isCollapse && <span className="text-[11px] font-black uppercase tracking-widest">Collapse Menu</span>}
          </button>
        </div>
      </aside>
    </>
  );
};

export default DashBoardSidebar;
