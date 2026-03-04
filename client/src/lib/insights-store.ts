import * as XLSX from "xlsx";

export interface DatasetSummary {
  total_rows: number;
  total_columns: number;
  numeric_columns?: number;
  text_columns?: number;
  date_columns?: number;
  overall_completeness_pct?: number;
  summary_text?: string;
  date_range?: string;
}

export interface KeyInsight {
  insight_no: number;
  category: string;
  title: string;
  description: string;
  affected_columns: string[];
  business_impact: string;
  confidence: string;
}

export interface ColumnProfile {
  column_name: string;
  data_type: string;
  null_count: number;
  null_pct: number;
  unique_values: number;
  min?: string | number | null;
  max?: string | number | null;
  mean?: string | number | null;
  median?: string | number | null;
  std_dev?: string | number | null;
  top_values?: string | any[] | null;
  anomaly_flag: boolean;
  anomaly_description?: string;
  anomaly_detail?: string;
}

export interface Recommendation {
  recommendation_no: number;
  title: string;
  description: string;
  priority: string;
  effort: string;
  affected_columns: string[];
}

export interface DataQualityFlag {
  flag_no: number;
  column_name: string;
  issue: string;
  severity: string;
  details?: string;
  affected_rows_estimate?: number;
  suggested_fix: string;
}

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

export interface InsightsReport {
  report_title: string;
  dataset_summary: DatasetSummary;
  key_insights: KeyInsight[];
  column_profiles?: ColumnProfile[];
  recommendations: Recommendation[];
  data_quality_flags?: DataQualityFlag[];
}

function tryParseInsights(text: string): InsightsReport | null {
  try {
    const parsed = JSON.parse(text);
    if (
      parsed &&
      typeof parsed.report_title === "string" &&
      parsed.dataset_summary &&
      typeof parsed.dataset_summary.total_rows === "number" &&
      typeof parsed.dataset_summary.total_columns === "number" &&
      Array.isArray(parsed.key_insights)
    ) {
      return {
        report_title: parsed.report_title,
        dataset_summary: parsed.dataset_summary,
        key_insights: parsed.key_insights,
        column_profiles: Array.isArray(parsed.column_profiles) ? parsed.column_profiles : [],
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
        data_quality_flags: Array.isArray(parsed.data_quality_flags) ? parsed.data_quality_flags : [],
      };
    }
  } catch {}
  return null;
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
    if (inString) {
      repaired += '"';
    }

    repaired = repaired.replace(/,\s*$/, "");

    const lastSignificant = repaired.trimEnd();
    if (lastSignificant.endsWith(":")) {
      repaired = repaired.trimEnd() + " null";
    } else if (lastSignificant.endsWith(",")) {
      repaired = repaired.trimEnd().slice(0, -1);
    }

    while (stack.length > 0) {
      repaired += stack.pop();
    }

    const parsed = JSON.parse(repaired);
    if (parsed.report_title && parsed.dataset_summary) {
      return {
        report_title: parsed.report_title ?? "Data Insights Report",
        dataset_summary: parsed.dataset_summary ?? { total_rows: 0, total_columns: 0 },
        key_insights: Array.isArray(parsed.key_insights) ? parsed.key_insights : [],
        column_profiles: Array.isArray(parsed.column_profiles) ? parsed.column_profiles : [],
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
        data_quality_flags: Array.isArray(parsed.data_quality_flags) ? parsed.data_quality_flags : [],
      } as InsightsReport;
    }
  } catch {}
  return null;
}

export function looksLikeInsightsJSON(content: string): boolean {
  return content.includes('"report_title"') && content.includes('"dataset_summary"') && content.includes('"key_insights"');
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

const DARK_BLUE = "1A4B8C";
const WHITE = "FFFFFF";
const LIGHT_GREY = "F0F0F0";
const ALT_ROW = "F5F8FF";
const RED_BG = "FFEBEE";
const GREEN_TEXT = "2E7D32";
const RED_TEXT = "C62828";
const ORANGE_TEXT = "E65100";
const YELLOW_TEXT = "F9A825";
const DARK_RED_TEXT = "B71C1C";

function headerStyle(): XLSX.CellObject["s"] {
  return {
    font: { bold: true, color: { rgb: WHITE }, sz: 11 },
    fill: { fgColor: { rgb: DARK_BLUE } },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    border: {
      top: { style: "thin", color: { rgb: "CCCCCC" } },
      bottom: { style: "thin", color: { rgb: "CCCCCC" } },
      left: { style: "thin", color: { rgb: "CCCCCC" } },
      right: { style: "thin", color: { rgb: "CCCCCC" } },
    },
  };
}

function cellBorder(): XLSX.CellObject["s"] {
  return {
    border: {
      top: { style: "thin", color: { rgb: "E0E0E0" } },
      bottom: { style: "thin", color: { rgb: "E0E0E0" } },
      left: { style: "thin", color: { rgb: "E0E0E0" } },
      right: { style: "thin", color: { rgb: "E0E0E0" } },
    },
  };
}

function altRowStyle(rowIdx: number): XLSX.CellObject["s"] {
  const base = cellBorder();
  if (rowIdx % 2 === 1) {
    return { ...base, fill: { fgColor: { rgb: ALT_ROW } } };
  }
  return base;
}

function autoWidth(ws: XLSX.WorkSheet, data: string[][]): void {
  const colWidths = data[0].map((_h, i) => {
    let max = 0;
    for (const row of data) {
      const len = (row[i] || "").length;
      if (len > max) max = len;
    }
    return { wch: Math.min(Math.max(max + 2, 12), 60) };
  });
  ws["!cols"] = colWidths;
}

function freezeHeader(ws: XLSX.WorkSheet): void {
  ws["!freeze"] = { xSplit: 0, ySplit: 1, topLeftCell: "A2", activePane: "bottomLeft", state: "frozen" };
}

function applyHeaderStyles(ws: XLSX.WorkSheet, colCount: number): void {
  for (let c = 0; c < colCount; c++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c });
    if (ws[addr]) {
      ws[addr].s = headerStyle();
    }
  }
}

function applyAltRowStyles(ws: XLSX.WorkSheet, rowCount: number, colCount: number, startRow: number = 1): void {
  for (let r = startRow; r < rowCount; r++) {
    for (let c = 0; c < colCount; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      if (ws[addr]) {
        ws[addr].s = { ...(ws[addr].s || {}), ...altRowStyle(r - startRow) };
      }
    }
  }
}

function impactColor(impact: string): string {
  const lower = impact.toLowerCase();
  if (lower === "high" || lower === "critical") return RED_TEXT;
  if (lower === "medium" || lower === "moderate") return ORANGE_TEXT;
  return GREEN_TEXT;
}

function severityColor(severity: string): string {
  const lower = severity.toLowerCase();
  if (lower === "critical") return DARK_RED_TEXT;
  if (lower === "high") return RED_TEXT;
  if (lower === "medium" || lower === "moderate") return ORANGE_TEXT;
  return YELLOW_TEXT;
}

function severityOrder(severity: string): number {
  const lower = severity.toLowerCase();
  if (lower === "critical") return 0;
  if (lower === "high") return 1;
  if (lower === "medium" || lower === "moderate") return 2;
  return 3;
}

function priorityColor(priority: string): string {
  const lower = priority.toLowerCase();
  if (lower === "high" || lower === "critical") return RED_TEXT;
  if (lower === "medium" || lower === "moderate") return ORANGE_TEXT;
  return GREEN_TEXT;
}

function effortColor(effort: string): string {
  const lower = effort.toLowerCase();
  if (lower === "high") return RED_TEXT;
  if (lower === "medium" || lower === "moderate") return ORANGE_TEXT;
  return GREEN_TEXT;
}

const CATEGORY_COLORS: Record<string, string> = {
  "data quality": "E8F5E9",
  "trend": "E3F2FD",
  "anomaly": "FFF3E0",
  "correlation": "F3E5F5",
  "distribution": "E0F7FA",
  "completeness": "FFF8E1",
  "pattern": "FCE4EC",
};

function categoryBg(category: string): string {
  const lower = category.toLowerCase();
  for (const [key, color] of Object.entries(CATEGORY_COLORS)) {
    if (lower.includes(key)) return color;
  }
  return "F5F5F5";
}

function buildExecutiveSummarySheet(wb: XLSX.WorkBook, report: InsightsReport, sourceFileName: string): void {
  const data: string[][] = [];
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];

  data.push([report.report_title]);
  data.push([""]);
  data.push(["Report Date", dateStr]);
  data.push(["Source File", sourceFileName]);
  data.push([""]);
  data.push(["Dataset Summary"]);
  data.push(["Total Rows", String(report.dataset_summary.total_rows)]);
  data.push(["Total Columns", String(report.dataset_summary.total_columns)]);
  if (report.dataset_summary.overall_completeness_pct != null) {
    data.push(["Data Completeness", `${report.dataset_summary.overall_completeness_pct}%`]);
  }
  if (report.dataset_summary.date_range) {
    data.push(["Date Range", report.dataset_summary.date_range]);
  }
  if (report.dataset_summary.summary_text) {
    data.push(["Summary", report.dataset_summary.summary_text]);
  }
  data.push([""]);
  data.push(["Top Key Insights"]);

  const topInsights = report.key_insights
    .filter((i) => i.business_impact?.toLowerCase() === "high" || i.business_impact?.toLowerCase() === "critical")
    .slice(0, 5);
  const insightsToShow = topInsights.length > 0 ? topInsights : report.key_insights.slice(0, 5);

  for (const insight of insightsToShow) {
    data.push([`${insight.insight_no}. ${insight.title}`, insight.description]);
  }

  const ws = XLSX.utils.aoa_to_sheet(data);

  ws["!cols"] = [{ wch: 30 }, { wch: 80 }];

  const titleAddr = XLSX.utils.encode_cell({ r: 0, c: 0 });
  if (ws[titleAddr]) {
    ws[titleAddr].s = {
      font: { bold: true, color: { rgb: DARK_BLUE }, sz: 16 },
    };
  }

  for (let r = 0; r < data.length; r++) {
    const cellA = XLSX.utils.encode_cell({ r, c: 0 });
    if (ws[cellA] && (data[r][0] === "Dataset Summary" || data[r][0] === "Top Key Insights")) {
      ws[cellA].s = {
        font: { bold: true, color: { rgb: DARK_BLUE }, sz: 13 },
        fill: { fgColor: { rgb: LIGHT_GREY } },
      };
      const cellB = XLSX.utils.encode_cell({ r, c: 1 });
      if (ws[cellB]) {
        ws[cellB].s = { fill: { fgColor: { rgb: LIGHT_GREY } } };
      }
    }
    if (ws[cellA] && (data[r][0] === "Report Date" || data[r][0] === "Source File"
      || data[r][0] === "Total Rows" || data[r][0] === "Total Columns"
      || data[r][0] === "Data Completeness" || data[r][0] === "Date Range" || data[r][0] === "Summary")) {
      ws[cellA].s = { font: { bold: true } };
    }
  }

  XLSX.utils.book_append_sheet(wb, ws, "executive_summary");
}

function buildKeyInsightsSheet(wb: XLSX.WorkBook, report: InsightsReport): void {
  const headers = ["Insight #", "Category", "Title", "Description", "Affected Columns", "Business Impact", "Confidence"];
  const data: string[][] = [headers];

  for (const insight of report.key_insights) {
    data.push([
      String(insight.insight_no),
      insight.category || "",
      insight.title,
      insight.description,
      (insight.affected_columns || []).join(", "),
      insight.business_impact || "",
      insight.confidence || "",
    ]);
  }

  const ws = XLSX.utils.aoa_to_sheet(data);
  autoWidth(ws, data);
  freezeHeader(ws);
  applyHeaderStyles(ws, headers.length);

  for (let r = 1; r < data.length; r++) {
    const rowData = data[r];
    for (let c = 0; c < headers.length; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      if (!ws[addr]) continue;

      const base = altRowStyle(r - 1);

      if (c === 1) {
        ws[addr].s = { ...base, fill: { fgColor: { rgb: categoryBg(rowData[1]) } } };
      } else if (c === 5) {
        ws[addr].s = { ...base, font: { bold: true, color: { rgb: impactColor(rowData[5]) } } };
      } else {
        ws[addr].s = base;
      }
    }
  }

  XLSX.utils.book_append_sheet(wb, ws, "key_insights");
}

function formatTopValues(tv: { value: string; count: number }[] | null | undefined): string {
  if (!tv) return "";
  return tv.map(v => `${v.value} (${v.count})`).join(", ");
}

function buildColumnProfilesSheet(wb: XLSX.WorkBook, backendColumns: BackendColumnProfile[]): void {
  const headers = [
    "Column Name", "Data Type", "Null Count", "Null %", "Unique Values",
    "Min", "Max", "Mean", "Median", "Std Dev", "Top Values",
  ];
  const data: string[][] = [headers];

  for (const col of backendColumns) {
    const isHighNull = col.null_pct > 20;
    data.push([
      col.column_name,
      col.data_type || "",
      String(col.null_count ?? 0),
      `${(col.null_pct ?? 0).toFixed(1)}%`,
      String(col.unique_values ?? 0),
      String(col.min ?? col.earliest ?? ""),
      String(col.max ?? col.latest ?? ""),
      col.mean != null ? String(col.mean) : "",
      col.median != null ? String(col.median) : "",
      col.std_dev != null ? String(col.std_dev) : "",
      formatTopValues(col.top_values),
    ]);
  }

  const ws = XLSX.utils.aoa_to_sheet(data);
  autoWidth(ws, data);
  freezeHeader(ws);
  applyHeaderStyles(ws, headers.length);

  for (let r = 1; r < data.length; r++) {
    const col = backendColumns[r - 1];
    const isHighNull = col && col.null_pct > 20;

    for (let c = 0; c < headers.length; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      if (!ws[addr]) continue;

      const base = altRowStyle(r - 1);

      if (isHighNull) {
        ws[addr].s = { ...base, fill: { fgColor: { rgb: RED_BG.replace("#", "") } } };
      } else {
        ws[addr].s = base;
      }
    }
  }

  XLSX.utils.book_append_sheet(wb, ws, "column_profiles");
}

function buildRecommendationsSheet(wb: XLSX.WorkBook, report: InsightsReport): void {
  const headers = ["#", "Title", "Description", "Priority", "Effort", "Affected Columns"];
  const data: string[][] = [headers];

  for (const rec of report.recommendations || []) {
    data.push([
      String(rec.recommendation_no),
      rec.title,
      rec.description,
      rec.priority || "",
      rec.effort || "",
      (rec.affected_columns || []).join(", "),
    ]);
  }

  const ws = XLSX.utils.aoa_to_sheet(data);
  autoWidth(ws, data);
  freezeHeader(ws);
  applyHeaderStyles(ws, headers.length);

  for (let r = 1; r < data.length; r++) {
    const rowData = data[r];
    for (let c = 0; c < headers.length; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      if (!ws[addr]) continue;

      const base = altRowStyle(r - 1);

      if (c === 3) {
        ws[addr].s = { ...base, font: { bold: true, color: { rgb: priorityColor(rowData[3]) } } };
      } else if (c === 4) {
        ws[addr].s = { ...base, font: { bold: true, color: { rgb: effortColor(rowData[4]) } } };
      } else {
        ws[addr].s = base;
      }
    }
  }

  XLSX.utils.book_append_sheet(wb, ws, "recommendations");
}

function deriveQualityFlags(backendColumns: BackendColumnProfile[]): DataQualityFlag[] {
  const flags: DataQualityFlag[] = [];
  let flagNo = 1;
  for (const col of backendColumns) {
    if (col.null_pct > 50) {
      flags.push({ flag_no: flagNo++, column_name: col.column_name, issue: "Very high null rate", severity: "High", suggested_fix: "Investigate data source for missing values or consider removing column" });
    } else if (col.null_pct > 20) {
      flags.push({ flag_no: flagNo++, column_name: col.column_name, issue: "High null rate", severity: "Medium", suggested_fix: "Review data collection process and apply imputation if appropriate" });
    }
    if (col.data_type === "Number" && col.std_dev != null && col.mean != null && col.mean !== 0) {
      const cv = Math.abs(col.std_dev / col.mean);
      if (cv > 3) {
        flags.push({ flag_no: flagNo++, column_name: col.column_name, issue: "Extreme variance — possible outliers", severity: "Medium", suggested_fix: "Review outlier values and consider applying caps or filters" });
      }
    }
    if (col.unique_values === 1 && col.null_count === 0) {
      flags.push({ flag_no: flagNo++, column_name: col.column_name, issue: "Single constant value — no variability", severity: "Low", suggested_fix: "Consider removing column if it provides no analytical value" });
    }
  }
  return flags;
}

function buildDataQualityFlagsSheet(wb: XLSX.WorkBook, backendColumns: BackendColumnProfile[], reportFlags?: DataQualityFlag[]): void {
  const headers = ["#", "Column Name", "Issue", "Severity", "Details", "Suggested Fix"];

  const derivedFlags = deriveQualityFlags(backendColumns);
  const allFlags = [...(reportFlags || []), ...derivedFlags];

  const seen = new Set<string>();
  const deduped = allFlags.filter(f => {
    const key = `${f.column_name}:${f.issue}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  let flagNo = 1;
  deduped.forEach(f => { f.flag_no = flagNo++; });

  const sortedFlags = deduped.sort(
    (a, b) => severityOrder(a.severity) - severityOrder(b.severity)
  );

  const data: string[][] = [headers];
  for (const flag of sortedFlags) {
    data.push([
      String(flag.flag_no),
      flag.column_name,
      flag.issue,
      flag.severity || "",
      flag.details || "",
      flag.suggested_fix || "",
    ]);
  }

  const ws = XLSX.utils.aoa_to_sheet(data);
  autoWidth(ws, data);
  freezeHeader(ws);
  applyHeaderStyles(ws, headers.length);

  for (let r = 1; r < data.length; r++) {
    const rowData = data[r];
    for (let c = 0; c < headers.length; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      if (!ws[addr]) continue;

      const base = altRowStyle(r - 1);

      if (c === 3) {
        ws[addr].s = { ...base, font: { bold: true, color: { rgb: severityColor(rowData[3]) } } };
      } else {
        ws[addr].s = base;
      }
    }
  }

  XLSX.utils.book_append_sheet(wb, ws, "data_quality_flags");
}

export function generateInsightsExcel(report: InsightsReport, sourceFileName: string, backendColumns?: BackendColumnProfile[]): string {
  const wb = XLSX.utils.book_new();

  buildExecutiveSummarySheet(wb, report, sourceFileName);
  buildKeyInsightsSheet(wb, report);

  const cols = backendColumns && backendColumns.length > 0 ? backendColumns : [];
  if (cols.length > 0) {
    buildColumnProfilesSheet(wb, cols);
  }

  buildRecommendationsSheet(wb, report);

  if (cols.length > 0) {
    buildDataQualityFlagsSheet(wb, cols, report.data_quality_flags);
  }

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const fileName = `insights_report_${timestamp}.xlsx`;

  XLSX.writeFile(wb, fileName);

  return fileName;
}

export function getInsightsScorecard(report: InsightsReport): { totalInsights: number; highImpact: number; anomalies: number; completeness: number } {
  const totalInsights = report.key_insights.length;
  const highImpact = report.key_insights.filter(
    (i) => i.business_impact?.toLowerCase() === "high" || i.business_impact?.toLowerCase() === "critical"
  ).length;
  const anomalies = (report.column_profiles || []).filter((c) => c.anomaly_flag).length;
  const completeness = report.dataset_summary.overall_completeness_pct != null
    ? Math.round(report.dataset_summary.overall_completeness_pct)
    : 100;
  return { totalInsights, highImpact, anomalies, completeness };
}

export function generateInsightsSummary(report: InsightsReport): string {
  const lines: string[] = [];

  lines.push(`Data Insights Report: ${report.report_title}`);
  lines.push("");
  lines.push(`Dataset: ${report.dataset_summary.total_rows} rows x ${report.dataset_summary.total_columns} columns`);

  if (report.dataset_summary.summary_text) {
    lines.push(report.dataset_summary.summary_text);
  }

  lines.push("");

  const totalInsights = report.key_insights.length;
  const highImpact = report.key_insights.filter(
    (i) => i.business_impact?.toLowerCase() === "high" || i.business_impact?.toLowerCase() === "critical"
  ).length;
  const anomalies = (report.column_profiles || []).filter((c) => c.anomaly_flag).length;
  const completeness = report.dataset_summary.overall_completeness_pct != null
    ? Math.round(report.dataset_summary.overall_completeness_pct)
    : 100;

  lines.push(`Total Insights: ${totalInsights} | High Impact: ${highImpact} | Anomalies: ${anomalies} | Completeness: ${completeness}%`);
  lines.push("");

  const topInsights = report.key_insights.slice(0, 3);
  for (const insight of topInsights) {
    lines.push(`${insight.insight_no}. ${insight.title} — ${insight.description}`);
  }

  if (report.key_insights.length > 3) {
    lines.push(`...and ${report.key_insights.length - 3} more insights in the full report.`);
  }

  lines.push("");
  lines.push("Results saved to insights report Excel file.");

  return lines.join("\n");
}
