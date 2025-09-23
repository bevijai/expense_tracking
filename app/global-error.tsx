"use client"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body style={{ padding: 24, fontFamily: 'sans-serif' }}>
        <h1>App Error</h1>
        <p style={{ color: 'crimson' }}>{String(error?.message || error)}</p>
        {error?.digest ? <p>digest: {error.digest}</p> : null}
        <button onClick={() => reset()} style={{ marginTop: 12, padding: 8 }}>
          Try again
        </button>
      </body>
    </html>
  )
}
