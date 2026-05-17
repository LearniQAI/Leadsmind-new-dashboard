"use client";

import React, { createContext, useState, useEffect, useRef } from "react";
import { AppContextType } from "@/interface/common.interface";

export const AppContext = createContext<AppContextType | undefined>(undefined);

const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
 const [sideMenuOpen, setSideMenuOpen] = useState<boolean>(false);
 const [isCollapse, setIsCollapse] = useState<boolean>(false);
 const [theme, setTheme] = useState<string>("dark");
 const [scrollDirection, setScrollDirection] = useState<string>("up");
 const [searchOpen, setSearchOpen] = useState<boolean>(false);
 const isMounted = useRef(false);

 // Read persisted collapse state from localStorage on mount
 useEffect(() => {
  const persisted = localStorage.getItem("sidebar_collapsed");
  if (persisted !== null) {
   setIsCollapse(persisted === "true");
  }
  isMounted.current = true;
 }, []);

 // Persist collapse state changes to localStorage
 useEffect(() => {
  if (isMounted.current) {
   localStorage.setItem("sidebar_collapsed", String(isCollapse));
  }
 }, [isCollapse]);

 const sidebarHandle = () => {
  setSideMenuOpen(!sideMenuOpen);
 };

 const toggleTheme = () => {
  setTheme((prevTheme) => (prevTheme === "dark" ? "light" : "dark"));
 };

 useEffect(() => {
  const root = window.document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(theme);
  root.setAttribute("bd-theme", theme === "dark" ? "bd-theme-dark" : "bd-theme-light");
 }, [theme]);

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
    searchOpen,
    setSearchOpen,
   }}
  >
   {children}
  </AppContext.Provider>
 );
};

export default AppProvider;
