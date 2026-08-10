"use client";

export default function GlobalError({ reset }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#f6f8fc", color: "#172033", fontFamily: "Inter, system-ui, sans-serif" }}>
        <main style={{ width: "min(720px, calc(100% - 32px))", margin: "clamp(32px, 10vh, 80px) auto", padding: "clamp(24px, 5vw, 40px)", border: "1px solid #dbe3ee", borderRadius: 8, background: "#fff", boxShadow: "0 18px 44px rgba(23,32,51,.12)" }}>
          <p style={{ margin: 0, color: "#0f7185", fontSize: 12, fontWeight: 700, textTransform: "uppercase" }}>Temporary problem</p>
          <h1 style={{ margin: "12px 0 0", fontSize: 28, lineHeight: 1.2 }}>Admission Compass could not load</h1>
          <p style={{ margin: "16px 0 0", color: "#64748b", lineHeight: 1.7 }}>Please retry. Your database records and saved account information have not been changed.</p>
          <button type="button" onClick={reset} style={{ minHeight: 44, marginTop: 24, padding: "0 18px", border: 0, borderRadius: 8, background: "#0f7185", color: "#fff", cursor: "pointer", fontWeight: 700 }}>
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
