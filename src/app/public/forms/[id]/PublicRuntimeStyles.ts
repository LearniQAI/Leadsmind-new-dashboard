import React from 'react';

export const containerStyle: React.CSSProperties = {
  fontFamily: 'DM Sans, sans-serif',
  padding: '20px 16px',
  minHeight: '100%',
  boxSizing: 'border-box',
};

export const cardStyle: React.CSSProperties = {
  maxWidth: 600,
  margin: '0 auto',
  background: 'rgba(12, 21, 53, 0.9)',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: 20,
  padding: '32px 28px',
  boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)',
};

export const headingStyle: React.CSSProperties = {
  fontFamily: 'Space Grotesk, sans-serif',
  fontWeight: 900,
  fontSize: 22,
  textTransform: 'uppercase',
  letterSpacing: '-0.02em',
  color: '#eef2ff',
  margin: 0,
};

export const primaryBtnStyle: React.CSSProperties = {
  padding: '12px 28px',
  background: '#2563eb',
  color: '#fff',
  border: 'none',
  borderRadius: 12,
  fontFamily: 'Space Grotesk, sans-serif',
  fontWeight: 900,
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  cursor: 'pointer',
  transition: 'opacity 0.2s',
};

export const secondaryBtnStyle: React.CSSProperties = {
  padding: '12px 20px',
  background: 'rgba(255,255,255,0.03)',
  color: 'rgba(255,255,255,0.6)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 12,
  fontFamily: 'Space Grotesk, sans-serif',
  fontWeight: 900,
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  cursor: 'pointer',
};
