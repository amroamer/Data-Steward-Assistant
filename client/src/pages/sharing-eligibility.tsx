import { useState, useRef, useCallback, Fragment } from "react";
import * as XLSX from "xlsx";
import { useLocation } from "wouter";

interface SharingVerdict {
  verdict: string;
  condition?: string;
  conditions_required?: string[];
}

interface FieldAssessment {
  field_name: string;
  sample_values: string[];
  classification_level: string;
  classification_code: string;
  confidential_sub_level: string;
  impact_level: string;
  justification: string;
  is_pii: boolean;
  sharing_eligibility: Record<string, SharingVerdict>;
}

interface DatasetSummary {
  overall_classification: string;
  overall_code: string;
  governing_field: string;
  overall_sharing_eligibility: Record<string, SharingVerdict>;
  recommended_actions: string[];
  can_be_shared_after_anonymization: boolean;
  fields_to_remove_or_mask: string[];
}

interface SharingResult {
  field_assessments: FieldAssessment[];
  dataset_summary: DatasetSummary;
}

const CLASSIFICATION_META: Record<string, { code: string; impact: string; bg: string; fg: string }> = {
  "Top Secret": { code: "TS", impact: "High", bg: "#1A1A2E", fg: "#FFFFFF" },
  "Secret": { code: "S", impact: "Medium", bg: "#C0392B", fg: "#FFFFFF" },
  "Confidential": { code: "C", impact: "Low", bg: "#E65100", fg: "#FFFFFF" },
  "Public": { code: "P", impact: "None", bg: "#1B5E20", fg: "#FFFFFF" },
};

const VERDICT_META: Record<string, { icon: string; color: string; bg: string; border: string; label: string }> = {
  "CANNOT SHARE": { icon: "✕", color: "#B71C1C", bg: "#FFEBEE", border: "#EF9A9A", label: "Cannot Be Shared" },
  "CONDITIONAL": { icon: "◐", color: "#E65100", bg: "#FFF3E0", border: "#FFCC80", label: "Conditional Sharing" },
  "CAN SHARE": { icon: "✓", color: "#1B5E20", bg: "#E8F5E9", border: "#A5D6A7", label: "Safe to Share" },
};

const RECIPIENTS = [
  { key: "general_public", label: "General Public", icon: "🌐" },
  { key: "private_sector", label: "Private Sector", icon: "🏢" },
  { key: "government_entities", label: "Gov. Entities", icon: "🏛️" },
];

function getWorstVerdict(eligibility: Record<string, SharingVerdict>): string {
  const v = Object.values(eligibility).map(x => x.verdict);
  if (v.includes("CANNOT SHARE")) return "CANNOT SHARE";
  if (v.includes("CONDITIONAL")) return "CONDITIONAL";
  return "CAN SHARE";
}

function parseExcelFile(file: File): Promise<Record<string, unknown>[]> {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const wb = XLSX.read(e.target?.result, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: "" }) as Record<string, unknown>[];
        res(rows);
      } catch (err) { rej(err); }
    };
    reader.onerror = rej;
    reader.readAsArrayBuffer(file);
  });
}

function downloadExcel(result: SharingResult, fileName: string) {
  const wb = XLSX.utils.book_new();

  const summaryData = [
    ["NDMO DATA SHARING ELIGIBILITY REPORT"],
    ["Generated", new Date().toLocaleString()],
    ["Source File", fileName],
    [],
    ["OVERALL DATASET CLASSIFICATION", result.dataset_summary.overall_classification, `(${result.dataset_summary.overall_code})`],
    ["Governing Field", result.dataset_summary.governing_field],
    [],
    ["RECIPIENT", "VERDICT", "CONDITIONS"],
    ...RECIPIENTS.map(r => {
      const e = result.dataset_summary.overall_sharing_eligibility[r.key];
      return [r.label, e?.verdict || "", (e?.conditions_required || []).join("; ")];
    }),
    [],
    ["RECOMMENDED ACTIONS"],
    ...(result.dataset_summary.recommended_actions || []).map(a => [a]),
    [],
    ["Can be shared after anonymization?", result.dataset_summary.can_be_shared_after_anonymization ? "YES" : "NO"],
    ["Fields to mask/remove", (result.dataset_summary.fields_to_remove_or_mask || []).join(", ")],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

  const headers = ["Field Name", "Classification", "Code", "Sub-Level", "Impact", "Is PII", "Justification", "Public Verdict", "Public Condition", "Private Verdict", "Private Condition", "Gov Verdict", "Gov Condition"];
  const rows = result.field_assessments.map(f => [
    f.field_name,
    f.classification_level,
    f.classification_code,
    f.confidential_sub_level || "N/A",
    f.impact_level,
    f.is_pii ? "YES" : "NO",
    f.justification,
    f.sharing_eligibility.general_public?.verdict || "",
    f.sharing_eligibility.general_public?.condition || "",
    f.sharing_eligibility.private_sector?.verdict || "",
    f.sharing_eligibility.private_sector?.condition || "",
    f.sharing_eligibility.government_entities?.verdict || "",
    f.sharing_eligibility.government_entities?.condition || "",
  ]);
  const wsDetail = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  wsDetail["!cols"] = headers.map((_, i) => ({ wch: i === 6 ? 40 : i >= 8 ? 30 : 18 }));
  XLSX.utils.book_append_sheet(wb, wsDetail, "Field Assessment");

  XLSX.writeFile(wb, `sharing_eligibility_${Date.now()}.xlsx`);
}

function VerdictBadge({ verdict, small }: { verdict: string; small?: boolean }) {
  const m = VERDICT_META[verdict] || VERDICT_META["CANNOT SHARE"];
  return (
    <span
      data-testid={`badge-verdict-${verdict.toLowerCase().replace(/\s+/g, "-")}`}
      style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        padding: small ? "2px 8px" : "4px 12px",
        borderRadius: 20, fontSize: small ? 11 : 13, fontWeight: 700,
        background: m.bg, color: m.color, border: `1px solid ${m.border}`,
        fontFamily: "monospace",
      }}
    >
      <span>{m.icon}</span> {m.label}
    </span>
  );
}

function ClassificationBadge({ level, code }: { level: string; code: string }) {
  const m = CLASSIFICATION_META[level] || CLASSIFICATION_META["Confidential"];
  return (
    <span
      data-testid={`badge-classification-${code}`}
      style={{
        display: "inline-block", padding: "3px 10px", borderRadius: 4,
        fontSize: 12, fontWeight: 800, letterSpacing: 1,
        background: m.bg, color: m.fg, fontFamily: "monospace",
      }}
    >
      {code}
    </span>
  );
}

export default function SharingEligibilityPage() {
  const [, navigate] = useLocation();
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [fields, setFields] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SharingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [expandedField, setExpandedField] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (f: File | undefined | null) => {
    if (!f) return;
    setError(null); setResult(null);
    try {
      const parsed = await parseExcelFile(f);
      if (!parsed.length) throw new Error("File appears empty.");
      setFile(f); setRows(parsed); setFields(Object.keys(parsed[0]));
    } catch (e: unknown) { setError("Could not read file: " + (e instanceof Error ? e.message : String(e))); }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const analyse = async () => {
    setLoading(true); setError(null); setResult(null);
    try {
      const resp = await fetch("/api/sharing-eligibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields, sampleRows: rows.slice(0, 10) }),
      });
      const data = await resp.json();
      if (!data.ok) throw new Error(data.error || "Analysis failed");
      setResult(data.data as SharingResult);
    } catch (e: unknown) {
      setError("Analysis failed: " + (e instanceof Error ? e.message : String(e)));
    } finally { setLoading(false); }
  };

  const overallVerdict = result
    ? getWorstVerdict(result.dataset_summary.overall_sharing_eligibility)
    : null;
  const vm = overallVerdict ? VERDICT_META[overallVerdict] : null;
  const cm = result ? (CLASSIFICATION_META[result.dataset_summary.overall_classification] || CLASSIFICATION_META["Confidential"]) : null;

  return (
    <div style={{
      minHeight: "100vh", background: "#0A1628",
      fontFamily: "'Segoe UI', system-ui, sans-serif", color: "#E8EDF5",
    }}>
      <div style={{
        background: "linear-gradient(135deg, #0D2E5C 0%, #1A4B8C 100%)",
        borderBottom: "1px solid #1E4080", padding: "20px 32px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 10,
            background: "linear-gradient(135deg, #1A4B8C, #2E7D32)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          }}>🛡️</div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: 0.5 }}>
              Data Sharing Eligibility
            </div>
            <div style={{ fontSize: 11, color: "#90B4D4", letterSpacing: 1, textTransform: "uppercase" }}>
              NDMO Classification Framework · ZATCA
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ fontSize: 11, color: "#5A8AB8", textAlign: "right" }}>
            <div>National Data Governance</div>
            <div>Interim Regulations v1 · June 2020</div>
          </div>
          <button
            onClick={() => navigate("/")}
            style={{
              padding: "8px 16px", borderRadius: 8,
              border: "1px solid #2A4A6E", background: "transparent",
              color: "#90B4D4", cursor: "pointer", fontSize: 13,
            }}
            data-testid="button-back-to-agent"
          >
            ← Back to Agent
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>

        {!result && (
          <div
            onDrop={handleDrop}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => !file && inputRef.current?.click()}
            style={{
              border: `2px dashed ${dragOver ? "#2E7D32" : file ? "#1A4B8C" : "#2A4A6E"}`,
              borderRadius: 16, padding: "48px 32px", textAlign: "center",
              background: dragOver ? "rgba(46,125,50,0.08)" : file ? "rgba(26,75,140,0.08)" : "rgba(255,255,255,0.02)",
              cursor: file ? "default" : "pointer",
              transition: "all 0.2s", marginBottom: 24,
            }}
            data-testid="upload-zone"
          >
            <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }}
              onChange={e => handleFile(e.target.files?.[0])} data-testid="input-file" />

            {!file ? (
              <>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📂</div>
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
                  Drop your Excel or CSV file here
                </div>
                <div style={{ color: "#5A8AB8", fontSize: 13 }}>
                  Supports .xlsx · .xls · .csv
                </div>
              </>
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 32, marginBottom: 4 }}>📊</div>
                  <div style={{ fontWeight: 700, fontSize: 15 }} data-testid="text-file-name">{file.name}</div>
                  <div style={{ color: "#5A8AB8", fontSize: 12, marginTop: 4 }} data-testid="text-file-stats">
                    {rows.length} rows · {fields.length} fields detected
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={e => { e.stopPropagation(); setFile(null); setRows([]); setFields([]); setResult(null); }}
                    style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #2A4A6E", background: "transparent", color: "#90B4D4", cursor: "pointer", fontSize: 13 }}
                    data-testid="button-change-file">
                    Change file
                  </button>
                  <button onClick={e => { e.stopPropagation(); analyse(); }}
                    disabled={loading}
                    style={{
                      padding: "8px 20px", borderRadius: 8, border: "none",
                      background: loading ? "#1A4B8C88" : "linear-gradient(135deg, #1A4B8C, #2E7D32)",
                      color: "#fff", cursor: loading ? "not-allowed" : "pointer",
                      fontWeight: 700, fontSize: 13,
                    }}
                    data-testid="button-run-check">
                    {loading ? "Analysing…" : "🔍 Run Eligibility Check"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {file && !result && !loading && (
          <div style={{
            background: "rgba(255,255,255,0.03)", border: "1px solid #1E4080",
            borderRadius: 12, padding: "16px 20px", marginBottom: 24,
          }}>
            <div style={{ fontSize: 12, color: "#5A8AB8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
              Detected Fields
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }} data-testid="field-tags">
              {fields.map(f => (
                <span key={f} style={{
                  padding: "4px 12px", borderRadius: 20, fontSize: 12,
                  background: "rgba(26,75,140,0.3)", border: "1px solid #2A4A6E", color: "#90B4D4",
                }} data-testid={`tag-field-${f}`}>
                  {f}
                </span>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div style={{
            textAlign: "center", padding: "64px 0",
            background: "rgba(255,255,255,0.02)", borderRadius: 16,
            border: "1px solid #1E4080",
          }} data-testid="loading-state">
            <div style={{ fontSize: 48, marginBottom: 16, animation: "spin 2s linear infinite" }}>⚙️</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Classifying fields…</div>
            <div style={{ color: "#5A8AB8", fontSize: 13 }}>
              Applying NDMO Section 4.3 classification &amp; Section 6 sharing rules
            </div>
            <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
          </div>
        )}

        {error && (
          <div style={{
            background: "#2D1014", border: "1px solid #B71C1C", borderRadius: 12,
            padding: "16px 20px", color: "#EF9A9A", marginBottom: 24,
          }} data-testid="error-message">
            ⚠️ {error}
          </div>
        )}

        {result && vm && cm && (() => {
          const summary = result.dataset_summary;

          return (
            <>
              <div style={{
                background: `linear-gradient(135deg, ${cm.bg}22, ${cm.bg}44)`,
                border: `2px solid ${vm.color}55`,
                borderLeft: `6px solid ${vm.color}`,
                borderRadius: 16, padding: "28px 32px", marginBottom: 24,
                display: "flex", alignItems: "center", gap: 28, flexWrap: "wrap",
              }} data-testid="overall-verdict-banner">
                <div style={{
                  width: 72, height: 72, borderRadius: "50%",
                  background: vm.bg, border: `3px solid ${vm.color}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 32, color: vm.color, fontWeight: 900, flexShrink: 0,
                }}>
                  {vm.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: vm.color }}>
                    {vm.label}
                  </div>
                  <div style={{ color: "#90B4D4", marginTop: 4, fontSize: 14 }}>
                    Overall dataset classification:{" "}
                    <strong style={{ color: "#E8EDF5" }}>{summary.overall_classification}</strong>
                    {" "}· governed by field:{" "}
                    <em style={{ color: "#FFD580" }}>{summary.governing_field}</em>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={() => { setResult(null); setFile(null); setRows([]); setFields([]); }}
                    style={{ padding: "10px 18px", borderRadius: 8, border: "1px solid #2A4A6E", background: "transparent", color: "#90B4D4", cursor: "pointer", fontSize: 13 }}
                    data-testid="button-new-file">
                    ← New File
                  </button>
                  <button
                    onClick={() => downloadExcel(result, file?.name || "dataset")}
                    style={{
                      padding: "10px 20px", borderRadius: 8, border: "none",
                      background: "linear-gradient(135deg, #1B5E20, #2E7D32)",
                      color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 13,
                    }}
                    data-testid="button-download-excel">
                    ⬇ Download Excel
                  </button>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 24 }}>
                {RECIPIENTS.map(r => {
                  const e = summary.overall_sharing_eligibility[r.key];
                  if (!e) return null;
                  const v = VERDICT_META[e.verdict] || VERDICT_META["CANNOT SHARE"];
                  return (
                    <div key={r.key} style={{
                      background: "rgba(255,255,255,0.03)",
                      border: `1px solid ${v.color}55`,
                      borderTop: `4px solid ${v.color}`,
                      borderRadius: 12, padding: "20px 18px",
                    }} data-testid={`card-recipient-${r.key}`}>
                      <div style={{ fontSize: 22, marginBottom: 6 }}>{r.icon}</div>
                      <div style={{ fontSize: 13, color: "#90B4D4", marginBottom: 8 }}>{r.label}</div>
                      <VerdictBadge verdict={e.verdict} />
                      {(e.conditions_required || []).length > 0 && (
                        <ul style={{ marginTop: 12, paddingLeft: 16, fontSize: 11, color: "#7A9EC0", lineHeight: 1.7 }}>
                          {e.conditions_required!.map((c, i) => <li key={i}>{c}</li>)}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>

              {summary.can_be_shared_after_anonymization && (
                <div style={{
                  background: "rgba(27,94,32,0.12)", border: "1px solid #2E7D3255",
                  borderRadius: 12, padding: "16px 20px", marginBottom: 24,
                  display: "flex", gap: 16, alignItems: "flex-start",
                }} data-testid="anonymization-tip">
                  <span style={{ fontSize: 22 }}>💡</span>
                  <div>
                    <div style={{ fontWeight: 700, color: "#81C784", marginBottom: 4 }}>
                      Shareable after anonymization
                    </div>
                    <div style={{ fontSize: 13, color: "#90B4D4" }}>
                      Remove or mask the following fields:{" "}
                      <strong style={{ color: "#FFD580" }}>
                        {(summary.fields_to_remove_or_mask || []).join(", ")}
                      </strong>
                    </div>
                  </div>
                </div>
              )}

              <div style={{
                background: "rgba(26,75,140,0.12)", border: "1px solid #1A4B8C55",
                borderRadius: 12, padding: "20px 24px", marginBottom: 28,
              }} data-testid="recommended-actions">
                <div style={{ fontSize: 13, fontWeight: 700, color: "#90B4D4", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>
                  📋 Recommended Actions
                </div>
                <ol style={{ paddingLeft: 20, margin: 0, fontSize: 13, color: "#C8D8EA", lineHeight: 2 }}>
                  {(summary.recommended_actions || []).map((a, i) => <li key={i}>{a}</li>)}
                </ol>
              </div>

              <div style={{ fontSize: 13, fontWeight: 700, color: "#5A8AB8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>
                Field-by-Field Assessment
              </div>
              <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid #1E4080" }}>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 800 }} data-testid="table-field-assessment">
                    <thead>
                      <tr style={{ background: "#0D2E5C" }}>
                        {["Field", "Classification", "PII", "General Public", "Private Sector", "Gov. Entities", "Justification"].map(h => (
                          <th key={h} style={{ padding: "12px 14px", textAlign: "left", fontSize: 11, color: "#5A8AB8", fontWeight: 700, letterSpacing: 0.5, borderBottom: "1px solid #1E4080", whiteSpace: "nowrap" }}>
                            {h.toUpperCase()}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.field_assessments.map((f, idx) => {
                        const expanded = expandedField === f.field_name;
                        return (
                          <Fragment key={f.field_name}>
                            <tr
                              onClick={() => setExpandedField(expanded ? null : f.field_name)}
                              style={{
                                background: idx % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent",
                                cursor: "pointer", transition: "background 0.15s",
                              }}
                              data-testid={`row-field-${f.field_name}`}
                            >
                              <td style={{ padding: "12px 14px", fontWeight: 600, color: "#E8EDF5", borderBottom: "1px solid #1E408033" }}>
                                {f.field_name}
                              </td>
                              <td style={{ padding: "12px 14px", borderBottom: "1px solid #1E408033" }}>
                                <ClassificationBadge level={f.classification_level} code={f.classification_code} />
                              </td>
                              <td style={{ padding: "12px 14px", borderBottom: "1px solid #1E408033" }}>
                                {f.is_pii
                                  ? <span style={{ color: "#FF8A65", fontWeight: 700, fontSize: 12 }}>⚠ PII</span>
                                  : <span style={{ color: "#5A8AB8", fontSize: 12 }}>—</span>}
                              </td>
                              {["general_public", "private_sector", "government_entities"].map(rk => (
                                <td key={rk} style={{ padding: "12px 14px", borderBottom: "1px solid #1E408033" }}>
                                  <VerdictBadge verdict={f.sharing_eligibility[rk]?.verdict || "CANNOT SHARE"} small />
                                </td>
                              ))}
                              <td style={{ padding: "12px 14px", borderBottom: "1px solid #1E408033", color: "#7A9EC0", fontSize: 12, maxWidth: 240 }}>
                                {expanded ? f.justification : (f.justification?.substring(0, 60) + (f.justification?.length > 60 ? "…" : ""))}
                              </td>
                            </tr>
                            {expanded && (
                              <tr>
                                <td colSpan={7} style={{ background: "rgba(26,75,140,0.08)", padding: "12px 24px", borderBottom: "1px solid #1E4080" }}>
                                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                                    {["general_public", "private_sector", "government_entities"].map(rk => {
                                      const e = f.sharing_eligibility[rk];
                                      const rec = RECIPIENTS.find(r => r.key === rk);
                                      if (!e || !rec) return null;
                                      return (
                                        <div key={rk} style={{ fontSize: 12, color: "#90B4D4" }}>
                                          <div style={{ fontWeight: 700, marginBottom: 4 }}>{rec.icon} {rec.label}</div>
                                          <VerdictBadge verdict={e.verdict} small />
                                          {e.condition && <div style={{ marginTop: 6, color: "#7A9EC0" }}>{e.condition}</div>}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div style={{ marginTop: 20, textAlign: "center", color: "#2A4A6E", fontSize: 11 }}>
                Assessment based on NDMO National Data Governance Interim Regulations v1 · June 2020 · Sections 4.3 and 6
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );
}
