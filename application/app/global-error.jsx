"use client";

export default function GlobalError({ reset }) {
  return (
    <html lang="en">
      <body>
        <main style={{ maxWidth: 720, margin: "80px auto", padding: 24, fontFamily: "Arial, sans-serif" }}>
          <h1>Admission Compass could not load</h1>
          <p>Please retry. Your database records and saved account information have not been changed.</p>
          <button type="button" onClick={reset} style={{ minHeight: 44, padding: "0 18px", cursor: "pointer" }}>
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
