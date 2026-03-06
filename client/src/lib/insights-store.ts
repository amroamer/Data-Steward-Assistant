// INSIGHTS REPORT: Standalone file only. Never write to result.xlsx.
import * as XLSX from "xlsx";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DescriptiveSummary {
  total_rows: number;
  total_columns: number;
  duplicate_rows: number;
  overall_completeness_pct: number;
}

export interface FieldProfile {
  field_name: string;
  data_type: string;
  null_count: number;
  null_pct: number;
  unique_count: number;
  top_values: string[];
  min: string;
  max: string;
  average: string;
  data_type_consistent: boolean;
  insight: string;
}

export interface DateRange {
  earliest: string;
  latest: string;
  span_days: number;
  date_field_used: string;
}

export interface CompletenessScore {
  field_name: string;
  completeness_pct: number;
  status: "Good" | "Acceptable" | "Poor";
}

export interface DescriptiveLevel {
  summary: DescriptiveSummary;
  field_profiles: FieldProfile[];
  date_range?: DateRange;
  completeness_scorecard: CompletenessScore[];
}

export interface Correlation {
  field_a: string;
  field_b: string;
  relationship: string;
  strength: "Strong" | "Moderate" | "Weak";
  business_meaning: string;
}

export interface Outlier {
  field_name: string;
  outlier_description: string;
  affected_rows_estimate: number;
  possible_cause: string;
}

export interface SkewnessEntry {
  field_name: string;
  distribution_shape: string;
  implication: string;
}

export interface TrendEntry {
  field_name: string;
  trend_type: string;
  direction: string;
  observation: string;
}

export interface CohortComparison {
  cohort_field: string;
  cohorts_identified: string[];
  key_difference: string;
  business_implication: string;
}

export interface FunnelDropoff {
  stage: string;
  records_in: number;
  records_out: number;
  dropoff_pct: number;
  likely_cause: string;
}

export interface CrossFieldViolation {
  fields_involved: string[];
  violation_description: string;
  affected_rows_estimate: number;
  severity: "High" | "Medium" | "Low";
}

export interface ConcentrationEntry {
  field_name: string;
  top_10pct_contribution: string;
  observation: string;
}

export interface DiagnosticLevel {
  correlations: Correlation[];
  outliers: Outlier[];
  skewness: SkewnessEntry[];
  trends: TrendEntry[];
  cohort_comparison: CohortComparison[];
  funnel_dropoff: FunnelDropoff[];
  cross_field_violations: CrossFieldViolation[];
  concentration_report: ConcentrationEntry[];
}

export interface Segment {
  segment_name: string;
  defining_characteristics: string[];
  estimated_size_pct: number;
  business_meaning: string;
}

export interface ContributionAnalysis {
  field_name: string;
  top_contributors: string[];
  contribution_pct: number;
  insight: string;
}

export interface LineageQuality {
  field_name: string;
  error_propagation_risk: "High" | "Medium" | "Low";
  downstream_impact: string;
  recommendation: string;
}

export interface TimeSeriesDecomposition {
  field_name: string;
  trend: string;
  seasonality: string;
  noise_level: "High" | "Medium" | "Low";
  insight: string;
}

export interface AnalyticalLevel {
  segments: Segment[];
  contribution_analysis: ContributionAnalysis[];
  lineage_quality: LineageQuality[];
  time_series_decomposition: TimeSeriesDecomposition[];
}

export interface ExecutiveSummary {
  headline_finding: string;
  top_3_insights: string[];
  biggest_risk: string;
  immediate_action: string;
}

export interface InsightsReport {
  report_title: string;
  dataset_context: string;
  descriptive: DescriptiveLevel;
  diagnostic: DiagnosticLevel;
  analytical: AnalyticalLevel;
  executive_summary: ExecutiveSummary;
}

// Legacy compat — still used by backend column profiling display
export interface BackendColumnProfile {
  column_name: string;
  data_type: string;
  null_count: number;
  null_pct: number;
  unique_values: number;
  min?: number | string | null;
  max?: number | string | null;
  mean?: number | null;
  median?: number | null;
  std_dev?: number | null;
  top_values?: { value: string; count: number }[] | null;
  earliest?: string | null;
  latest?: string | null;
  date_range_days?: number | null;
}

// ─── Detection ────────────────────────────────────────────────────────────────

function tryParseInsights(text: string): InsightsReport | null {
  try {
    const parsed = JSON.parse(text);
    if (
      parsed &&
      typeof parsed.report_title === "string" &&
      parsed.descriptive &&
      parsed.executive_summary
    ) {
      return normalizeReport(parsed);
    }
  } catch {}
  return null;
}

function normalizeReport(parsed: any): InsightsReport {
  const d = parsed.diagnostic || {};
  const a = parsed.analytical || {};
  const desc = parsed.descriptive || {};
  return {
    report_title: parsed.report_title ?? "Data Insights Report",
    dataset_context: parsed.dataset_context ?? "",
    descriptive: {
      summary: desc.summary ?? { total_rows: 0, total_columns: 0, duplicate_rows: 0, overall_completeness_pct: 0 },
      field_profiles: Array.isArray(desc.field_profiles) ? desc.field_profiles : [],
      date_range: desc.date_range ?? undefined,
      completeness_scorecard: Array.isArray(desc.completeness_scorecard) ? desc.completeness_scorecard : [],
    },
    diagnostic: {
      correlations: Array.isArray(d.correlations) ? d.correlations : [],
      outliers: Array.isArray(d.outliers) ? d.outliers : [],
      skewness: Array.isArray(d.skewness) ? d.skewness : [],
      trends: Array.isArray(d.trends) ? d.trends : [],
      cohort_comparison: Array.isArray(d.cohort_comparison) ? d.cohort_comparison : [],
      funnel_dropoff: Array.isArray(d.funnel_dropoff) ? d.funnel_dropoff : [],
      cross_field_violations: Array.isArray(d.cross_field_violations) ? d.cross_field_violations : [],
      concentration_report: Array.isArray(d.concentration_report) ? d.concentration_report : [],
    },
    analytical: {
      segments: Array.isArray(a.segments) ? a.segments : [],
      contribution_analysis: Array.isArray(a.contribution_analysis) ? a.contribution_analysis : [],
      lineage_quality: Array.isArray(a.lineage_quality) ? a.lineage_quality : [],
      time_series_decomposition: Array.isArray(a.time_series_decomposition) ? a.time_series_decomposition : [],
    },
    executive_summary: {
      headline_finding: parsed.executive_summary?.headline_finding ?? "",
      top_3_insights: Array.isArray(parsed.executive_summary?.top_3_insights) ? parsed.executive_summary.top_3_insights : [],
      biggest_risk: parsed.executive_summary?.biggest_risk ?? "",
      immediate_action: parsed.executive_summary?.immediate_action ?? "",
    },
  };
}

function repairAndParse(raw: string): InsightsReport | null {
  try {
    let inString = false;
    let escaped = false;
    const stack: string[] = [];
    for (let i = 0; i < raw.length; i++) {
      const ch = raw[i];
      if (escaped) { escaped = false; continue; }
      if (ch === "\\") { escaped = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (!inString) {
        if (ch === "{") stack.push("}");
        else if (ch === "[") stack.push("]");
        else if (ch === "}" || ch === "]") stack.pop();
      }
    }
    let repaired = raw;
    if (inString) repaired += '"';
    repaired = repaired.replace(/,\s*$/, "");
    while (stack.length > 0) repaired += stack.pop();
    const parsed = JSON.parse(repaired);
    if (parsed.report_title && parsed.descriptive) return normalizeReport(parsed);
  } catch {}
  return null;
}

export function looksLikeInsightsJSON(content: string): boolean {
  return content.includes('"report_title"') && content.includes('"descriptive"') && content.includes('"executive_summary"');
}

export function detectInsightsJSON(content: string): InsightsReport | null {
  const allBlocks = Array.from(content.matchAll(/```(?:json)?\s*([\s\S]*?)```/g));
  for (const match of allBlocks) {
    const candidate = match[1].trim();
    if (!candidate) continue;
    const result = tryParseInsights(candidate);
    if (result) return result;
  }
  const result2 = tryParseInsights(content.trim());
  if (result2) return result2;
  if (looksLikeInsightsJSON(content)) {
    const raw = content.replace(/^```(?:json)?\s*/m, "").replace(/```\s*$/m, "").trim();
    return repairAndParse(raw);
  }
  return null;
}

// ─── Excel Colors ─────────────────────────────────────────────────────────────

const ZATCA_NAVY = "1A4B8C";
const WHITE = "FFFFFF";
const ALT_ROW = "EBF2FB";
const GREEN_FILL = "DCFCE7";
const GREEN_TEXT = "166534";
const YELLOW_FILL = "FEF9C3";
const YELLOW_TEXT = "854D0E";
const RED_FILL = "FEE2E2";
const RED_TEXT = "991B1B";
const ORANGE_TEXT = "C2410C";
const BLUE_DARK = "1E3A8A";
const BLUE_MID = "1D4ED8";
const GREY_TEXT = "6B7280";
const SECTION_HEADER_FILL = "0D2E5C";

function hStyle(): any {
  return { font: { bold: true, color: { rgb: WHITE }, sz: 11 }, fill: { fgColor: { rgb: ZATCA_NAVY } }, alignment: { horizontal: "center", wrapText: true }, border: { top: { style: "thin", color: { rgb: "CCCCCC" } }, bottom: { style: "thin", color: { rgb: "CCCCCC" } }, left: { style: "thin", color: { rgb: "CCCCCC" } }, right: { style: "thin", color: { rgb: "CCCCCC" } } } };
}

function sectionHeaderStyle(): any {
  return { font: { bold: true, color: { rgb: WHITE }, sz: 12 }, fill: { fgColor: { rgb: SECTION_HEADER_FILL } }, alignment: { horizontal: "left" } };
}

function alt(r: number): any {
  if (r % 2 === 1) return { fill: { fgColor: { rgb: ALT_ROW } } };
  return {};
}

function autoWidth(ws: XLSX.WorkSheet, data: any[][]): void {
  if (!data[0]) return;
  ws["!cols"] = data[0].map((_: any, i: number) => {
    let max = 10;
    for (const row of data) {
      const len = String(row[i] ?? "").length;
      if (len > max) max = len;
    }
    return { wch: Math.min(max + 2, 60) };
  });
}

function freezeHeader(ws: XLSX.WorkSheet): void {
  (ws as any)["!freeze"] = { xSplit: 0, ySplit: 1, topLeftCell: "A2", activePane: "bottomLeft", state: "frozen" };
}

function applyHeaders(ws: XLSX.WorkSheet, colCount: number): void {
  for (let c = 0; c < colCount; c++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c });
    if (ws[addr]) ws[addr].s = hStyle();
  }
}

function applyAltRows(ws: XLSX.WorkSheet, rowCount: number, colCount: number, start = 1): void {
  for (let r = start; r < rowCount; r++) {
    for (let c = 0; c < colCount; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      if (ws[addr]) ws[addr].s = { ...(ws[addr].s || {}), ...alt(r - start) };
    }
  }
}

function setCellStyle(ws: XLSX.WorkSheet, r: number, c: number, style: any): void {
  const addr = XLSX.utils.encode_cell({ r, c });
  if (ws[addr]) ws[addr].s = { ...(ws[addr].s || {}), ...style };
}

function nullPctStyle(pct: number): any {
  if (pct === 0) return { font: { bold: true, color: { rgb: GREEN_TEXT } }, fill: { fgColor: { rgb: GREEN_FILL } } };
  if (pct <= 10) return { font: { bold: true, color: { rgb: YELLOW_TEXT } }, fill: { fgColor: { rgb: YELLOW_FILL } } };
  return { font: { bold: true, color: { rgb: RED_TEXT } }, fill: { fgColor: { rgb: RED_FILL } } };
}

function statusStyle(status: string): any {
  if (status === "Good") return { font: { bold: true, color: { rgb: GREEN_TEXT } }, fill: { fgColor: { rgb: GREEN_FILL } } };
  if (status === "Acceptable") return { font: { bold: true, color: { rgb: YELLOW_TEXT } }, fill: { fgColor: { rgb: YELLOW_FILL } } };
  return { font: { bold: true, color: { rgb: RED_TEXT } }, fill: { fgColor: { rgb: RED_FILL } } };
}

function strengthStyle(strength: string): any {
  if (strength === "Strong") return { font: { bold: true, color: { rgb: BLUE_DARK } } };
  if (strength === "Moderate") return { font: { color: { rgb: BLUE_MID } } };
  return { font: { color: { rgb: GREY_TEXT } } };
}

function severityStyle(severity: string): any {
  if (severity === "High") return { font: { bold: true, color: { rgb: RED_TEXT } }, fill: { fgColor: { rgb: RED_FILL } } };
  if (severity === "Medium") return { font: { bold: true, color: { rgb: ORANGE_TEXT } }, fill: { fgColor: { rgb: YELLOW_FILL } } };
  return { font: { bold: true, color: { rgb: YELLOW_TEXT } }, fill: { fgColor: { rgb: "FEFCE8" } } };
}

function riskStyle(risk: string): any {
  if (risk === "High") return { font: { bold: true, color: { rgb: RED_TEXT } } };
  if (risk === "Medium") return { font: { bold: true, color: { rgb: ORANGE_TEXT } } };
  return { font: { bold: true, color: { rgb: GREEN_TEXT } } };
}

function noiseStyle(noise: string): any {
  if (noise === "High") return { font: { bold: true, color: { rgb: RED_TEXT } } };
  if (noise === "Medium") return { font: { bold: true, color: { rgb: YELLOW_TEXT } } };
  return { font: { bold: true, color: { rgb: GREEN_TEXT } } };
}

// ─── Sheet Builders ────────────────────────────────────────────────────────────

function buildExecutiveSummarySheet(wb: XLSX.WorkBook, report: InsightsReport, sourceFileName: string): void {
  const es = report.executive_summary;
  const s = report.descriptive.summary;
  const now = new Date();
  const rows: any[][] = [
    ["Field", "Value"],
    ["Report Title", report.report_title],
    ["Dataset Context", report.dataset_context],
    ["Source File", sourceFileName],
    ["Report Date", now.toISOString().split("T")[0]],
    ["", ""],
    ["Total Rows", s.total_rows],
    ["Total Columns", s.total_columns],
    ["Duplicate Rows", s.duplicate_rows],
    ["Overall Completeness %", s.overall_completeness_pct],
    ["", ""],
    ["Headline Finding", es.headline_finding],
    ["Top Insight 1", es.top_3_insights[0] ?? ""],
    ["Top Insight 2", es.top_3_insights[1] ?? ""],
    ["Top Insight 3", es.top_3_insights[2] ?? ""],
    ["Biggest Risk", es.biggest_risk],
    ["Immediate Action", es.immediate_action],
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 28 }, { wch: 90 }];
  if (ws["A1"]) ws["A1"].s = hStyle();
  if (ws["B1"]) ws["B1"].s = hStyle();
  const biggestRiskRow = rows.findIndex(r => r[0] === "Biggest Risk");
  if (biggestRiskRow >= 0) {
    [0, 1].forEach(c => setCellStyle(ws, biggestRiskRow, c, { fill: { fgColor: { rgb: RED_FILL } }, font: { bold: true, color: { rgb: RED_TEXT } } }));
  }
  const actionRow = rows.findIndex(r => r[0] === "Immediate Action");
  if (actionRow >= 0) {
    [0, 1].forEach(c => setCellStyle(ws, actionRow, c, { fill: { fgColor: { rgb: GREEN_FILL } }, font: { bold: true, color: { rgb: GREEN_TEXT } } }));
  }
  XLSX.utils.book_append_sheet(wb, ws, "executive_summary");
}

function buildFieldProfilesSheet(wb: XLSX.WorkBook, report: InsightsReport): void {
  const headers = ["Field Name", "Data Type", "Null Count", "Null %", "Unique Count", "Min", "Max", "Average", "Top Values", "Consistent?", "Insight"];
  const data: any[][] = [headers];
  for (const fp of report.descriptive.field_profiles) {
    data.push([
      fp.field_name, fp.data_type, fp.null_count,
      fp.null_pct, fp.unique_count,
      fp.min ?? "", fp.max ?? "", fp.average ?? "",
      Array.isArray(fp.top_values) ? fp.top_values.slice(0, 5).join(", ") : "",
      fp.data_type_consistent ? "YES" : "NO",
      fp.insight ?? "",
    ]);
  }
  const ws = XLSX.utils.aoa_to_sheet(data);
  autoWidth(ws, data);
  freezeHeader(ws);
  applyHeaders(ws, headers.length);
  applyAltRows(ws, data.length, headers.length);
  for (let r = 1; r < data.length; r++) {
    const fp = report.descriptive.field_profiles[r - 1];
    if (!fp) continue;
    setCellStyle(ws, r, 3, nullPctStyle(fp.null_pct));
    const consAddr = XLSX.utils.encode_cell({ r, c: 9 });
    if (ws[consAddr]) ws[consAddr].s = fp.data_type_consistent
      ? { font: { bold: true, color: { rgb: GREEN_TEXT } }, fill: { fgColor: { rgb: GREEN_FILL } } }
      : { font: { bold: true, color: { rgb: RED_TEXT } }, fill: { fgColor: { rgb: RED_FILL } } };
  }
  XLSX.utils.book_append_sheet(wb, ws, "descriptive_field_profiles");
}

function buildCompletenessSheet(wb: XLSX.WorkBook, report: InsightsReport): void {
  const headers = ["Field Name", "Completeness %", "Status"];
  const sorted = [...report.descriptive.completeness_scorecard].sort((a, b) => a.completeness_pct - b.completeness_pct);
  const data: any[][] = [headers, ...sorted.map(cs => [cs.field_name, cs.completeness_pct, cs.status])];
  const ws = XLSX.utils.aoa_to_sheet(data);
  autoWidth(ws, data);
  freezeHeader(ws);
  applyHeaders(ws, headers.length);
  applyAltRows(ws, data.length, headers.length);
  for (let r = 1; r < data.length; r++) {
    setCellStyle(ws, r, 2, statusStyle(sorted[r - 1]?.status ?? ""));
  }
  XLSX.utils.book_append_sheet(wb, ws, "completeness_scorecard");
}

function buildCorrelationsSheet(wb: XLSX.WorkBook, report: InsightsReport): void {
  const headers = ["Field A", "Field B", "Relationship", "Strength", "Business Meaning"];
  const data: any[][] = [headers, ...report.diagnostic.correlations.map(c => [c.field_a, c.field_b, c.relationship, c.strength, c.business_meaning])];
  const ws = XLSX.utils.aoa_to_sheet(data);
  autoWidth(ws, data);
  freezeHeader(ws);
  applyHeaders(ws, headers.length);
  applyAltRows(ws, data.length, headers.length);
  for (let r = 1; r < data.length; r++) {
    setCellStyle(ws, r, 3, strengthStyle(report.diagnostic.correlations[r - 1]?.strength ?? ""));
  }
  XLSX.utils.book_append_sheet(wb, ws, "diagnostic_correlations");
}

function buildDiagnosticFindingsSheet(wb: XLSX.WorkBook, report: InsightsReport): void {
  const d = report.diagnostic;
  const rows: any[][] = [];

  function addSection(title: string, headers: string[], dataRows: any[][]): void {
    rows.push([title]);
    rows.push(headers);
    for (const row of dataRows) rows.push(row);
    rows.push([]);
  }

  addSection("OUTLIERS", ["Field Name", "Outlier Description", "Est. Affected Rows", "Possible Cause"],
    d.outliers.map(o => [o.field_name, o.outlier_description, o.affected_rows_estimate, o.possible_cause]));

  addSection("DISTRIBUTION SHAPE", ["Field Name", "Distribution Shape", "Implication"],
    d.skewness.map(s => [s.field_name, s.distribution_shape, s.implication]));

  addSection("TRENDS", ["Field Name", "Trend Type", "Direction", "Observation"],
    d.trends.map(t => [t.field_name, t.trend_type, t.direction, t.observation]));

  addSection("COHORT COMPARISON", ["Cohort Field", "Cohorts Found", "Key Difference", "Business Implication"],
    d.cohort_comparison.map(c => [c.cohort_field, c.cohorts_identified.join(", "), c.key_difference, c.business_implication]));

  addSection("FUNNEL DROP-OFF", ["Stage", "Records In", "Records Out", "Drop-off %", "Likely Cause"],
    d.funnel_dropoff.map(f => [f.stage, f.records_in, f.records_out, f.dropoff_pct, f.likely_cause]));

  addSection("CROSS-FIELD VIOLATIONS", ["Fields Involved", "Violation Description", "Est. Affected Rows", "Severity"],
    d.cross_field_violations.map(v => [v.fields_involved.join(", "), v.violation_description, v.affected_rows_estimate, v.severity]));

  addSection("CONCENTRATION REPORT", ["Field Name", "Top 10% Contribution", "Observation"],
    d.concentration_report.map(c => [c.field_name, c.top_10pct_contribution, c.observation]));

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 30 }, { wch: 50 }, { wch: 20 }, { wch: 50 }];
  ws["!rows"] = [];

  let sectionTitles = ["OUTLIERS", "DISTRIBUTION SHAPE", "TRENDS", "COHORT COMPARISON", "FUNNEL DROP-OFF", "CROSS-FIELD VIOLATIONS", "CONCENTRATION REPORT"];
  for (let r = 0; r < rows.length; r++) {
    const val = rows[r][0];
    if (typeof val === "string" && sectionTitles.includes(val)) {
      for (let c = 0; c < 5; c++) {
        const addr = XLSX.utils.encode_cell({ r, c });
        if (!ws[addr]) ws[addr] = { v: "", t: "s" };
        ws[addr].s = sectionHeaderStyle();
      }
    }
    if (val === "Field Name" || val === "Cohort Field" || val === "Stage" || val === "Fields Involved") {
      for (let c = 0; c < 5; c++) {
        const addr = XLSX.utils.encode_cell({ r, c });
        if (ws[addr]) ws[addr].s = hStyle();
      }
    }
  }

  XLSX.utils.book_append_sheet(wb, ws, "diagnostic_findings");
}

function buildAnalyticalInsightsSheet(wb: XLSX.WorkBook, report: InsightsReport): void {
  const a = report.analytical;
  const rows: any[][] = [];

  function addSection(title: string, headers: string[], dataRows: any[][]): void {
    rows.push([title]);
    rows.push(headers);
    for (const row of dataRows) rows.push(row);
    rows.push([]);
  }

  addSection("SEGMENTS", ["Segment Name", "Defining Characteristics", "Est. Size %", "Business Meaning"],
    a.segments.map(s => [s.segment_name, s.defining_characteristics.join("; "), s.estimated_size_pct, s.business_meaning]));

  addSection("CONTRIBUTION ANALYSIS", ["Field Name", "Top Contributors", "Contribution %", "Insight"],
    a.contribution_analysis.map(c => [c.field_name, c.top_contributors.join(", "), c.contribution_pct, c.insight]));

  addSection("DATA LINEAGE QUALITY", ["Field Name", "Error Propagation Risk", "Downstream Impact", "Recommendation"],
    a.lineage_quality.map(l => [l.field_name, l.error_propagation_risk, l.downstream_impact, l.recommendation]));

  addSection("TIME SERIES DECOMPOSITION", ["Field Name", "Trend", "Seasonality", "Noise Level", "Insight"],
    a.time_series_decomposition.map(t => [t.field_name, t.trend, t.seasonality, t.noise_level, t.insight]));

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 30 }, { wch: 50 }, { wch: 20 }, { wch: 50 }];

  const sectionTitles = ["SEGMENTS", "CONTRIBUTION ANALYSIS", "DATA LINEAGE QUALITY", "TIME SERIES DECOMPOSITION"];
  const riskRow = "Field Name";
  for (let r = 0; r < rows.length; r++) {
    const val = rows[r][0];
    if (typeof val === "string" && sectionTitles.includes(val)) {
      for (let c = 0; c < 5; c++) {
        const addr = XLSX.utils.encode_cell({ r, c });
        if (!ws[addr]) ws[addr] = { v: "", t: "s" };
        ws[addr].s = sectionHeaderStyle();
      }
    }
    if (val === riskRow) {
      for (let c = 0; c < 5; c++) {
        const addr = XLSX.utils.encode_cell({ r, c });
        if (ws[addr]) ws[addr].s = hStyle();
      }
    }
  }

  XLSX.utils.book_append_sheet(wb, ws, "analytical_insights");
}

// ─── Public Export Function ───────────────────────────────────────────────────

export function generateInsightsExcel(report: InsightsReport, sourceFileName: string, _backendColumns?: BackendColumnProfile[]): string {
  const wb = XLSX.utils.book_new();
  buildExecutiveSummarySheet(wb, report, sourceFileName);
  buildFieldProfilesSheet(wb, report);
  buildCompletenessSheet(wb, report);
  buildCorrelationsSheet(wb, report);
  buildDiagnosticFindingsSheet(wb, report);
  buildAnalyticalInsightsSheet(wb, report);

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const fileName = `insights_report_${timestamp}.xlsx`;
  XLSX.writeFile(wb, fileName);
  return fileName;
}

// ─── Legacy compatibility helpers (used by chat.tsx outputs panel) ────────────

export function getInsightsScorecard(report: InsightsReport): { totalInsights: number; highImpact: number; anomalies: number; completeness: number } {
  const s = report.descriptive.summary;
  const totalInsights = report.diagnostic.correlations.length + report.diagnostic.outliers.length + report.analytical.segments.length;
  const highImpact = report.diagnostic.cross_field_violations.filter(v => v.severity === "High").length + report.diagnostic.outliers.length;
  const anomalies = report.diagnostic.outliers.length;
  const completeness = s.overall_completeness_pct ?? 100;
  return { totalInsights, highImpact, anomalies, completeness };
}

export function generateInsightsSummary(report: InsightsReport): string {
  const s = report.descriptive.summary;
  const es = report.executive_summary;
  const lines = [
    `Data Insights Report: ${report.report_title}`,
    "",
    `Dataset: ${s.total_rows} rows × ${s.total_columns} columns | ${s.overall_completeness_pct}% complete`,
    report.dataset_context,
    "",
    `Headline: ${es.headline_finding}`,
    `Biggest Risk: ${es.biggest_risk}`,
    `Immediate Action: ${es.immediate_action}`,
    "",
    "Results saved to insights report Excel file.",
  ];
  return lines.join("\n");
}
