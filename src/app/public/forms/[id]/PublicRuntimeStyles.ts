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
  background: '#ffffff',
  border: '1px solid #e6e9f2',
  borderRadius: 20,
  padding: '32px 28px',
  boxShadow: '0 20px 40px -20px rgba(15,23,42,0.15)',
};

export const headingStyle: React.CSSProperties = {
  fontFamily: 'Space Grotesk, sans-serif',
  fontWeight: 900,
  fontSize: 22,
  textTransform: 'uppercase',
  letterSpacing: '-0.02em',
  color: '#101B4C',
  margin: 0,
};

export const primaryBtnStyle: React.CSSProperties = {
  padding: '12px 28px',
  background: 'linear-gradient(135deg, #101B4C 0%, #2563eb 60%, #0EA5E9 100%)',
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
  background: '#f1f5f9',
  color: '#475569',
  border: '1px solid #e2e8f0',
  borderRadius: 12,
  fontFamily: 'Space Grotesk, sans-serif',
  fontWeight: 900,
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  cursor: 'pointer',
};
