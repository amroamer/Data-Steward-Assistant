import { useState, useRef, useCallback, Fragment } from "react";
import * as XLSX from "xlsx";
import { useLocation } from "wouter";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import {
  addSharingEligibilitySheet,
  addDashboardDesignSheets,
  addReportTestSheet,
  addTestCaseSheets,
  addDashboardTestSheet,
  exportTestRunSheet,
  exportDashboardTestRunSheet,
  downloadBiReport,
  hasSheets,
} from "@/lib/bi-store";

type TabKey = "sharing" | "dashboard" | "report" | "testcases" | "dashtest";

interface TabDef {
  key: TabKey;
  label: string;
  labelAr: string;
  icon: string;
  endpoint: string;
  steps: string[];
  stepsAr: string[];
}

const TABS: TabDef[] = [
  { key: "sharing", label: "Sharing Eligibility", labelAr: "أهلية المشاركة", icon: "🔍", endpoint: "/api/bi/sharing-eligibility", steps: ["Parsing fields", "Classifying data", "Applying NDMO rules", "Generating verdict"], stepsAr: ["تحليل الحقول", "تصنيف البيانات", "تطبيق قواعد NDMO", "إصدار الحكم"] },
  { key: "dashboard", label: "Dashboard Designer", labelAr: "مصمم لوحة المعلومات", icon: "📐", endpoint: "/api/bi/dashboard-designer", steps: ["Analysing dataset", "Designing visuals", "Writing DAX measures", "Building layout"], stepsAr: ["تحليل البيانات", "تصميم المرئيات", "كتابة مقاييس DAX", "بناء التخطيط"] },
  { key: "report", label: "Report Tester", labelAr: "فاحص التقارير", icon: "🔬", endpoint: "/api/bi/report-tester", steps: ["Checking governance", "Scanning data quality", "Reviewing business logic", "Checking presentation"], stepsAr: ["فحص الحوكمة", "فحص جودة البيانات", "مراجعة منطق الأعمال", "فحص العرض"] },
  { key: "testcases", label: "Test Cases", labelAr: "حالات الاختبار", icon: "📋", endpoint: "/api/bi/test-case-generator", steps: ["Analysing fields", "Writing completeness tests", "Writing accuracy tests", "Writing governance tests", "Finalising test suite"], stepsAr: ["تحليل الحقول", "كتابة اختبارات الاكتمال", "كتابة اختبارات الدقة", "كتابة اختبارات الحوكمة", "إنهاء مجموعة الاختبارات"] },
  { key: "dashtest", label: "Dashboard Tester", labelAr: "فاحص لوحة المعلومات", icon: "🖥", endpoint: "/api/bi/dashboard-tester", steps: ["Analysing dashboard", "Writing visual tests", "Writing DAX tests", "Writing governance tests", "Finalising test suite"], stepsAr: ["تحليل لوحة المعلومات", "كتابة اختبارات المرئيات", "كتابة اختبارات DAX", "كتابة اختبارات الحوكمة", "إنهاء مجموعة الاختبارات"] },
];

const VERDICT_COLORS: Record<string, { bg: string; fg: string; border: string }> = {
  CLEARED: { bg: "#E8F5E9", fg: "#1B5E20", border: "#2E7D32" },
  "CLEARED WITH CONDITIONS": { bg: "#FFF3E0", fg: "#E65100", border: "#E65100" },
  "CLEARED AFTER REMEDIATION": { bg: "#FFFDE7", fg: "#F59E0B", border: "#F59E0B" },
  BLOCKED: { bg: "#FFEBEE", fg: "#B71C1C", border: "#B71C1C" },
};

const SEVERITY_COLORS: Record<string, { bg: string; fg: string }> = {
  Critical: { bg: "#B71C1C", fg: "#fff" },
  High: { bg: "#E65100", fg: "#fff" },
  Medium: { bg: "#F59E0B", fg: "#000" },
  Low: { bg: "#2E7D32", fg: "#fff" },
};

const DONUT_COLORS = ["#1A4B8C", "#2E7D32", "#E65100", "#F59E0B", "#B71C1C", "#0D2E5C", "#6366F1", "#EC4899"];

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

interface ThreadEntry {
  id: string;
  tab: TabKey;
  label: string;
  timestamp: string;
  data: Record<string, unknown>;
  collapsed: boolean;
}

function exportTestRun(cases: Record<string, unknown>[], testStatus: Record<string, "pass" | "fail" | null>) {
  exportTestRunSheet(cases, testStatus);
}

function exportDashboardTestRun(cases: Record<string, unknown>[], testStatus: Record<string, "pass" | "fail" | null>) {
  exportDashboardTestRunSheet(cases, testStatus);
}

export default function BiAgentPage() {
  const [, navigate] = useLocation();
  const [lang, setLang] = useState<"en" | "ar">("en");
  const isRtl = lang === "ar";

  const [activeTab, setActiveTab] = useState<TabKey>("sharing");
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [fields, setFields] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [threads, setThreads] = useState<ThreadEntry[]>([]);
  const [expandedThread, setExpandedThread] = useState<string | null>(null);

  const [stakeholder, setStakeholder] = useState("");
  const [businessQuestion, setBusinessQuestion] = useState("");
  const [audience, setAudience] = useState("Internal ZATCA Team");
  const [dashboardType, setDashboardType] = useState("Analytical");
  const [reportPurpose, setReportPurpose] = useState("");
  const [reportFormat, setReportFormat] = useState("Mixed");
  const [testDepth, setTestDepth] = useState("Standard");
  const [testCategories, setTestCategories] = useState<string[]>(["Data completeness", "Data accuracy", "Business rules", "Edge cases", "Security & governance", "Performance thresholds", "Formatting & presentation"]);
  const [visualsList, setVisualsList] = useState("");
  const [dashDesc, setDashDesc] = useState("");

  const [testCaseStatus, setTestCaseStatus] = useState<Record<string, "pass" | "fail" | null>>({});

  const handleFile = useCallback(async (f: File | undefined | null) => {
    if (!f) return;
    setError(null);
    try {
      const parsed = await parseExcelFile(f);
      if (!parsed.length) throw new Error("File appears empty.");
      setFile(f);
      setRows(parsed);
      setFields(Object.keys(parsed[0]));
    } catch (e: unknown) {
      setError("Could not read file: " + (e instanceof Error ? e.message : String(e)));
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const tab = TABS.find(t => t.key === activeTab)!;

  const runAnalysis = async () => {
    if (!fields.length) return;
    setLoading(true);
    setError(null);
    setLoadingStep(0);

    const controller = new AbortController();
    abortRef.current = controller;

    const stepInterval = setInterval(() => {
      setLoadingStep(prev => Math.min(prev + 1, tab.steps.length - 1));
    }, 2500);

    try {
      let body: Record<string, unknown> = { fields, sampleRows: rows.slice(0, 10) };
      if (activeTab === "sharing") body.stakeholder = stakeholder;
      if (activeTab === "dashboard") { body.businessQuestion = businessQuestion; body.audience = audience; body.dashboardType = dashboardType; }
      if (activeTab === "report") { body.stakeholder = stakeholder; body.reportPurpose = reportPurpose; body.reportFormat = reportFormat; }
      if (activeTab === "testcases") { body.reportPurpose = reportPurpose; body.testDepth = testDepth; body.testCategories = testCategories; }
      if (activeTab === "dashtest") { body.dashboardDescription = dashDesc; body.visualsList = visualsList; body.audience = audience; body.testDepth = testDepth; }

      const resp = await fetch(tab.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const data = await resp.json();
      if (!data.ok) throw new Error(data.error || "Analysis failed");

      const result = data.data as Record<string, unknown>;

      if (activeTab === "sharing") addSharingEligibilitySheet(result);
      if (activeTab === "dashboard") addDashboardDesignSheets(result);
      if (activeTab === "report") addReportTestSheet(result);
      if (activeTab === "testcases") addTestCaseSheets(result);
      if (activeTab === "dashtest") addDashboardTestSheet(result);

      const inputLabel = activeTab === "sharing" ? stakeholder : activeTab === "dashboard" ? businessQuestion : activeTab === "report" ? reportPurpose : activeTab === "testcases" ? reportPurpose : dashDesc;
      const entry: ThreadEntry = {
        id: `${activeTab}-${Date.now()}`,
        tab: activeTab,
        label: (inputLabel || "Analysis").substring(0, 60),
        timestamp: new Date().toLocaleString(),
        data: result,
        collapsed: false,
      };
      setThreads(prev => [entry, ...prev]);
      setExpandedThread(entry.id);
    } catch (e: unknown) {
      if ((e as Error).name !== "AbortError") {
        setError("Analysis failed: " + (e instanceof Error ? e.message : String(e)));
      }
    } finally {
      clearInterval(stepInterval);
      setLoading(false);
      abortRef.current = null;
    }
  };

  const stopGeneration = () => {
    abortRef.current?.abort();
    setLoading(false);
  };

  const currentThread = threads.find(t => t.id === expandedThread);
  const currentData = currentThread?.data;

  const toggleCategory = (cat: string) => {
    setTestCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: "#0A1628", fontFamily: "'Segoe UI', system-ui, sans-serif", color: "#E8EDF5", direction: isRtl ? "rtl" : "ltr" }}>

      <div style={{ width: 240, borderRight: "1px solid #1E4080", display: "flex", flexDirection: "column", background: "#0D1B2E", flexShrink: 0 }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #1E4080" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: "linear-gradient(135deg, #1A4B8C, #2E7D32)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🧠</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15 }}>BI Agent</div>
              <div style={{ fontSize: 10, color: "#5A8AB8", textTransform: "uppercase", letterSpacing: 1 }}>ZATCA Intelligence</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => navigate("/")} style={{ flex: 1, padding: "6px 0", borderRadius: 6, border: "1px solid #2A4A6E", background: "transparent", color: "#90B4D4", cursor: "pointer", fontSize: 11 }} data-testid="button-back-home">
              ← {isRtl ? "الرئيسية" : "Home"}
            </button>
            <button onClick={() => setLang(lang === "en" ? "ar" : "en")} style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #2A4A6E", background: "transparent", color: "#90B4D4", cursor: "pointer", fontSize: 11 }} data-testid="button-toggle-lang">
              🌐
            </button>
          </div>
        </div>

        <div style={{ padding: "12px 16px", borderBottom: "1px solid #1E4080" }}>
          <div style={{ fontSize: 10, color: "#5A8AB8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>{isRtl ? "التبويبة النشطة" : "Active Tab"}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 8, background: "rgba(26,75,140,0.3)", border: "1px solid #1A4B8C" }}>
            <span>{tab.icon}</span>
            <span style={{ fontSize: 12, fontWeight: 700 }}>{isRtl ? tab.labelAr : tab.label}</span>
          </div>
        </div>

        {file && (
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #1E4080" }}>
            <div style={{ fontSize: 10, color: "#5A8AB8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{isRtl ? "الملف" : "File"}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 8, background: "rgba(46,125,50,0.15)", border: "1px solid #2E7D3255" }}>
              <span>📊</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</div>
                <div style={{ fontSize: 10, color: "#5A8AB8" }}>{rows.length} rows · {fields.length} fields</div>
              </div>
              <button onClick={() => { setFile(null); setRows([]); setFields([]); }} style={{ background: "none", border: "none", color: "#5A8AB8", cursor: "pointer", fontSize: 14, padding: 2 }} data-testid="button-clear-file">✕</button>
            </div>
          </div>
        )}

        {hasSheets() && (
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #1E4080" }}>
            <button onClick={() => downloadBiReport()} style={{ width: "100%", padding: "10px 0", borderRadius: 8, border: "none", background: "linear-gradient(135deg, #1B5E20, #2E7D32)", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 12 }} data-testid="button-download-bi-report">
              ⬇ {isRtl ? "تحميل تقرير BI" : "Download BI Report"}
            </button>
          </div>
        )}

        <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
          <div style={{ fontSize: 10, color: "#5A8AB8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>{isRtl ? "الجلسات" : "Sessions"}</div>
          {threads.length === 0 && <div style={{ fontSize: 11, color: "#3A5A7E", fontStyle: "italic" }}>{isRtl ? "لا توجد نتائج بعد" : "No results yet"}</div>}
          {threads.map(t => {
            const tDef = TABS.find(tb => tb.key === t.tab)!;
            return (
              <div key={t.id} onClick={() => setExpandedThread(t.id === expandedThread ? null : t.id)} style={{ padding: "8px 10px", borderRadius: 8, marginBottom: 6, cursor: "pointer", background: t.id === expandedThread ? "rgba(26,75,140,0.3)" : "rgba(255,255,255,0.02)", border: `1px solid ${t.id === expandedThread ? "#1A4B8C" : "#1E4080"}`, transition: "all 0.15s" }} data-testid={`thread-${t.id}`}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 12 }}>{tDef.icon}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.label}</span>
                </div>
                <div style={{ fontSize: 9, color: "#5A8AB8", marginTop: 2 }}>{t.timestamp}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        <div style={{ display: "flex", borderBottom: "1px solid #1E4080", background: "#0D2E5C" }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)} style={{ flex: 1, padding: "12px 8px", border: "none", borderBottom: activeTab === t.key ? "3px solid #2E7D32" : "3px solid transparent", background: activeTab === t.key ? "rgba(26,75,140,0.3)" : "transparent", color: activeTab === t.key ? "#E8EDF5" : "#5A8AB8", cursor: "pointer", fontSize: 12, fontWeight: activeTab === t.key ? 700 : 500, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "all 0.15s" }} data-testid={`tab-${t.key}`}>
              <span>{t.icon}</span>
              <span>{isRtl ? t.labelAr : t.label}</span>
            </button>
          ))}
        </div>

        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", borderRight: "1px solid #1E4080" }}>
            <div style={{ flex: 1, padding: "24px 28px", overflowY: "auto" }}>

              {!file && (
                <div onDrop={handleDrop} onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onClick={() => inputRef.current?.click()} style={{ border: `2px dashed ${dragOver ? "#2E7D32" : "#2A4A6E"}`, borderRadius: 16, padding: "48px 32px", textAlign: "center", background: dragOver ? "rgba(46,125,50,0.08)" : "rgba(255,255,255,0.02)", cursor: "pointer", transition: "all 0.2s" }} data-testid="bi-upload-zone">
                  <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={e => handleFile(e.target.files?.[0])} data-testid="bi-input-file" />
                  <div style={{ fontSize: 48, marginBottom: 16 }}>📂</div>
                  <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{isRtl ? "أسقط ملف Excel أو CSV هنا" : "Drop your Excel or CSV file here"}</div>
                  <div style={{ color: "#5A8AB8", fontSize: 13 }}>.xlsx · .xls · .csv</div>
                </div>
              )}

              {file && !loading && (
                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid #1E4080", borderRadius: 12, padding: "20px 24px", marginBottom: 20 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: "#90B4D4" }}>{tab.icon} {isRtl ? tab.labelAr : tab.label}</div>

                  {(activeTab === "sharing" || activeTab === "report") && (
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ fontSize: 11, color: "#5A8AB8", display: "block", marginBottom: 4 }}>{isRtl ? "لمن هذا التقرير؟" : "Who is this report going to?"}</label>
                      <input value={stakeholder} onChange={e => setStakeholder(e.target.value)} placeholder={isRtl ? "مثال: وزارة المالية" : "e.g. Ministry of Finance, external vendor PwC"} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #2A4A6E", background: "#0A1628", color: "#E8EDF5", fontSize: 13, boxSizing: "border-box" }} data-testid="input-stakeholder" />
                    </div>
                  )}

                  {(activeTab === "report" || activeTab === "testcases") && (
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ fontSize: 11, color: "#5A8AB8", display: "block", marginBottom: 4 }}>{isRtl ? "ما الغرض من التقرير؟" : "Report purpose / business question"}</label>
                      <input value={reportPurpose} onChange={e => setReportPurpose(e.target.value)} placeholder={isRtl ? "مثال: اتجاهات الامتثال" : "e.g. monthly VAT compliance trends"} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #2A4A6E", background: "#0A1628", color: "#E8EDF5", fontSize: 13, boxSizing: "border-box" }} data-testid="input-report-purpose" />
                    </div>
                  )}

                  {activeTab === "dashboard" && (
                    <>
                      <div style={{ marginBottom: 14 }}>
                        <label style={{ fontSize: 11, color: "#5A8AB8", display: "block", marginBottom: 4 }}>{isRtl ? "سؤال الأعمال" : "Business question"}</label>
                        <input value={businessQuestion} onChange={e => setBusinessQuestion(e.target.value)} placeholder={isRtl ? "مثال: اتجاهات الامتثال الضريبي الشهرية حسب المنطقة" : "e.g. monthly VAT compliance trends by region"} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #2A4A6E", background: "#0A1628", color: "#E8EDF5", fontSize: 13, boxSizing: "border-box" }} data-testid="input-business-question" />
                      </div>
                      <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: 11, color: "#5A8AB8", display: "block", marginBottom: 4 }}>{isRtl ? "الجمهور" : "Audience"}</label>
                          <select value={audience} onChange={e => setAudience(e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #2A4A6E", background: "#0A1628", color: "#E8EDF5", fontSize: 13 }} data-testid="select-audience">
                            <option value="Internal ZATCA Team">{isRtl ? "فريق هيئة الزكاة الداخلي" : "Internal ZATCA Team"}</option>
                            <option value="Senior Management">{isRtl ? "الإدارة العليا" : "Senior Management"}</option>
                            <option value="External Stakeholder">{isRtl ? "أصحاب المصلحة الخارجيين" : "External Stakeholder"}</option>
                          </select>
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: 11, color: "#5A8AB8", display: "block", marginBottom: 4 }}>{isRtl ? "نوع اللوحة" : "Dashboard type"}</label>
                          <select value={dashboardType} onChange={e => setDashboardType(e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #2A4A6E", background: "#0A1628", color: "#E8EDF5", fontSize: 13 }} data-testid="select-dashboard-type">
                            <option value="Operational">{isRtl ? "تشغيلي (مراقبة يومية)" : "Operational (daily monitoring)"}</option>
                            <option value="Analytical">{isRtl ? "تحليلي (اتجاهات وأنماط)" : "Analytical (trends and patterns)"}</option>
                            <option value="Executive">{isRtl ? "تنفيذي (ملخص KPI)" : "Executive (KPI summary)"}</option>
                          </select>
                        </div>
                      </div>
                    </>
                  )}

                  {activeTab === "report" && (
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ fontSize: 11, color: "#5A8AB8", display: "block", marginBottom: 4 }}>{isRtl ? "صيغة التقرير" : "Report format"}</label>
                      <select value={reportFormat} onChange={e => setReportFormat(e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #2A4A6E", background: "#0A1628", color: "#E8EDF5", fontSize: 13 }} data-testid="select-report-format">
                        <option value="Tabular">{isRtl ? "جدولي" : "Tabular"}</option>
                        <option value="Summary">{isRtl ? "ملخص" : "Summary"}</option>
                        <option value="Pivot">{isRtl ? "محوري" : "Pivot"}</option>
                        <option value="Mixed">{isRtl ? "مختلط" : "Mixed"}</option>
                      </select>
                    </div>
                  )}

                  {(activeTab === "testcases" || activeTab === "dashtest") && (
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ fontSize: 11, color: "#5A8AB8", display: "block", marginBottom: 4 }}>{isRtl ? "عمق الاختبار" : "Test depth"}</label>
                      <select value={testDepth} onChange={e => setTestDepth(e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #2A4A6E", background: "#0A1628", color: "#E8EDF5", fontSize: 13 }} data-testid="select-test-depth">
                        <option value="Basic">{isRtl ? "أساسي (10–15 حالة)" : "Basic (10–15 cases)"}</option>
                        <option value="Standard">{isRtl ? "معياري (20–30 حالة)" : "Standard (20–30 cases)"}</option>
                        <option value="Comprehensive">{isRtl ? "شامل (40–50 حالة)" : "Comprehensive (40–50 cases)"}</option>
                      </select>
                    </div>
                  )}

                  {activeTab === "testcases" && (
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ fontSize: 11, color: "#5A8AB8", display: "block", marginBottom: 6 }}>{isRtl ? "فئات الاختبار" : "Test categories"}</label>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {["Data completeness", "Data accuracy", "Business rules", "Edge cases", "Security & governance", "Performance thresholds", "Formatting & presentation"].map(cat => (
                          <label key={cat} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: testCategories.includes(cat) ? "#E8EDF5" : "#5A8AB8", cursor: "pointer" }}>
                            <input type="checkbox" checked={testCategories.includes(cat)} onChange={() => toggleCategory(cat)} style={{ accentColor: "#2E7D32" }} />
                            {cat}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeTab === "dashtest" && (
                    <>
                      <div style={{ marginBottom: 14 }}>
                        <label style={{ fontSize: 11, color: "#5A8AB8", display: "block", marginBottom: 4 }}>{isRtl ? "وصف لوحة المعلومات" : "Dashboard description"}</label>
                        <input value={dashDesc} onChange={e => setDashDesc(e.target.value)} placeholder={isRtl ? "مثال: لوحة امتثال ضريبة القيمة المضافة — 3 صفحات، بطاقات KPI" : "e.g. VAT compliance dashboard — 3 pages, KPI cards, trend lines"} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #2A4A6E", background: "#0A1628", color: "#E8EDF5", fontSize: 13, boxSizing: "border-box" }} data-testid="input-dash-desc" />
                      </div>
                      <div style={{ marginBottom: 14 }}>
                        <label style={{ fontSize: 11, color: "#5A8AB8", display: "block", marginBottom: 4 }}>{isRtl ? "المرئيات" : "List the visuals"}</label>
                        <input value={visualsList} onChange={e => setVisualsList(e.target.value)} placeholder={isRtl ? "مثال: بطاقة KPI إجمالي الضريبة، مخطط شريطي حسب المنطقة" : "e.g. KPI card total VAT, bar chart by region, line chart by month"} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #2A4A6E", background: "#0A1628", color: "#E8EDF5", fontSize: 13, boxSizing: "border-box" }} data-testid="input-visuals-list" />
                      </div>
                      <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: 11, color: "#5A8AB8", display: "block", marginBottom: 4 }}>{isRtl ? "الجمهور" : "Audience"}</label>
                          <select value={audience} onChange={e => setAudience(e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #2A4A6E", background: "#0A1628", color: "#E8EDF5", fontSize: 13 }} data-testid="select-dashtest-audience">
                            <option value="Internal ZATCA Team">{isRtl ? "فريق هيئة الزكاة الداخلي" : "Internal ZATCA Team"}</option>
                            <option value="Senior Management">{isRtl ? "الإدارة العليا" : "Senior Management"}</option>
                            <option value="External Stakeholder">{isRtl ? "أصحاب المصلحة الخارجيين" : "External Stakeholder"}</option>
                          </select>
                        </div>
                      </div>
                    </>
                  )}

                  <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                    {loading ? (
                      <button onClick={stopGeneration} style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: "none", background: "#B71C1C", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 13 }} data-testid="button-stop">
                        ⬛ {isRtl ? "إيقاف" : "Stop"}
                      </button>
                    ) : (
                      <button onClick={runAnalysis} disabled={loading || !fields.length} style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: "none", background: "linear-gradient(135deg, #1A4B8C, #2E7D32)", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 13 }} data-testid="button-run">
                        ▶ {isRtl ? "تشغيل" : "Run Analysis"}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {loading && (
                <div style={{ textAlign: "center", padding: "48px 0", background: "rgba(255,255,255,0.02)", borderRadius: 16, border: "1px solid #1E4080", marginTop: 20 }} data-testid="bi-loading">
                  <div style={{ fontSize: 40, marginBottom: 16, animation: "spin 2s linear infinite" }}>⚙️</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center", maxWidth: 300, margin: "0 auto" }}>
                    {(isRtl ? tab.stepsAr : tab.steps).map((s, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: i <= loadingStep ? "#E8EDF5" : "#3A5A7E", fontWeight: i === loadingStep ? 700 : 400, transition: "all 0.3s" }}>
                        <span style={{ width: 20, height: 20, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, background: i < loadingStep ? "#2E7D32" : i === loadingStep ? "#1A4B8C" : "#1E4080", color: "#fff" }}>
                          {i < loadingStep ? "✓" : i === loadingStep ? "●" : "○"}
                        </span>
                        {s}
                      </div>
                    ))}
                  </div>
                  <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
                </div>
              )}

              {error && (
                <div style={{ background: "#2D1014", border: "1px solid #B71C1C", borderRadius: 12, padding: "16px 20px", color: "#EF9A9A", marginTop: 20 }} data-testid="bi-error">
                  ⚠️ {error}
                </div>
              )}

              {threads.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#5A8AB8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>{isRtl ? "سجل المحادثات" : "Thread History"}</div>
                  {threads.map(t => {
                    const tDef = TABS.find(tb => tb.key === t.tab)!;
                    return (
                      <div key={t.id} onClick={() => setExpandedThread(t.id === expandedThread ? null : t.id)} style={{ padding: "10px 14px", borderRadius: 10, marginBottom: 8, cursor: "pointer", background: t.id === expandedThread ? "rgba(26,75,140,0.2)" : "rgba(255,255,255,0.03)", border: `1px solid ${t.id === expandedThread ? "#1A4B8C" : "#1E4080"}`, transition: "all 0.15s" }} data-testid={`center-thread-${t.id}`}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 10, color: "#5A8AB8", transition: "transform 0.15s", transform: t.id === expandedThread ? "rotate(90deg)" : "rotate(0deg)" }}>▶</span>
                          <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700, background: "rgba(26,75,140,0.3)", color: "#90B4D4" }}>{tDef.icon} {isRtl ? tDef.labelAr : tDef.label}</span>
                          <span style={{ flex: 1, fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.label}</span>
                          <span style={{ fontSize: 10, color: "#5A8AB8", whiteSpace: "nowrap" }}>{t.timestamp}</span>
                        </div>
                        {t.id === expandedThread && (
                          <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #1E408044", fontSize: 11, color: "#90B4D4" }}>
                            {t.tab === "sharing" && <span>{isRtl ? "الحكم:" : "Verdict:"} {String((t.data as Record<string, unknown>).overall_verdict || "")}</span>}
                            {t.tab === "dashboard" && <span>{isRtl ? "العنوان:" : "Title:"} {String((t.data as Record<string, unknown>).dashboard_title || "")}</span>}
                            {t.tab === "report" && <span>{isRtl ? "التوصية:" : "Rec:"} {String((t.data as Record<string, unknown>).send_recommendation || "")}</span>}
                            {(t.tab === "testcases" || t.tab === "dashtest") && <span>{isRtl ? "الحالات:" : "Cases:"} {String((t.data as Record<string, unknown>).total_test_cases || 0)}</span>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div style={{ width: 420, flexShrink: 0, overflowY: "auto", padding: "20px 20px", background: "#0D1B2E" }}>
            {!currentData && (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "#3A5A7E" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
                <div style={{ fontSize: 13 }}>{isRtl ? "اختر محادثة لعرض النتائج" : "Select a thread to view results"}</div>
              </div>
            )}
            {currentData && currentThread && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#90B4D4" }}>{isRtl ? "النتائج" : "Output"}</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => { setExpandedThread(null); }} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #2A4A6E", background: "transparent", color: "#90B4D4", cursor: "pointer", fontSize: 10 }} data-testid="button-new-run">
                      ✕
                    </button>
                    {hasSheets() && (
                      <button onClick={() => downloadBiReport()} style={{ padding: "4px 10px", borderRadius: 6, border: "none", background: "linear-gradient(135deg, #1B5E20, #2E7D32)", color: "#fff", fontWeight: 600, cursor: "pointer", fontSize: 10 }} data-testid="button-download-result">
                        ⬇ {isRtl ? "تحميل bi_agent_report.xlsx" : "Download bi_agent_report.xlsx"}
                      </button>
                    )}
                  </div>
                </div>
                {currentThread.tab === "sharing" && <SharingResult data={currentData} isRtl={isRtl} />}
                {currentThread.tab === "dashboard" && <DashboardResult data={currentData} isRtl={isRtl} />}
                {currentThread.tab === "report" && <ReportResult data={currentData} isRtl={isRtl} />}
                {currentThread.tab === "testcases" && <TestCaseResult data={currentData} isRtl={isRtl} testStatus={testCaseStatus} setTestStatus={setTestCaseStatus} />}
                {currentThread.tab === "dashtest" && <DashboardTestResult data={currentData} isRtl={isRtl} testStatus={testCaseStatus} setTestStatus={setTestCaseStatus} />}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SharingResult({ data, isRtl }: { data: Record<string, unknown>; isRtl: boolean }) {
  const [expandedField, setExpandedField] = useState<string | null>(null);
  const verdict = String(data.overall_verdict || "BLOCKED");
  const vc = VERDICT_COLORS[verdict] || VERDICT_COLORS.BLOCKED;
  const assessments = (data.field_assessments || []) as Record<string, unknown>[];
  const checklist = (data.approval_checklist || []) as Record<string, unknown>[];
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());

  return (
    <>
      <div style={{ background: `${vc.bg}22`, border: `2px solid ${vc.border}55`, borderLeft: `6px solid ${vc.border}`, borderRadius: 16, padding: "24px 28px", marginBottom: 20 }} data-testid="bi-verdict-banner">
        <div style={{ fontSize: 22, fontWeight: 800, color: vc.fg, marginBottom: 6 }}>{verdict}</div>
        <div style={{ fontSize: 13, color: "#90B4D4", marginBottom: 8 }}>{String(data.verdict_rationale || "")}</div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12 }}>
          <span style={{ color: "#5A8AB8" }}>{isRtl ? "التصنيف:" : "Classification:"} <strong style={{ color: "#E8EDF5" }}>{String(data.overall_classification || "")}</strong></span>
          <span style={{ color: "#5A8AB8" }}>{isRtl ? "الحقل المهيمن:" : "Governing:"} <strong style={{ color: "#FFD580" }}>{String(data.governing_field || "")}</strong></span>
          <span style={{ color: "#5A8AB8" }}>{isRtl ? "مستوى الجانب:" : "Tier:"} <strong style={{ color: "#E8EDF5" }}>{String(data.stakeholder_tier || "")}</strong></span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: isRtl ? "عام" : "General Public", tier: "PUBLIC" },
          { label: isRtl ? "قطاع خاص" : "Private Sector", tier: "PRIVATE_SECTOR" },
          { label: isRtl ? "جهات حكومية" : "Gov. Entities", tier: "INTERNAL_GOV" },
        ].map(rec => {
          const tierAssess = assessments.map(f => {
            const tier = rec.tier;
            const cls = String(f.classification_code || "P");
            if (cls === "P") return { field: String(f.field_name), verdict: "SEND" };
            if (cls === "TS") return { field: String(f.field_name), verdict: "BLOCK" };
            if (cls === "S") return { field: String(f.field_name), verdict: tier === "INTERNAL_ZATCA" ? "CONDITIONAL" : tier === "INTERNAL_GOV" ? "CONDITIONAL" : "BLOCK" };
            if (tier === "PUBLIC") return { field: String(f.field_name), verdict: "BLOCK" };
            if (tier === "PRIVATE_SECTOR") return { field: String(f.field_name), verdict: "CONDITIONAL" };
            return { field: String(f.field_name), verdict: tier === "INTERNAL_ZATCA" ? "SEND" : "CONDITIONAL" };
          });
          const blocked = tierAssess.filter(a => a.verdict === "BLOCK");
          const cond = tierAssess.filter(a => a.verdict === "CONDITIONAL");
          const recVerdict = blocked.length > 0 ? "BLOCK" : cond.length > 0 ? "CONDITIONAL" : "SEND";
          const recIcon = recVerdict === "SEND" ? "✓" : recVerdict === "BLOCK" ? "✕" : "◐";
          const recColor = recVerdict === "SEND" ? "#2E7D32" : recVerdict === "BLOCK" ? "#B71C1C" : "#E65100";
          return (
            <div key={rec.tier} style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${recColor}55`, borderTop: `4px solid ${recColor}`, borderRadius: 12, padding: "16px 14px" }} data-testid={`recipient-${rec.tier}`}>
              <div style={{ fontSize: 14, fontWeight: 700, color: recColor, marginBottom: 8 }}>{recIcon} {rec.label}</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: recColor, marginBottom: 6, textTransform: "uppercase" }}>{recVerdict}</div>
              {cond.length > 0 && recVerdict !== "BLOCK" && (
                <div style={{ fontSize: 10, color: "#C8D8EA" }}>
                  {cond.map((c, i) => <div key={i} style={{ padding: "2px 0" }}>◐ {c.field}</div>)}
                </div>
              )}
              {blocked.length > 0 && (
                <div style={{ fontSize: 10, color: "#EF9A9A" }}>
                  {blocked.map((b, i) => <div key={i} style={{ padding: "2px 0" }}>✕ {b.field}</div>)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {checklist.length > 0 && (
        <div style={{ background: "rgba(230,81,0,0.08)", border: "1px solid #E6510055", borderRadius: 12, padding: "16px 20px", marginBottom: 20 }} data-testid="approval-checklist">
          <div style={{ fontSize: 13, fontWeight: 700, color: "#E65100", marginBottom: 10 }}>📋 {isRtl ? "قائمة الموافقات" : "Approval Checklist"}</div>
          {checklist.map((item, i) => (
            <label key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "6px 0", fontSize: 12, color: "#C8D8EA", cursor: "pointer" }}>
              <input type="checkbox" checked={checkedItems.has(i)} onChange={() => setCheckedItems(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; })} style={{ accentColor: "#2E7D32", marginTop: 2 }} />
              <div>
                <div style={{ fontWeight: 600 }}>{String(item.item || "")}</div>
                <div style={{ fontSize: 10, color: "#5A8AB8" }}>{isRtl ? "المالك:" : "Owner:"} {String(item.owner || "")} · {isRtl ? "الحقول:" : "Fields:"} {((item.required_for_fields || []) as string[]).join(", ")}</div>
              </div>
            </label>
          ))}
        </div>
      )}

      {assessments.filter(f => f.remediation_action && f.remediation_action !== "NO ACTION").length > 0 && (
        <div style={{ background: "rgba(230,81,0,0.06)", border: "2px solid #E6510044", borderRadius: 12, padding: "16px 20px", marginBottom: 20 }} data-testid="remediation-plan">
          <div style={{ fontSize: 13, fontWeight: 700, color: "#E65100", marginBottom: 10 }}>🔧 {isRtl ? "خطة المعالجة" : "Remediation Plan"}</div>
          {assessments.filter(f => f.remediation_action && f.remediation_action !== "NO ACTION").map((f, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "6px 0", fontSize: 12, color: "#C8D8EA" }}>
              <span style={{ padding: "1px 6px", borderRadius: 4, fontSize: 9, fontWeight: 700, background: "#E6510033", color: "#FFB74D", whiteSpace: "nowrap" }}>{String(f.remediation_action)}</span>
              <div>
                <span style={{ fontWeight: 600 }}>{String(f.field_name)}</span>
                <span style={{ color: "#5A8AB8" }}> — {String(f.remediation_detail || "")}</span>
              </div>
            </div>
          ))}
          {data.safe_version_possible && (
            <div style={{ marginTop: 12, padding: "10px 14px", background: "rgba(46,125,50,0.1)", border: "1px solid #2E7D3244", borderRadius: 8, fontSize: 11, color: "#81C784" }}>
              <strong>{isRtl ? "نسخة آمنة ممكنة:" : "Safe version possible:"}</strong> {String(data.safe_version_instructions || "")}
            </div>
          )}
        </div>
      )}

      {data.pdpl_exposure && (
        <div style={{ background: "rgba(183,28,28,0.1)", border: "1px solid #B71C1C55", borderLeft: "4px solid #B71C1C", borderRadius: 12, padding: "16px 20px", marginBottom: 20 }} data-testid="pdpl-warning">
          <div style={{ fontSize: 13, fontWeight: 700, color: "#EF9A9A", marginBottom: 4 }}>⚠️ {isRtl ? "تحذير PDPL" : "PDPL Exposure Warning"}</div>
          <div style={{ fontSize: 12, color: "#C8D8EA" }}>{String(data.pdpl_exposure_note || "")}</div>
        </div>
      )}

      {assessments.length > 0 && (
        <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid #1E4080" }} data-testid="bi-field-table">
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 700 }}>
              <thead>
                <tr style={{ background: "#0D2E5C" }}>
                  {[isRtl ? "الحقل" : "Field", isRtl ? "التصنيف" : "Classification", "PII", isRtl ? "الحكم" : "Verdict", isRtl ? "المعالجة" : "Remediation", isRtl ? "قاعدة NDMO" : "NDMO Rule"].map(h => (
                    <th key={h} style={{ padding: "10px 12px", textAlign: isRtl ? "right" : "left", fontSize: 10, color: "#5A8AB8", fontWeight: 700, letterSpacing: 0.5, borderBottom: "1px solid #1E4080", whiteSpace: "nowrap" }}>{h.toUpperCase()}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {assessments.map((f, idx) => {
                  const expanded = expandedField === String(f.field_name);
                  return (
                    <Fragment key={String(f.field_name)}>
                      <tr onClick={() => setExpandedField(expanded ? null : String(f.field_name))} style={{ background: idx % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent", cursor: "pointer" }} data-testid={`row-bi-field-${f.field_name}`}>
                        <td style={{ padding: "10px 12px", fontWeight: 600 }}>{String(f.field_name)}</td>
                        <td style={{ padding: "10px 12px" }}>
                          <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 800, background: f.classification_code === "TS" ? "#1A1A2E" : f.classification_code === "S" ? "#C0392B" : f.classification_code === "C" ? "#E65100" : "#1B5E20", color: "#fff", fontFamily: "monospace" }}>{String(f.classification_code)}</span>
                        </td>
                        <td style={{ padding: "10px 12px" }}>{f.is_pii ? <span style={{ color: "#EF9A9A", fontWeight: 700 }}>YES</span> : <span style={{ color: "#5A8AB8" }}>NO</span>}</td>
                        <td style={{ padding: "10px 12px" }}>
                          <span style={{ padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 700, background: f.stakeholder_verdict === "SEND" ? "#E8F5E922" : f.stakeholder_verdict === "BLOCK" ? "#FFEBEE22" : "#FFF3E022", color: f.stakeholder_verdict === "SEND" ? "#2E7D32" : f.stakeholder_verdict === "BLOCK" ? "#B71C1C" : "#E65100", border: `1px solid ${f.stakeholder_verdict === "SEND" ? "#2E7D3255" : f.stakeholder_verdict === "BLOCK" ? "#B71C1C55" : "#E6510055"}` }}>{String(f.stakeholder_verdict)}</span>
                        </td>
                        <td style={{ padding: "10px 12px", fontSize: 11, color: "#90B4D4" }}>{String(f.remediation_action || "")}</td>
                        <td style={{ padding: "10px 12px", fontSize: 11, color: "#5A8AB8" }}>{String(f.ndmo_rule_applied || "")}</td>
                      </tr>
                      {expanded && (
                        <tr>
                          <td colSpan={6} style={{ background: "rgba(26,75,140,0.08)", padding: "12px 20px", fontSize: 11, color: "#C8D8EA" }}>
                            <div><strong>{isRtl ? "التفاصيل:" : "Detail:"}</strong> {String(f.remediation_detail || "")}</div>
                            <div style={{ marginTop: 4 }}><strong>{isRtl ? "العينة:" : "Sample:"}</strong> {((f.sample_values || []) as string[]).join(", ")}</div>
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
      )}
    </>
  );
}

function DashboardResult({ data, isRtl }: { data: Record<string, unknown>; isRtl: boolean }) {
  const [activePage, setActivePage] = useState(0);
  const [expandedDax, setExpandedDax] = useState<number | null>(null);
  const pages = (data.pages || []) as Record<string, unknown>[];
  const dax = (data.dax_measures || []) as Record<string, unknown>[];
  const kpis = (data.kpis || []) as Record<string, unknown>[];
  const slicers = (data.slicers || []) as Record<string, unknown>[];
  const pqSteps = (data.power_query_steps || []) as string[];
  const colorTheme = data.color_theme_json as Record<string, unknown> | undefined;

  const VISUAL_COLORS: Record<string, string> = { "KPI Card": "#1A4B8C", "Bar Chart": "#2E7D32", "Line Chart": "#2E7D32", "Donut Chart": "#E65100", "Slicer": "#6B7280", "Table": "#0D2E5C", "Matrix": "#0D2E5C" };

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>{String(data.dashboard_title || "")}</div>
        <div style={{ display: "flex", gap: 10, fontSize: 12 }}>
          <span style={{ padding: "2px 10px", borderRadius: 10, background: "rgba(26,75,140,0.3)", border: "1px solid #1A4B8C55", color: "#90B4D4" }}>{String(data.dashboard_type || "")}</span>
          <span style={{ padding: "2px 10px", borderRadius: 10, background: "rgba(46,125,50,0.15)", border: "1px solid #2E7D3255", color: "#81C784" }}>{String(data.audience || "")}</span>
        </div>
      </div>

      {kpis.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(kpis.length, 5)}, 1fr)`, gap: 12, marginBottom: 20 }}>
          {kpis.map((k, i) => (
            <div key={i} style={{ background: "rgba(26,75,140,0.15)", border: "1px solid #1A4B8C55", borderRadius: 12, padding: "14px 16px" }} data-testid={`kpi-card-${i}`}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#90B4D4", marginBottom: 6 }}>{String(k.kpi_name || "")}</div>
              <div style={{ fontSize: 10, color: "#5A8AB8", fontFamily: "monospace", marginBottom: 6 }}>{String(k.dax_formula || "").substring(0, 60)}</div>
              <div style={{ display: "flex", gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#2E7D32" }} title={String(k.green_threshold || "")} />
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#F59E0B" }} title={String(k.amber_threshold || "")} />
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#B71C1C" }} title={String(k.red_threshold || "")} />
              </div>
            </div>
          ))}
        </div>
      )}

      {pages.length > 1 && (
        <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
          {pages.map((p, i) => (
            <button key={i} onClick={() => setActivePage(i)} style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid #1E4080", background: i === activePage ? "rgba(26,75,140,0.3)" : "transparent", color: i === activePage ? "#E8EDF5" : "#5A8AB8", cursor: "pointer", fontSize: 11, fontWeight: i === activePage ? 700 : 400 }} data-testid={`page-tab-${i}`}>
              {String(p.page_title || `Page ${i + 1}`)}
            </button>
          ))}
        </div>
      )}

      {pages[activePage] && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
          {((pages[activePage].visuals || []) as Record<string, unknown>[]).map((v, i) => {
            const vType = String(v.visual_type || "");
            const borderColor = VISUAL_COLORS[vType] || "#1A4B8C";
            return (
              <div key={i} style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${borderColor}55`, borderTop: `3px solid ${borderColor}`, borderRadius: 10, padding: "14px 16px" }} data-testid={`visual-card-${v.visual_id}`}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 9, fontWeight: 800, background: `${borderColor}33`, color: borderColor, fontFamily: "monospace" }}>{vType}</span>
                  <span style={{ fontSize: 10, color: "#5A8AB8" }}>{String(v.visual_id || "")}</span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{String(v.title || "")}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
                  {((v.fields_used || []) as string[]).map(f => (
                    <span key={f} style={{ padding: "1px 6px", borderRadius: 6, fontSize: 9, background: "rgba(26,75,140,0.2)", color: "#90B4D4" }}>{f}</span>
                  ))}
                </div>
                <div style={{ fontSize: 10, color: "#5A8AB8" }}>{String(v.insight_purpose || "")}</div>
                {v.dax_measure && (
                  <div style={{ marginTop: 6, padding: "4px 8px", borderRadius: 6, background: "#0A1628", fontFamily: "monospace", fontSize: 9, color: "#81C784", overflowX: "auto" }}>{String(v.dax_measure)}</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {dax.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#5A8AB8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>{isRtl ? "مقاييس DAX" : "DAX Measures"}</div>
          {dax.map((m, i) => (
            <div key={i} style={{ marginBottom: 6 }}>
              <div onClick={() => setExpandedDax(expandedDax === i ? null : i)} style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid #1E4080", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }} data-testid={`dax-${i}`}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>{String(m.measure_name || "")}</span>
                <span style={{ fontSize: 10, color: "#5A8AB8" }}>{expandedDax === i ? "▲" : "▼"}</span>
              </div>
              {expandedDax === i && (
                <div style={{ padding: "10px 14px", background: "#0A1628", border: "1px solid #1E4080", borderTop: "none", borderRadius: "0 0 8px 8px" }}>
                  <div style={{ fontFamily: "monospace", fontSize: 11, color: "#81C784", whiteSpace: "pre-wrap", marginBottom: 6 }}>{String(m.formula || "")}</div>
                  <div style={{ fontSize: 11, color: "#5A8AB8" }}>{String(m.description || "")}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {pqSteps.length > 0 && (
        <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid #F59E0B55", borderRadius: 12, padding: "16px 20px", marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#F59E0B", marginBottom: 10 }}>{isRtl ? "خطوات Power Query" : "Power Query Steps"}</div>
          <ol style={{ paddingLeft: 20, margin: 0, fontSize: 12, color: "#C8D8EA", lineHeight: 2 }}>
            {pqSteps.map((s, i) => <li key={i}>{s}</li>)}
          </ol>
        </div>
      )}

      {slicers.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#5A8AB8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>{isRtl ? "الفلاتر" : "Slicers"}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
            {slicers.map((s, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid #1E4080", borderRadius: 8, padding: "10px 14px" }}>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{String(s.field_name || "")}</div>
                <div style={{ fontSize: 10, color: "#5A8AB8" }}>{String(s.slicer_type || "")}</div>
                <div style={{ fontSize: 9, color: "#3A5A7E", marginTop: 4 }}>{isRtl ? "يتحكم في:" : "Controls:"} {((s.controls_visuals || []) as string[]).join(", ")}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {colorTheme && (
        <div style={{ marginBottom: 20 }}>
          <button onClick={() => { navigator.clipboard.writeText(JSON.stringify(colorTheme, null, 2)); }} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #1A4B8C", background: "transparent", color: "#90B4D4", cursor: "pointer", fontSize: 12 }} data-testid="button-copy-theme">
            📋 {isRtl ? "نسخ JSON الثيم" : "Copy Theme JSON"}
          </button>
        </div>
      )}
    </>
  );
}

function ReportResult({ data, isRtl }: { data: Record<string, unknown>; isRtl: boolean }) {
  const [expandedSection, setExpandedSection] = useState<string | null>("governance");
  const verdict = String(data.governance_verdict || "BLOCKED");
  const sendRec = String(data.send_recommendation || "DO NOT SEND");
  const score = Number(data.overall_quality_score || 0);
  const grade = String(data.quality_grade || "F");
  const dims = (data.dimension_scores || {}) as Record<string, number>;
  const govIssues = (data.governance_issues || []) as Record<string, unknown>[];
  const dqIssues = (data.data_quality_issues || []) as Record<string, unknown>[];
  const blIssues = (data.business_logic_issues || []) as Record<string, unknown>[];
  const prIssues = (data.presentation_issues || []) as Record<string, unknown>[];
  const checklist = (data.pre_send_checklist || []) as string[];
  const recColOrder = (data.recommended_column_order || []) as string[];
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());

  const sendColor = sendRec === "SEND NOW" ? "#2E7D32" : sendRec === "SEND AFTER FIXES" ? "#E65100" : "#B71C1C";
  const vc = VERDICT_COLORS[verdict] || VERDICT_COLORS.BLOCKED;

  const scoreColor = (v: number) => v >= 80 ? "#2E7D32" : v >= 60 ? "#F59E0B" : "#B71C1C";

  const sections = [
    { key: "governance", label: isRtl ? "الحوكمة" : "Governance", issues: govIssues },
    { key: "quality", label: isRtl ? "جودة البيانات" : "Data Quality", issues: dqIssues },
    { key: "logic", label: isRtl ? "منطق الأعمال" : "Business Logic", issues: blIssues },
    { key: "presentation", label: isRtl ? "العرض" : "Presentation", issues: prIssues },
  ];

  return (
    <>
      <div style={{ display: "flex", gap: 16, marginBottom: 20, alignItems: "stretch" }}>
        <div style={{ flex: 1, background: `${vc.bg}22`, border: `2px solid ${vc.border}55`, borderRadius: 16, padding: "20px 24px", display: "flex", alignItems: "center", gap: 20 }} data-testid="report-verdict-banner">
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: `${sendColor}22`, border: `3px solid ${sendColor}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ fontSize: 28, fontWeight: 900, color: sendColor }}>{score}</span>
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: sendColor }}>{sendRec}</div>
            <div style={{ fontSize: 12, color: "#90B4D4", marginTop: 2 }}>{isRtl ? "الحكم:" : "Governance:"} <strong style={{ color: vc.fg }}>{verdict}</strong> · {isRtl ? "الدرجة:" : "Grade:"} <strong style={{ color: "#E8EDF5" }}>{grade}</strong></div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        {Object.entries(dims).map(([k, v]) => (
          <div key={k} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid #1E4080", borderRadius: 10, padding: "12px 14px" }} data-testid={`dim-${k}`}>
            <div style={{ fontSize: 11, color: "#5A8AB8", marginBottom: 6 }}>{k.replace(/_/g, " ")}</div>
            <div style={{ background: "#0A1628", borderRadius: 6, height: 8, overflow: "hidden" }}>
              <div style={{ width: `${v}%`, height: "100%", background: scoreColor(v), borderRadius: 6, transition: "width 0.5s" }} />
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: scoreColor(v), marginTop: 4 }}>{v}/100</div>
          </div>
        ))}
      </div>

      {sections.map(sec => (
        <div key={sec.key} style={{ marginBottom: 12 }}>
          <div onClick={() => setExpandedSection(expandedSection === sec.key ? null : sec.key)} style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid #1E4080", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }} data-testid={`section-${sec.key}`}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{sec.label} ({sec.issues.length})</span>
            <span style={{ fontSize: 10, color: "#5A8AB8" }}>{expandedSection === sec.key ? "▲" : "▼"}</span>
          </div>
          {expandedSection === sec.key && sec.issues.length > 0 && (
            <div style={{ border: "1px solid #1E4080", borderTop: "none", borderRadius: "0 0 8px 8px", overflow: "hidden" }}>
              {sec.issues.map((issue, i) => {
                const sev = String((issue as Record<string, unknown>).severity || "Medium");
                const sc = SEVERITY_COLORS[sev] || SEVERITY_COLORS.Medium;
                return (
                  <div key={i} style={{ padding: "10px 14px", borderBottom: "1px solid #1E408044", borderLeft: sev === "Critical" ? "4px solid #B71C1C" : "4px solid transparent", background: i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      {sev && <span style={{ padding: "1px 6px", borderRadius: 4, fontSize: 9, fontWeight: 700, background: sc.bg, color: sc.fg }}>{sev}</span>}
                      <span style={{ fontSize: 11, fontWeight: 600 }}>{String((issue as Record<string, unknown>).issue_id || (issue as Record<string, unknown>).field_name || "")}</span>
                    </div>
                    <div style={{ fontSize: 11, color: "#C8D8EA" }}>{String((issue as Record<string, unknown>).description || (issue as Record<string, unknown>).remediation || `${(issue as Record<string, unknown>).current_value} → ${(issue as Record<string, unknown>).recommended_value}`)}</div>
                    {(issue as Record<string, unknown>).fix_recommendation && <div style={{ fontSize: 10, color: "#81C784", marginTop: 4 }}>{isRtl ? "إصلاح:" : "Fix:"} {String((issue as Record<string, unknown>).fix_recommendation)}</div>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}

      {checklist.length > 0 && (
        <div style={{ background: "rgba(26,75,140,0.08)", border: "1px solid #1A4B8C55", borderRadius: 12, padding: "16px 20px", marginTop: 16 }} data-testid="pre-send-checklist">
          <div style={{ fontSize: 13, fontWeight: 700, color: "#90B4D4", marginBottom: 10 }}>✅ {isRtl ? "قائمة ما قبل الإرسال" : "Pre-Send Checklist"}</div>
          {checklist.map((item, i) => (
            <label key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", fontSize: 12, color: "#C8D8EA", cursor: "pointer" }}>
              <input type="checkbox" checked={checkedItems.has(i)} onChange={() => setCheckedItems(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; })} style={{ accentColor: "#2E7D32" }} />
              {item}
            </label>
          ))}
        </div>
      )}

      {recColOrder.length > 0 && (
        <div style={{ background: "rgba(26,75,140,0.08)", border: "1px solid #1A4B8C55", borderRadius: 12, padding: "16px 20px", marginTop: 16 }} data-testid="recommended-column-order">
          <div style={{ fontSize: 13, fontWeight: 700, color: "#90B4D4", marginBottom: 10 }}>📋 {isRtl ? "ترتيب الأعمدة المقترح" : "Recommended Column Order"}</div>
          <ol style={{ paddingLeft: 20, margin: 0 }}>
            {recColOrder.map((col, i) => (
              <li key={i} style={{ fontSize: 12, color: "#C8D8EA", padding: "3px 0" }}>{col}</li>
            ))}
          </ol>
        </div>
      )}
    </>
  );
}

function TestCaseResult({ data, isRtl, testStatus, setTestStatus }: { data: Record<string, unknown>; isRtl: boolean; testStatus: Record<string, "pass" | "fail" | null>; setTestStatus: (fn: (prev: Record<string, "pass" | "fail" | null>) => Record<string, "pass" | "fail" | null>) => void }) {
  const cases = (data.test_cases || []) as Record<string, unknown>[];
  const coverage = (data.coverage_summary || {}) as Record<string, number>;
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [expandedCase, setExpandedCase] = useState<string | null>(null);
  const totalCases = cases.length;
  const passed = cases.filter(tc => testStatus[String(tc.tc_id)] === "pass").length;
  const failed = cases.filter(tc => testStatus[String(tc.tc_id)] === "fail").length;
  const notRun = totalCases - passed - failed;

  const TC_CATEGORIES_AR: Record<string, string> = { "Data Completeness": "اكتمال البيانات", "Data Accuracy": "دقة البيانات", "Business Rules": "قواعد العمل", "Edge Cases": "حالات حدية", "Security & Governance": "الأمن والحوكمة", "Performance": "الأداء", "Formatting": "التنسيق" };
  const categories = [...new Set(cases.map(tc => String(tc.category || "")))];
  const filtered = activeCategory ? cases.filter(tc => String(tc.category) === activeCategory) : cases;

  const donutData = Object.entries(coverage).filter(([, v]) => v > 0).map(([k, v]) => ({ name: k.replace(/_/g, " "), value: v }));

  return (
    <>
      <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ background: "rgba(26,75,140,0.15)", border: "1px solid #1A4B8C55", borderRadius: 10, padding: "12px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#E8EDF5" }}>{totalCases}</div>
            <div style={{ fontSize: 10, color: "#5A8AB8" }}>{isRtl ? "المجموع" : "Total"}</div>
          </div>
          <div style={{ background: "rgba(183,28,28,0.15)", border: "1px solid #B71C1C55", borderRadius: 10, padding: "12px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#EF9A9A" }}>{Number(data.critical_test_count || 0)}</div>
            <div style={{ fontSize: 10, color: "#5A8AB8" }}>{isRtl ? "حرجة" : "Critical"}</div>
          </div>
          <div style={{ background: "rgba(46,125,50,0.15)", border: "1px solid #2E7D3255", borderRadius: 10, padding: "12px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#81C784" }}>{Number(data.total_estimated_duration_minutes || 0)}</div>
            <div style={{ fontSize: 10, color: "#5A8AB8" }}>{isRtl ? "دقائق" : "min"}</div>
          </div>
        </div>
        {donutData.length > 0 && (
          <div style={{ width: 140, height: 140 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={donutData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={2}>
                  {donutData.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid #1E4080", borderRadius: 10, padding: "10px 14px", marginBottom: 16, display: "flex", gap: 16, alignItems: "center" }} data-testid="test-progress">
        <div style={{ fontSize: 11, color: "#5A8AB8" }}>{isRtl ? "التقدم:" : "Progress:"}</div>
        <div style={{ flex: 1, background: "#0A1628", borderRadius: 6, height: 12, overflow: "hidden", display: "flex" }}>
          {passed > 0 && <div style={{ width: `${(passed / totalCases) * 100}%`, background: "#2E7D32", height: "100%" }} />}
          {failed > 0 && <div style={{ width: `${(failed / totalCases) * 100}%`, background: "#B71C1C", height: "100%" }} />}
        </div>
        <div style={{ fontSize: 10, color: "#90B4D4", whiteSpace: "nowrap" }}>
          <span style={{ color: "#81C784" }}>{passed}✓</span> / <span style={{ color: "#EF9A9A" }}>{failed}✕</span> / {notRun}○
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        <button onClick={() => setActiveCategory(null)} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #1E4080", background: activeCategory === null ? "rgba(26,75,140,0.3)" : "transparent", color: activeCategory === null ? "#E8EDF5" : "#5A8AB8", cursor: "pointer", fontSize: 10 }}>{isRtl ? "الكل" : "All"}</button>
        {categories.map(cat => (
          <button key={cat} onClick={() => setActiveCategory(cat)} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #1E4080", background: activeCategory === cat ? "rgba(26,75,140,0.3)" : "transparent", color: activeCategory === cat ? "#E8EDF5" : "#5A8AB8", cursor: "pointer", fontSize: 10 }} data-testid={`cat-filter-${cat}`}>{isRtl ? TC_CATEGORIES_AR[cat] || cat : cat}</button>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <button onClick={() => { exportTestRun(cases, testStatus); downloadBiReport(); }} style={{ padding: "6px 14px", borderRadius: 6, border: "none", background: "linear-gradient(135deg, #1B5E20, #2E7D32)", color: "#fff", fontWeight: 600, cursor: "pointer", fontSize: 11 }} data-testid="button-export-test-run">
          ⬇ {isRtl ? "تصدير نتائج الاختبار" : "Export Test Run"}
        </button>
      </div>

      {filtered.map((tc, i) => {
        const tcId = String(tc.tc_id || "");
        const sev = String(tc.severity || "Medium");
        const sc = SEVERITY_COLORS[sev] || SEVERITY_COLORS.Medium;
        const expanded = expandedCase === tcId;
        const status = testStatus[tcId];
        return (
          <div key={i} style={{ marginBottom: 8, border: "1px solid #1E4080", borderRadius: 10, overflow: "hidden", borderLeft: sev === "Critical" ? "4px solid #B71C1C" : "4px solid transparent" }} data-testid={`tc-${tcId}`}>
            <div onClick={() => setExpandedCase(expanded ? null : tcId)} style={{ padding: "10px 14px", background: "rgba(255,255,255,0.03)", cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 9, fontWeight: 700, background: "#1A4B8C", color: "#fff", fontFamily: "monospace" }}>{tcId}</span>
              <span style={{ padding: "2px 6px", borderRadius: 4, fontSize: 9, fontWeight: 700, background: sc.bg, color: sc.fg }}>{sev}</span>
              <span style={{ flex: 1, fontSize: 12, fontWeight: 600 }}>{String(tc.test_name || "")}</span>
              <span style={{ fontSize: 10, color: "#5A8AB8" }}>{tc.estimated_duration_minutes}m</span>
              <span style={{ fontSize: 10 }}>{expanded ? "▲" : "▼"}</span>
            </div>
            {expanded && (
              <div style={{ padding: "12px 14px", background: "#0A162899" }}>
                <div style={{ fontSize: 11, color: "#C8D8EA", marginBottom: 8 }}><strong>{isRtl ? "الهدف:" : "Objective:"}</strong> {String(tc.objective || "")}</div>
                <div style={{ fontSize: 11, color: "#C8D8EA", marginBottom: 8 }}><strong>{isRtl ? "المتطلبات:" : "Preconditions:"}</strong> {String(tc.preconditions || "")}</div>
                <div style={{ fontSize: 11, color: "#C8D8EA", marginBottom: 8 }}>
                  <strong>{isRtl ? "الخطوات:" : "Steps:"}</strong>
                  <ol style={{ paddingLeft: 20, margin: "4px 0", lineHeight: 1.8 }}>
                    {((tc.test_steps || []) as string[]).map((s, j) => <li key={j}>{s}</li>)}
                  </ol>
                </div>
                <div style={{ fontSize: 11, color: "#C8D8EA", marginBottom: 8 }}><strong>{isRtl ? "البيانات:" : "Test data:"}</strong> {String(tc.test_data || "")}</div>
                <div style={{ fontSize: 11, color: "#81C784", marginBottom: 8 }}><strong>{isRtl ? "المتوقع:" : "Expected:"}</strong> {String(tc.expected_result || "")}</div>
                <div style={{ fontSize: 11, color: "#5A8AB8", marginBottom: 8 }}><strong>{isRtl ? "معايير:" : "Pass/Fail:"}</strong> {String(tc.pass_fail_criteria || "")}</div>
                {tc.ndmo_reference && tc.ndmo_reference !== "N/A" && <div style={{ fontSize: 10, color: "#F59E0B" }}>📖 {String(tc.ndmo_reference)}</div>}
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <button onClick={() => setTestStatus(prev => ({ ...prev, [tcId]: "pass" }))} style={{ padding: "4px 12px", borderRadius: 6, border: `1px solid ${status === "pass" ? "#2E7D32" : "#2A4A6E"}`, background: status === "pass" ? "rgba(46,125,50,0.3)" : "transparent", color: status === "pass" ? "#81C784" : "#5A8AB8", cursor: "pointer", fontSize: 11, fontWeight: 600 }} data-testid={`btn-pass-${tcId}`}>{isRtl ? "✓ نجح" : "✓ Pass"}</button>
                  <button onClick={() => setTestStatus(prev => ({ ...prev, [tcId]: "fail" }))} style={{ padding: "4px 12px", borderRadius: 6, border: `1px solid ${status === "fail" ? "#B71C1C" : "#2A4A6E"}`, background: status === "fail" ? "rgba(183,28,28,0.3)" : "transparent", color: status === "fail" ? "#EF9A9A" : "#5A8AB8", cursor: "pointer", fontSize: 11, fontWeight: 600 }} data-testid={`btn-fail-${tcId}`}>{isRtl ? "✕ فشل" : "✕ Fail"}</button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

function DashboardTestResult({ data, isRtl, testStatus, setTestStatus }: { data: Record<string, unknown>; isRtl: boolean; testStatus: Record<string, "pass" | "fail" | null>; setTestStatus: (fn: (prev: Record<string, "pass" | "fail" | null>) => Record<string, "pass" | "fail" | null>) => void }) {
  const cases = (data.test_cases || []) as Record<string, unknown>[];
  const coverage = (data.coverage_summary || {}) as Record<string, number>;
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [expandedCase, setExpandedCase] = useState<string | null>(null);
  const totalCases = cases.length;
  const passed = cases.filter(tc => testStatus[String(tc.tc_id)] === "pass").length;
  const failed = cases.filter(tc => testStatus[String(tc.tc_id)] === "fail").length;
  const notRun = totalCases - passed - failed;

  const govRisk = String(data.governance_risk_level || "Low");
  const govRiskColor = govRisk === "Critical" ? "#B71C1C" : govRisk === "High" ? "#E65100" : govRisk === "Medium" ? "#F59E0B" : "#2E7D32";

  const DASHBOARD_CATEGORIES_EN = ["Visual Accuracy", "DAX Validation", "Slicer & Filter", "Drill-Through", "Governance", "Performance", "Formatting", "Refresh"];
  const DASHBOARD_CATEGORIES_AR: Record<string, string> = { "Visual Accuracy": "دقة المرئيات", "DAX Validation": "تحقق DAX", "Slicer & Filter": "الفلاتر والمقسمات", "Drill-Through": "التنقل التفصيلي", "Governance": "الحوكمة", "Performance": "الأداء", "Formatting": "التنسيق", "Refresh": "التحديث" };
  const filtered = activeCategory ? cases.filter(tc => String(tc.category) === activeCategory) : cases;

  const donutData = Object.entries(coverage).filter(([, v]) => v > 0).map(([k, v]) => ({ name: k.replace(/_/g, " "), value: v }));

  return (
    <>
      <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ background: "rgba(26,75,140,0.15)", border: "1px solid #1A4B8C55", borderRadius: 10, padding: "12px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#E8EDF5" }}>{totalCases}</div>
            <div style={{ fontSize: 10, color: "#5A8AB8" }}>{isRtl ? "المجموع" : "Total"}</div>
          </div>
          <div style={{ background: "rgba(183,28,28,0.15)", border: "1px solid #B71C1C55", borderRadius: 10, padding: "12px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#EF9A9A" }}>{Number(data.critical_test_count || 0)}</div>
            <div style={{ fontSize: 10, color: "#5A8AB8" }}>{isRtl ? "حرجة" : "Critical"}</div>
          </div>
          <div style={{ padding: "12px 16px", borderRadius: 10, border: `1px solid ${govRiskColor}55`, background: `${govRiskColor}11` }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: govRiskColor }}>{isRtl ? "مخاطر الحوكمة" : "Gov Risk"}: {govRisk}</div>
            <div style={{ fontSize: 10, color: "#5A8AB8", marginTop: 2 }}>{String(data.governance_risk_note || "")}</div>
          </div>
        </div>
        {donutData.length > 0 && (
          <div style={{ width: 140, height: 140 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={donutData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={2}>
                  {donutData.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid #1E4080", borderRadius: 10, padding: "10px 14px", marginBottom: 16, display: "flex", gap: 16, alignItems: "center" }} data-testid="dashtest-progress">
        <div style={{ fontSize: 11, color: "#5A8AB8" }}>{isRtl ? "التقدم:" : "Progress:"}</div>
        <div style={{ flex: 1, background: "#0A1628", borderRadius: 6, height: 12, overflow: "hidden", display: "flex" }}>
          {passed > 0 && <div style={{ width: `${(passed / totalCases) * 100}%`, background: "#2E7D32", height: "100%" }} />}
          {failed > 0 && <div style={{ width: `${(failed / totalCases) * 100}%`, background: "#B71C1C", height: "100%" }} />}
        </div>
        <div style={{ fontSize: 10, color: "#90B4D4", whiteSpace: "nowrap" }}>
          <span style={{ color: "#81C784" }}>{passed}✓</span> / <span style={{ color: "#EF9A9A" }}>{failed}✕</span> / {notRun}○
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        <button onClick={() => setActiveCategory(null)} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #1E4080", background: activeCategory === null ? "rgba(26,75,140,0.3)" : "transparent", color: activeCategory === null ? "#E8EDF5" : "#5A8AB8", cursor: "pointer", fontSize: 10 }}>{isRtl ? "الكل" : "All"}</button>
        {DASHBOARD_CATEGORIES_EN.map(cat => (
          <button key={cat} onClick={() => setActiveCategory(cat)} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #1E4080", background: activeCategory === cat ? "rgba(26,75,140,0.3)" : "transparent", color: activeCategory === cat ? "#E8EDF5" : "#5A8AB8", cursor: "pointer", fontSize: 10 }} data-testid={`dashcat-filter-${cat}`}>{isRtl ? DASHBOARD_CATEGORIES_AR[cat] || cat : cat}</button>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <button onClick={() => { exportDashboardTestRun(cases, testStatus); downloadBiReport(); }} style={{ padding: "6px 14px", borderRadius: 6, border: "none", background: "linear-gradient(135deg, #1B5E20, #2E7D32)", color: "#fff", fontWeight: 600, cursor: "pointer", fontSize: 11 }} data-testid="button-export-dashtest-run">
          ⬇ {isRtl ? "تصدير نتائج الاختبار" : "Export Test Run"}
        </button>
      </div>

      {filtered.map((tc, i) => {
        const tcId = String(tc.tc_id || "");
        const sev = String(tc.severity || "Medium");
        const sc = SEVERITY_COLORS[sev] || SEVERITY_COLORS.Medium;
        const expanded = expandedCase === tcId;
        const status = testStatus[tcId];
        return (
          <div key={i} style={{ marginBottom: 8, border: "1px solid #1E4080", borderRadius: 10, overflow: "hidden", borderLeft: sev === "Critical" ? "4px solid #B71C1C" : "4px solid transparent" }} data-testid={`dbt-${tcId}`}>
            <div onClick={() => setExpandedCase(expanded ? null : tcId)} style={{ padding: "10px 14px", background: "rgba(255,255,255,0.03)", cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 9, fontWeight: 700, background: "#0D2E5C", color: "#fff", fontFamily: "monospace" }}>{tcId}</span>
              <span style={{ padding: "2px 6px", borderRadius: 4, fontSize: 9, fontWeight: 700, background: sc.bg, color: sc.fg }}>{sev}</span>
              {tc.visual_tested && <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 9, background: "rgba(26,75,140,0.3)", color: "#90B4D4", border: "1px solid #1A4B8C55" }}>{String(tc.visual_tested)}</span>}
              <span style={{ flex: 1, fontSize: 12, fontWeight: 600 }}>{String(tc.test_name || "")}</span>
              <span style={{ fontSize: 10, color: "#5A8AB8" }}>{tc.estimated_duration_minutes}m</span>
              <span style={{ fontSize: 10 }}>{expanded ? "▲" : "▼"}</span>
            </div>
            {expanded && (
              <div style={{ padding: "12px 14px", background: "#0A162899" }}>
                <div style={{ fontSize: 11, color: "#C8D8EA", marginBottom: 8 }}><strong>{isRtl ? "الهدف:" : "Objective:"}</strong> {String(tc.objective || "")}</div>
                <div style={{ fontSize: 11, color: "#C8D8EA", marginBottom: 8 }}><strong>{isRtl ? "المتطلبات:" : "Preconditions:"}</strong> {String(tc.preconditions || "")}</div>
                <div style={{ fontSize: 11, color: "#C8D8EA", marginBottom: 8 }}>
                  <strong>{isRtl ? "الخطوات:" : "Steps:"}</strong>
                  <ol style={{ paddingLeft: 20, margin: "4px 0", lineHeight: 1.8 }}>
                    {((tc.test_steps || []) as string[]).map((s, j) => <li key={j}>{s}</li>)}
                  </ol>
                </div>
                <div style={{ fontSize: 11, color: "#C8D8EA", marginBottom: 8 }}><strong>{isRtl ? "البيانات:" : "Test data:"}</strong> {String(tc.test_data || "")}</div>
                <div style={{ fontSize: 11, color: "#81C784", marginBottom: 8 }}><strong>{isRtl ? "المتوقع:" : "Expected:"}</strong> {String(tc.expected_result || "")}</div>
                <div style={{ fontSize: 11, color: "#5A8AB8", marginBottom: 8 }}><strong>{isRtl ? "معايير:" : "Pass/Fail:"}</strong> {String(tc.pass_fail_criteria || "")}</div>
                {tc.ndmo_reference && tc.ndmo_reference !== "N/A" && <div style={{ fontSize: 10, color: "#F59E0B", marginBottom: 4 }}>📖 {String(tc.ndmo_reference)}</div>}
                {tc.power_bi_specific_note && <div style={{ fontSize: 10, color: "#90B4D4", background: "rgba(26,75,140,0.15)", padding: "6px 10px", borderRadius: 6, marginBottom: 8 }}>💡 {String(tc.power_bi_specific_note)}</div>}
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <button onClick={() => setTestStatus(prev => ({ ...prev, [tcId]: "pass" }))} style={{ padding: "4px 12px", borderRadius: 6, border: `1px solid ${status === "pass" ? "#2E7D32" : "#2A4A6E"}`, background: status === "pass" ? "rgba(46,125,50,0.3)" : "transparent", color: status === "pass" ? "#81C784" : "#5A8AB8", cursor: "pointer", fontSize: 11, fontWeight: 600 }} data-testid={`btn-pass-${tcId}`}>{isRtl ? "✓ نجح" : "✓ Pass"}</button>
                  <button onClick={() => setTestStatus(prev => ({ ...prev, [tcId]: "fail" }))} style={{ padding: "4px 12px", borderRadius: 6, border: `1px solid ${status === "fail" ? "#B71C1C" : "#2A4A6E"}`, background: status === "fail" ? "rgba(183,28,28,0.3)" : "transparent", color: status === "fail" ? "#EF9A9A" : "#5A8AB8", cursor: "pointer", fontSize: 11, fontWeight: 600 }} data-testid={`btn-fail-${tcId}`}>{isRtl ? "✕ فشل" : "✕ Fail"}</button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
