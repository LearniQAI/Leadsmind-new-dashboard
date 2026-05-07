"use client";
import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import sidebarMainLogo from "../../../../public/assets/images/logo/logo.svg";
import sidebarDarkLogo from "../../../../public/assets/images/logo/logo-white.svg";
import useGlobalContext from "@/hooks/use-context";
import sidebarImg from "../../../../public/assets/images/bg/side-bar.png";
import sidebarData from "@/data/sidebar-data";
import { usePathname } from "next/navigation";

import { useDashboardContext } from "../DashboardProvider";

const DashBoardSidebar = () => {
  const { isCollapse, setIsCollapse } = useGlobalContext();
  const { user, enrichedWorkspace, role } = useDashboardContext();
  const [linkId, setlinkId] = useState<number | null>(null);
  const [linkIdTwo, setlinkIdTwo] = useState<number | null>(null);
  const [linkIdThree, setlinkIdThree] = useState<number | null>(null);
  const [linkIdFour, setlinkIdFour] = useState<number | null>(null);
  const pathName = usePathname(); // Current route

  // Utility function to handle collapse behavior for screens with max-width: 1199px
  const handleCollapse = (shouldCollapse: boolean) => {
    if (window.matchMedia("(max-width: 1199px)").matches) {
      setIsCollapse(shouldCollapse);
    }
  };

  const handleClick = (id: number) => {
    if (linkId === id) {
      setlinkId(null);
      handleCollapse(true);
    } else {
      setlinkId(id);
      setlinkIdTwo(null);
      setlinkIdThree(null);
      setlinkIdFour(null);
      handleCollapse(true); // Expand when opening
    }
  };

  const handleClickTwo = (id: number) => {
    if (linkIdTwo === id) {
      setlinkIdTwo(null);
      handleCollapse(true); // Collapse when closing
    } else {
      setlinkIdTwo(id);
      setlinkIdThree(null);
      setlinkIdFour(null);
      handleCollapse(true); // Expand when opening
    }
  };

  const handleClickThree = (id: number) => {
    if (linkIdThree === id) {
      setlinkIdThree(null);
      handleCollapse(true); // Collapse when closing
    } else {
      setlinkIdThree(id);
      setlinkIdFour(null);
      handleCollapse(true); // Expand when opening
    }
  };

  const handleClickFour = (id: number) => {
    if (linkIdFour === id) {
      setlinkIdFour(null);
      handleCollapse(true); // Collapse when closing
    } else {
      setlinkIdFour(id);
      handleCollapse(true); // Expand when opening
    }
  };

  // UseEffect to find and set the active menu based on the current path
  useEffect(() => {
    const findLayerIds = () => {
      let foundFirstLayerId = null;
      let foundSecondLayerId = null;
      let foundThirdLayerId = null;

      // Iterate through sidebarData to find the object that matches the pathName
      sidebarData.forEach((category) => {
        category.items.forEach((item) => {
          // Check if the current pathName matches the link of the first level
          if (item.link === pathName) {
            foundFirstLayerId = item.id; // First Layer ID
            foundSecondLayerId = null; // Reset second-level ID
            foundThirdLayerId = null; // Reset third-level ID
          } else if (item.subItems) {
            // Check within subItems recursively for the second layer
            item.subItems.forEach((subItem, subItemIndex) => {
              if (subItem.link === pathName) {
                foundFirstLayerId = item.id; // First Layer ID
                foundSecondLayerId = subItemIndex; // Second Layer ID
                foundThirdLayerId = null; // Reset third-level ID
              } else if (subItem.subItems) {
                subItem.subItems.forEach((thirdSubMenu, thirdSubIndex) => {
                  if (thirdSubMenu.link === pathName) {
                    foundFirstLayerId = item.id; // First Layer ID
                    foundSecondLayerId = subItemIndex; // Second Layer ID
                    foundThirdLayerId = thirdSubIndex; // Third Layer ID
                  }
                });
              }
            });
          }
        });
      });

      // Set the found ids in state
      setlinkId(foundFirstLayerId);
      setlinkIdTwo(foundSecondLayerId);
      setlinkIdThree(foundThirdLayerId);
    };

    // Call the function to find the matching object when pathName changes
    findLayerIds();
  }, [pathName]); // Re-run the effect whenever pathName changes

  return (
    <>
      <div
        className={`app-sidebar ${isCollapse ? "collapsed close_sidebar" : ""}`}
      >
        <div className="main-sidebar-header !h-[80px] !py-0 !px-4 border-b border-white/5 bg-[#0b0b14] flex flex-col items-center justify-center shadow-lg shadow-black/20">
          <Link href="/" className="flex items-center justify-center w-full group mt-1">
            <div className="relative w-40 h-10 overflow-hidden">
               <Image 
                 src="/assets/images/brand/LeadsMind_Logo.png.png" 
                 alt="LeadsMind" 
                 fill
                 className="object-contain brightness-0 invert"
                 priority
               />
            </div>
          </Link>
          {enrichedWorkspace?.name && (
            <div className="flex items-center gap-1.5 mt-1 px-1">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(19,89,255,0.8)]" />
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40 truncate max-w-[180px]">
                {enrichedWorkspace.name}
              </span>
            </div>
          )}
        </div>

        <div className="common-scrollbar max-h-screen overflow-y-auto">
          <div className="px-6 py-6">
            <Link href="/contacts/new">
              <Button className="w-full bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest h-12 shadow-lg shadow-primary/20 border-none group">
                <span className="flex items-center gap-2">
                  <i className="fa-light fa-plus text-lg" />
                  New Contact
                </span>
              </Button>
            </Link>
          </div>

          <nav className="main-menu-container nav nav-pills flex-column sub-open">
            <ul className="main-menu" style={{ display: "block" }}>
              {sidebarData.map((category) => (
                <React.Fragment key={category.id}>
                  <li className="sidebar__menu-category !px-6 !py-4 !my-2 sticky top-0 z-[5] bg-[#0A0F3D]/50 backdrop-blur-md border-y border-white/5">
                    <span className="category-name text-[10px] font-black uppercase tracking-[0.3em] text-white/30">{category.category}</span>
                  </li>
                  {category.items.map((item) => (
                    <li
                      key={item.id}
                      className={
                        item.subItems?.length
                          ? `slide has-sub ${linkId === item.id ? "open" : ""}` // Toggle based on first-level active state
                          : ""
                      }
                    >
                      <Link
                        // onClick={() => handleClick(item.id)}
                        onClick={(e) => {
                          if (!item.link || item.link === "#") {
                            e.preventDefault(); // Prevent navigation when the link is "#"
                          }
                          handleClick(item.id); // Handle the menu toggle
                        }}
                        href={item.link || "#"}
                        className={`sidebar__menu-item ${
                          linkId === item.id ? "active" : ""
                        }`}
                      >
                        {item.icon && (
                          <div className="side-menu__icon">
                            <i className={item.icon}></i>
                          </div>
                        )}
                        <span className="sidebar__menu-label">
                          {item.label}
                        </span>
                        {item.subItems && (
                          <i className="fa-regular fa-angle-down side-menu__angle"></i>
                        )}
                      </Link>

                      {item.subItems && (
                        <ul
                          className={
                            linkId === item.id
                              ? `sidebar-menu child1 active submenu-visible`
                              : `sidebar-menu child1`
                          }
                          style={{
                            display: linkId === item.id ? "block" : "none",
                          }}
                        >
                          {item.subItems.map((subOne, index) => (
                            <li
                              key={index}
                              className={`slide has-sub ${
                                linkIdTwo === index ? "open" : ""
                              }`}
                            >
                              <Link
                                onClick={() => handleClickTwo(index)}
                                href={subOne.link || "/"}
                                className={`sidebar__menu-item ${
                                  linkIdTwo === index ? "active" : ""
                                }`}
                              >
                                {subOne.label}
                                {subOne.subItems && (
                                  <i className="fa-regular fa-angle-down side-menu__angle"></i>
                                )}
                              </Link>
                              {subOne.subItems && (
                                <ul
                                  className="sidebar-menu child2"
                                  style={{
                                    display:
                                      linkIdTwo === index ? "block" : "none",
                                  }}
                                >
                                  {subOne.subItems.map((subTwo, subIndex) => (
                                    <li
                                      key={subIndex}
                                      className={`slide has-sub ${
                                        linkIdThree === subIndex ? "open" : ""
                                      }`}
                                    >
                                      <Link
                                        onClick={() =>
                                          handleClickThree(subIndex)
                                        }
                                        href={subTwo.link || "#"}
                                        className={`sidebar__menu-item ${
                                          linkIdThree === subIndex
                                            ? "active"
                                            : ""
                                        }`}
                                      >
                                        {subTwo.label}
                                        {subTwo.subItems && (
                                          <i className="fa-regular fa-angle-down side-menu__angle"></i>
                                        )}
                                      </Link>
                                      {subTwo.subItems && (
                                        <ul
                                          className="sidebar-menu child3"
                                          style={{
                                            display:
                                              linkIdThree === subIndex
                                                ? "block"
                                                : "none",
                                          }}
                                        >
                                          {subTwo.subItems.map(
                                            (subThree, subThreeIndex) => (
                                              <li
                                                key={subThreeIndex}
                                                className={`slide ${
                                                  subThree.subItems
                                                    ? "has-sub"
                                                    : ""
                                                }`}
                                              >
                                                <Link
                                                  href={subThree.link || "#"}
                                                  className="sidebar__menu-item"
                                                >
                                                  {subThree.label}
                                                </Link>
                                              </li>
                                            )
                                          )}
                                        </ul>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                              )}
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

          <div
            className="sidebar__thumb sidebar-bg"
            style={{ backgroundImage: `url(${sidebarImg.src})` }}
          >
            <div className="sidebar__thumb-content">
              <p className="sidebar__thumb-title">
                Upgrade to PRO to get access all Features!
              </p>
              <Link
                href="/pro"
                className="btn btn-white-primary rounded-[50rem] w-full"
              >
                Get Pro Now!
              </Link>
            </div>
          </div>
        </div>
      </div>
      <div className="app__offcanvas-overlay"></div>
      <div
        onClick={() => setIsCollapse(false)}
        className={`app__offcanvas-overlay ${isCollapse ? "overlay-open" : ""}`}
      ></div>
    </>
  );
};

export default DashBoardSidebar;
