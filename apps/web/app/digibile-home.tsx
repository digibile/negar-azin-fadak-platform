export default function DigibileHome() {
  return (
    <main style={{ width: "100%", minHeight: "100dvh", margin: 0, padding: 0, overflow: "hidden" }}>
      <iframe
        title="Digibile Marketplace"
        src="/digibile-template/src/index.html"
        style={{ display: "block", width: "100%", height: "100dvh", minHeight: "100dvh", border: 0 }}
        allow="clipboard-read; clipboard-write"
      />
    </main>
  );
}
