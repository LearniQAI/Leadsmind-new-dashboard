"use client"
import React, { createContext, useState, useContext, useEffect } from 'react';

interface DirectionContextType {
  direction: string;
  toggleDirection: () => void;
}

export const DirectionContext = createContext<DirectionContextType | undefined>(undefined);

export const DirectionProvider = ({ children }: { children: React.ReactNode }) => {
  const [direction, setDirection] = useState('ltr');

  useEffect(() => {
    const storedDirection = localStorage.getItem('direction');
    if (storedDirection) {
      setDirection(storedDirection);
      document.documentElement.setAttribute('dir', storedDirection);
    } else {
      localStorage.setItem('direction', 'ltr'); 
    }
  }, [setDirection]);

  const toggleDirection = () => {
    const newDirection = direction === 'ltr' ? 'rtl' : 'ltr';
    setDirection(newDirection);
    localStorage.setItem('direction', newDirection);
    document.documentElement.setAttribute('dir', newDirection);
  };

  const contextValue: DirectionContextType = {
    direction,
    toggleDirection,
  };

  return (
    <DirectionContext.Provider value={contextValue}>
      {children}
    </DirectionContext.Provider>
  );
};

export const useDirection = () => {
  const context = useContext(DirectionContext);
  if (!context) {
    throw new Error('useDirection must be used within a DirectionProvider');
  }
  return context;
};
