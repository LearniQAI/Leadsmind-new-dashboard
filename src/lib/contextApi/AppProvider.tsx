"use client";

import React, { createContext, useState, useEffect, useRef } from "react";
import { AppContextType } from "@/interface/common.interface";

export const AppContext = createContext<AppContextType | undefined>(undefined);

const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
 const [sideMenuOpen, setSideMenuOpen] = useState<boolean>(false);
 const [isCollapse, setIsCollapse] = useState<boolean>(false);
 // Defaults to "light": this app's actual design system (dash-* tokens, white
 // document/print templates) is light-mode. "dark" was the original admin-template
 // boilerplate default, carried over unpersisted — every session silently ran in
 // dark mode, activating the vendor template's own dark-mode CSS reset
 // (bare `p`/`h1`-`h6` color overrides) against pages that were never designed for
 // it. See InvoiceMasterDetail.tsx's printable-area comment for the confirmed
 // mechanism. Dark mode itself remains a real, working, user-selectable option
 // (Settings > Appearance) — only the unpersisted default changes here.
 const [theme, setTheme] = useState<string>("light");
 const [scrollDirection, setScrollDirection] = useState<string>("up");
 const [searchOpen, setSearchOpen] = useState<boolean>(false);
 const isMounted = useRef(false);
 const themeHydrated = useRef(false);

 // Read persisted collapse state from localStorage on mount
 useEffect(() => {
  const persisted = localStorage.getItem("sidebar_collapsed");
  if (persisted !== null) {
   setIsCollapse(persisted === "true");
  }
  const persistedTheme = localStorage.getItem("theme");
  if (persistedTheme === "dark" || persistedTheme === "light") {
   setTheme(persistedTheme);
  }
  isMounted.current = true;
 }, []);

 // Persist collapse state changes to localStorage
 useEffect(() => {
  if (isMounted.current) {
   localStorage.setItem("sidebar_collapsed", String(isCollapse));
  }
 }, [isCollapse]);

 // Persist an explicit user theme choice so it survives reloads instead of
 // silently reverting to the default every navigation. Skips its first run:
 // that first run fires in the same mount pass as the read-effect above, with
 // `theme` still holding the pre-hydration closure value — writing then would
 // race the read and clobber a just-restored persisted value back to the
 // default before it ever applies.
 useEffect(() => {
  if (!themeHydrated.current) {
   themeHydrated.current = true;
   return;
  }
  localStorage.setItem("theme", theme);
 }, [theme]);

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
