import { useEffect, useState } from "react";

interface ApiErrorDetail {
  message: string;
  status: number | null;
  endpoint: string;
  aiProvider: string;
  timestamp: string;
}

export function ErrorPopup() {
  const [error, setError] = useState<ApiErrorDetail | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<ApiErrorDetail>).detail;
      setError(detail);
      setCopied(false);
    };
    window.addEventListener("api-error", handler);
    return () => window.removeEventListener("api-error", handler);
  }, []);

  if (!error) return null;

  const copyText = [
    `Error:       ${error.message}`,
    `Status:      ${error.status ?? "N/A"}`,
    `Endpoint:    ${error.endpoint}`,
    `AI Provider: ${error.aiProvider}`,
    `Timestamp:   ${error.timestamp}`,
  ].join("\n");

  function handleCopy() {
    navigator.clipboard.writeText(copyText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="API Error"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0, 0, 0, 0.65)",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) setError(null); }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 10,
          maxWidth: 520,
          width: "90%",
          padding: "24px 28px",
          boxShadow: "0 24px 80px rgba(0,0,0,0.45)",
          border: "2px solid #C62828",
          fontFamily: "inherit",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <span style={{ fontSize: 22, lineHeight: 1 }}>⚠️</span>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#B71C1C" }}>
            API Request Failed
          </h2>
          <span
            style={{
              marginLeft: "auto",
              display: "inline-block",
              padding: "2px 8px",
              borderRadius: 12,
              background: "#FFEBEE",
              color: "#C62828",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            {error.status ?? "ERR"}
          </span>
        </div>

        {/* Details block */}
        <div
          style={{
            background: "#FFF8F8",
            border: "1px solid #FFCDD2",
            borderRadius: 6,
            padding: "12px 14px",
            marginBottom: 18,
            fontSize: 12,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            lineHeight: 1.7,
            wordBreak: "break-all",
          }}
        >
          <Row label="Message"     value={error.message} />
          <Row label="Status"      value={String(error.status ?? "N/A")} />
          <Row label="Endpoint"    value={error.endpoint} />
          <Row label="AI Provider" value={error.aiProvider} />
          <Row label="Timestamp"   value={error.timestamp} />
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            onClick={handleCopy}
            style={{
              padding: "7px 16px",
              borderRadius: 5,
              border: "1px solid #ddd",
              background: copied ? "#E8F5E9" : "#fff",
              color: copied ? "#2E7D32" : "#333",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 500,
              transition: "background 0.2s, color 0.2s",
            }}
          >
            {copied ? "✓ Copied!" : "Copy Error"}
          </button>
          <button
            onClick={() => setError(null)}
            style={{
              padding: "7px 18px",
              borderRadius: 5,
              border: "none",
              background: "#C62828",
              color: "#fff",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <span style={{ color: "#888", minWidth: 90, flexShrink: 0 }}>{label}:</span>
      <span style={{ color: "#1A1A2E" }}>{value}</span>
    </div>
  );
}
