'use client';

import React, { useEffect } from 'react';

export default function PublicFormError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    console.error('[public/forms] client render error', error);
  }, [error]);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', fontFamily: 'DM Sans, sans-serif',
      background: 'linear-gradient(180deg, #f7f9fd 0%, #eef1f8 100%)', padding: 24, boxSizing: 'border-box'
    }}>
      <div style={{
        maxWidth: 420, textAlign: 'center', padding: 40,
        background: '#ffffff', border: '1px solid #e6e9f2',
        borderRadius: 20, color: '#101B4C',
        boxShadow: '0 20px 40px -20px rgba(15,23,42,0.15)'
      }}>
        <img
          src="/assets/images/brand/LeadsMind_Logo.png.png"
          alt="LeadsMind"
          style={{ height: 26, width: 'auto', objectFit: 'contain', margin: '0 auto 24px' }}
        />
        <div style={{ fontSize: 36, marginBottom: 16 }}>🔒</div>
        <h2 style={{
          fontFamily: 'Space Grotesk, sans-serif', fontWeight: 900,
          fontSize: 18, textTransform: 'uppercase', marginBottom: 8, color: '#101B4C'
        }}>
          Form Unavailable
        </h2>
        <p style={{ color: '#64748b', fontSize: 13, lineHeight: 1.6 }}>
          This form is not published or the link is invalid. Contact the form owner for access.
        </p>
      </div>
    </div>
  );
}
