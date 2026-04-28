"use client";
import Image from "next/image";
import React, { useState } from "react";
import handImg from "../../../../public/assets/images/shape/hand.png";
import HeaderAction from "./components/HeaderAction";
import useGlobalContext from "@/hooks/use-context";
import sidebarData from "@/data/sidebar-data";
import Link from "next/link";
import { SidebarCategory } from "@/interface";

import { useDashboardContext } from "../DashboardProvider";

const DashboardHeader = () => {
  const { sidebarHandle } = useGlobalContext();
  const { user } = useDashboardContext();
  const [searchQuery, setSearchQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [searchResultData, setSearchResultData] = useState<
    SidebarCategory[] | null
  >([]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase();
    setSearchQuery(value);
    setShowResults(value.trim().length > 0);

    if (value.trim().length > 0) {
      // Filter data
      const filteredData = sidebarData
        .map((category) => {
          const filteredItems = category.items
            .map((item) => {
              // Filter subItems
              const filteredSubItems = item.subItems?.filter((subItem) =>
                subItem.label.toLowerCase().includes(value)
              );

              // Include item if it matches or any of its subItems match
              if (
                item.label.toLowerCase().includes(value) ||
                (filteredSubItems && filteredSubItems.length > 0)
              ) {
                return { ...item, subItems: filteredSubItems || item.subItems };
              }

              return null;
            })
            .filter(Boolean); // Remove null values

          // Include category if it contains filtered items
          if (filteredItems.length > 0) {
            return { ...category, items: filteredItems };
          }

          return null;
        })
        .filter(Boolean) as SidebarCategory[]; // Remove null values

      setSearchResultData(filteredData);
    } else {
      setSearchResultData([]);
    }
  };

  return (
    <>
      {/* -- App header area start -- */}
      <div className="app__header__area">
        <div className="app__header-inner">
          <div className="app__header-left">
            <div className="flex">
              <button
                id="sidebar__active"
                onClick={sidebarHandle}
                className="app__header-toggle"
              >
                <div className="bar-icon-2">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </button>
            </div>
            <h2 className="header__title">
              Hello {user?.firstName || 'User'}{" "}
              <span>
                <Image
                  className="inline-block"
                  src={handImg}
                  priority
                  alt="image"
                />
              </span>
            </h2>
          </div>
          <div className="app__header-right">
            <div className="app__herader-input relative">
              <input
                type="search"
                id="search-field"
                name="search-field"
                placeholder="Search Here . . ."
                value={searchQuery}
                onChange={handleSearchChange}
              />
              <button>
                <i className="icon-magnifying-glass"></i>
              </button>

              {/* Search Results Box */}
              {showResults && (
                <div className="search-results-box">
                  <ul>
                    {searchResultData?.length ? (
                      <>
                        {searchResultData.map((category) => (
                          <li key={category.id}>
                            <strong>{category.category}</strong>
                            <ul>
                              {category.items.map((item) => (
                                <li key={item.id}>
                                  {item.link ? (
                                    <Link href={item.link}>{item.label}</Link>
                                  ) : (
                                    item.label
                                  )}
                                  {item.subItems && (
                                    <ul>
                                      {item.subItems.map((subItem, index) => (
                                        <li key={index}>
                                          {subItem.link ? (
                                            <Link href={subItem.link}>
                                              {subItem.label}
                                            </Link>
                                          ) : (
                                            subItem.label
                                          )}
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </li>
                        ))}
                      </>
                    ) : (
                      <li>No results found</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
            <HeaderAction />
          </div>
        </div>
      </div>
      <div className="body__overlay"></div>
      {/* -- App header area end -- */}
    </>
  );
};

export default DashboardHeader;
