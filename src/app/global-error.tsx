'use client'

// global-error.tsx catches errors at the ROOT layout level
// This replaces the raw Next.js "Application error" overlay

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          backgroundColor: '#0a0a0a',
          color: '#fafafa',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}>
          <div style={{ textAlign: 'center', padding: '2rem', maxWidth: '400px' }}>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Application Error
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#a1a1aa', marginBottom: '1.5rem', wordBreak: 'break-word' }}>
              {error?.message || 'An unexpected error occurred while loading the application.'}
            </p>
            <button
              onClick={() => {
                try { localStorage.removeItem('aidraft_auth_token') } catch {}
                reset()
              }}
              style={{
                padding: '0.625rem 1rem',
                borderRadius: '0.75rem',
                fontSize: '0.875rem',
                fontWeight: 500,
                backgroundColor: '#6366f1',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Reload
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
