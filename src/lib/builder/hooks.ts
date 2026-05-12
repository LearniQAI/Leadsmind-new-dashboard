"use client";

import { useEffect, useRef } from 'react';
import { useBuilder } from '@/components/builder/BuilderContext';

/**
 * Automatically syncs component props to the website's global config
 * if the component is marked as global.
 */
export function useGlobalSync(isGlobal: boolean, globalId: string, props: any) {
  const { websiteData, onUpdateWebsite } = useBuilder();
  const firstRender = useRef(true);
  const websiteDataRef = useRef(websiteData);

  useEffect(() => {
    websiteDataRef.current = websiteData;
  }, [websiteData]);

  const propsString = JSON.stringify(props);

  useEffect(() => {
    // Skip first render to avoid redundant saves and allow loading from DB
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }

    const currentData = websiteDataRef.current;
    if (isGlobal && globalId && currentData) {
      onUpdateWebsite({
        config: {
          ...currentData.config,
          globals: {
            ...currentData.config?.globals,
            [globalId]: props
          }
        }
      });
    }
  }, [propsString, isGlobal, globalId, onUpdateWebsite]); // eslint-disable-line react-hooks/exhaustive-deps
}

/**
 * Returns the correct prop value based on current viewMode
 */
export function useResponsiveValue<T>(props: any, propName: string, defaultValue: T): T {
  const { viewMode } = useBuilder();
  
  if (viewMode === 'mobile' && props[`${propName}_mobile`] !== undefined) {
    return props[`${propName}_mobile`];
  }
  
  if (viewMode === 'tablet' && props[`${propName}_tablet`] !== undefined) {
    return props[`${propName}_tablet`];
  }
  
  return props[propName] ?? defaultValue;
}

/**
 * Hook to set props with responsive awareness
 */
import { useNode } from '@craftjs/core';

export function useResponsiveSetProp() {
  const { viewMode } = useBuilder();
  const { actions: { setProp } } = useNode();

  const setResponsiveValue = (propName: string, value: any) => {
    setProp((props: any) => {
      if (viewMode === 'mobile') {
        props[`${propName}_mobile`] = value;
      } else if (viewMode === 'tablet') {
        props[`${propName}_tablet`] = value;
      } else {
        props[propName] = value;
      }
    });
  };

  return { setResponsiveValue };
}
