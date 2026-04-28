"use client";

import React, { createContext, useState, useEffect } from "react";
import { AppContextType } from "@/interface/common.interface";

export const AppContext = createContext<AppContextType | undefined>(undefined);

const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sideMenuOpen, setSideMenuOpen] = useState<boolean>(false);
  const [isCollapse, setIsCollapse] = useState<boolean>(false);
  const [theme, setTheme] = useState<string>("dark");
  const [scrollDirection, setScrollDirection] = useState<string>("up");

  const sidebarHandle = () => {
    setSideMenuOpen(!sideMenuOpen);
  };

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "dark" ? "light" : "dark"));
  };

  useEffect(() => {
    let lastScrollY = window.scrollY;

    const updateScrollDirection = () => {
      const scrollY = window.scrollY;
      const direction = scrollY > lastScrollY ? "down" : "up";
      if (
        direction !== scrollDirection &&
        (scrollY - lastScrollY > 10 || scrollY - lastScrollY < -10)
      ) {
        setScrollDirection(direction);
      }
      lastScrollY = scrollY > 0 ? scrollY : 0;
    };

    window.addEventListener("scroll", updateScrollDirection);
    return () => window.removeEventListener("scroll", updateScrollDirection);
  }, [scrollDirection]);

  return (
    <AppContext.Provider
      value={{
        scrollDirection,
        setScrollDirection,
        sideMenuOpen,
        setSideMenuOpen,
        sidebarHandle,
        toggleTheme,
        isCollapse,
        setIsCollapse,
        theme,
        setTheme,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export default AppProvider;
