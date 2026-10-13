"use client";

import Link from "next/link";

export default function DigibileHome() {
  return (
    <main style={{ position: "relative", width: "100%", minHeight: "100dvh", margin: 0, padding: 0, overflow: "hidden", background: "#f7f8fa" }}>
      <iframe
        title="قالب بازارگاه سوکار"
        src="/digibile-template/src/index.html"
        style={{ display: "block", width: "100%", height: "100dvh", minHeight: "100dvh", border: 0 }}
        allow="clipboard-read; clipboard-write"
      />
      <Link
        href="/store/shop"
        aria-label="مشاهده کالاهای واقعی و موجودی تأییدشده در بازارگاه سوکار"
        style={{
          position: "fixed",
          zIndex: 20,
          right: "max(16px, env(safe-area-inset-right))",
          bottom: "max(16px, env(safe-area-inset-bottom))",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          minHeight: 48,
          padding: "0 20px",
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,.24)",
          background: "#162b4d",
          color: "#fff",
          fontFamily: "inherit",
          fontSize: 14,
          fontWeight: 700,
          textDecoration: "none",
          boxShadow: "0 8px 28px rgba(13,31,58,.24)"
        }}
      >
        <span aria-hidden="true" style={{ fontSize: 19, lineHeight: 1 }}>⌕</span>
        مشاهده کالاهای واقعی سوکار
      </Link>
    </main>
  );
}
