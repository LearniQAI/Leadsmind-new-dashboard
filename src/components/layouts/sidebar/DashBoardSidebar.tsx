"use client";
import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useState } from "react";
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
        <div className="main-sidebar-header">
          <Link href="/" className="header-logo">
            <Image
              className="main-logo"
              src={enrichedWorkspace?.branding?.logoUrl || enrichedWorkspace?.logoUrl || sidebarMainLogo}
              width={150}
              height={40}
              priority
              alt="logo"
            />
            <Image
              className="dark-logo"
              src={enrichedWorkspace?.branding?.logoUrl || enrichedWorkspace?.logoUrl || sidebarDarkLogo}
              width={150}
              height={40}
              priority
              alt="logo"
            />
          </Link>
        </div>

        <div className="common-scrollbar max-h-screen overflow-y-auto">
          <nav className="main-menu-container nav nav-pills flex-column sub-open mt-[80px]">
            <ul className="main-menu" style={{ display: "block" }}>
              {sidebarData.map((category) => (
                <React.Fragment key={category.id}>
                  <li className="sidebar__menu-category">
                    <span className="category-name">{category.category}</span>
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
