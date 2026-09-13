'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body style={{
        margin: 0,
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#FFFFFF',
        color: '#0F172A',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        padding: '24px',
        textAlign: 'center',
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '16px',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '24px',
        }}>
          <span style={{ fontSize: '28px', lineHeight: 1 }}>⚠️</span>
        </div>
        <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '8px', color: '#0F172A' }}>
          Critical error
        </h2>
        <p style={{ color: '#475569', marginBottom: '28px', maxWidth: '380px', fontSize: '14px', lineHeight: 1.6 }}>
          A critical error occurred and this page can&apos;t recover on its own. Please refresh to continue.
        </p>
        <button
          onClick={reset}
          style={{
            background: 'linear-gradient(180deg, #1359FF 0%, #0F47CC 100%)',
            color: '#fff',
            border: 'none',
            borderRadius: '12px',
            padding: '12px 28px',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(19, 89, 255, 0.3)',
          }}
        >
          Try again
        </button>
        {error.digest && (
          <p style={{ marginTop: '28px', fontSize: '11px', color: 'rgba(71, 85, 105, 0.7)', fontFamily: 'monospace' }}>
            Error ref: {error.digest}
          </p>
        )}
      </body>
    </html>
  );
}
