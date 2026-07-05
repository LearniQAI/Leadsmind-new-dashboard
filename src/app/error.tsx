'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0F172A',
      color: '#fff',
      fontFamily: 'Inter, sans-serif',
      padding: '24px',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
      <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>
        Something went wrong
      </h2>
      <p style={{ color: '#94A3B8', marginBottom: '24px', maxWidth: '400px' }}>
        An unexpected error occurred. Please try again or contact support
        if the problem persists.
      </p>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <button
          onClick={reset}
          style={{
            background: '#4F46E5',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 24px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            marginRight: '12px',
          }}
        >
          Try again
        </button>
        <a
          href="/"
          style={{
            color: '#4F46E5',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: 600,
          }}
        >
          Go home →
        </a>
      </div>
    </div>
  );
}
