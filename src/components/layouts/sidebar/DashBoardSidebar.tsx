"use client";
import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import useGlobalContext from "@/hooks/use-context";
import sidebarData from "@/data/sidebar-data";
import { usePathname } from "next/navigation";
import { useDashboardContext } from "../DashboardProvider";

const DashBoardSidebar = () => {
 const { isCollapse, setIsCollapse } = useGlobalContext();
 const { enrichedWorkspace } = useDashboardContext();
 const [linkId, setlinkId] = useState<number | null>(null);
 const [linkIdTwo, setlinkIdTwo] = useState<number | null>(null);
 const [linkIdThree, setlinkIdThree] = useState<number | null>(null);
 const pathName = usePathname();

 const handleCollapse = (shouldCollapse: boolean) => {
  if (window.matchMedia("(max-width: 1199px)").matches) {
   setIsCollapse(shouldCollapse);
  }
 };

 const handleClick = (id: number) => {
  if (linkId === id) {
   setlinkId(null);
  } else {
   setlinkId(id);
   setlinkIdTwo(null);
   setlinkIdThree(null);
  }
 };

 const handleClickTwo = (id: number) => {
  if (linkIdTwo === id) {
   setlinkIdTwo(null);
  } else {
   setlinkIdTwo(id);
   setlinkIdThree(null);
  }
 };

 useEffect(() => {
  const findLayerIds = () => {
   let foundFirstLayerId = null;
   let foundSecondLayerId = null;
   let foundThirdLayerId = null;

   sidebarData.forEach((category) => {
    category.items.forEach((item) => {
     if (item.link === pathName) {
      foundFirstLayerId = item.id;
     } else if (item.subItems) {
      item.subItems.forEach((subItem, subItemIndex) => {
       if (subItem.link === pathName) {
        foundFirstLayerId = item.id;
        foundSecondLayerId = subItemIndex;
       } else if (subItem.subItems) {
        subItem.subItems.forEach((thirdSubMenu, thirdSubIndex) => {
         if (thirdSubMenu.link === pathName) {
          foundFirstLayerId = item.id;
          foundSecondLayerId = subItemIndex;
          foundThirdLayerId = thirdSubIndex;
         }
        });
       }
      });
     }
    });
   });

   setlinkId(foundFirstLayerId);
   setlinkIdTwo(foundSecondLayerId);
   setlinkIdThree(foundThirdLayerId);
  };

  findLayerIds();
 }, [pathName]);

 return (
  <>
   <div className={`app-sidebar ${isCollapse ? "collapsed close_sidebar" : ""}`}>
    {/* Logo Area */}
    <div className="sidebar-logo-area py-6 px-6 border-b border-white/5 mb-2">
     <Link href="/" className="flex items-center gap-3 group">
      <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center shadow-lg shadow-accent/20">
       <i className="fa-solid fa-bolt text-white text-sm"></i>
      </div>
      {!isCollapse && (
       <div className="flex flex-col">
        <span className="text-sm font-space font-bold text-t1 tracking-tight">LEADSMIND</span>
        <span className="text-[10px] font-bold text-accent2 tracking-widest uppercase opacity-80">OS</span>
       </div>
      )}
     </Link>
    </div>

    <div className="common-scrollbar max-h-[calc(100vh-100px)] overflow-y-auto">
     <nav className="main-menu-container">
      <ul className="main-menu">
       {sidebarData.map((category) => (
        <React.Fragment key={category.id}>
         {!isCollapse && (
          <li className="sidebar__menu-category">
           <span className="category-name">{category.category}</span>
          </li>
         )}
         {category.items.map((item) => (
          <li
           key={item.id}
           className={`slide ${item.subItems?.length ? "has-sub" : ""} ${linkId === item.id ? "open" : ""}`}
          >
           <Link
            onClick={(e: React.MouseEvent) => {
             if (!item.link || item.link === "#") {
              e.preventDefault();
             }
             handleClick(item.id);
            }}
            href={item.link || "#"}
            className={`sidebar__menu-item ${linkId === item.id ? "active" : ""}`}
           >
            {item.icon && (
             <div className="side-menu__icon">
              <i className={`fa-solid ${item.icon}`}></i>
             </div>
            )}
            {!isCollapse && (
             <>
              <span className="sidebar__menu-label flex-1">{item.label}</span>
              {item.subItems && (
               <i className={`fa-solid fa-chevron-down text-[10px] transition-transform duration-200 ${linkId === item.id ? "rotate-180" : ""}`}></i>
              )}
             </>
            )}
           </Link>

           {item.subItems && !isCollapse && (
            <ul
             className="sidebar-submenu"
             style={{ display: linkId === item.id ? "block" : "none" }}
            >
             {item.subItems.map((subOne, index) => (
              <li key={index} className="pl-9 pr-4 py-1">
               <Link
                href={subOne.link || "/"}
                className={`text-[12.5px] py-1.5 flex items-center gap-2 transition-colors duration-150 ${pathName === subOne.link ? "text-t1 font-semibold" : "text-t3 hover:text-t1"}`}
               >
                <div className={`w-1 h-1 rounded-full ${pathName === subOne.link ? "bg-accent" : "bg-t4"}`}></div>
                {subOne.label}
               </Link>
              </li>
             ))}
            </ul>
           )}
          </li>
         ))}
        </React.Fragment>
       ))}
      </ul>
     </nav>
    </div>
    
    {/* Sidebar Bottom Toggle */}
    <div className="mt-auto p-4 border-t border-white/5">
     <button 
      onClick={() => setIsCollapse(!isCollapse)}
      className="w-full flex items-center justify-center py-2 text-t3 hover:text-t1 transition-colors"
     >
      <i className={`fa-solid fa-angles-${isCollapse ? "right" : "left"} text-sm`}></i>
     </button>
    </div>
   </div>
   <div 
    onClick={() => setIsCollapse(false)}
    className={`app__offcanvas-overlay ${!isCollapse ? "overlay-open" : ""}`}
   ></div>
  </>
 );
};

export default DashBoardSidebar;
