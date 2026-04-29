"use client";

import { useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

export function VisitorTracker() {
  useEffect(() => {
    const getCookie = (name: string) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(';').shift();
    };

    const setCookie = (name: string, value: string, days: number) => {
      const date = new Date();
      date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
      const expires = `; expires=${date.toUTCString()}`;
      document.cookie = `${name}=${value || ""}${expires}; path=/`;
    };

    let visitorId = getCookie('lm_visitor_id');
    if (!visitorId) {
      visitorId = uuidv4();
      setCookie('lm_visitor_id', visitorId, 365);
    }
  }, []);

  return null;
}
