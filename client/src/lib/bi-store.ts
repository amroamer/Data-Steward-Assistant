import * as XLSX from "xlsx";

export interface FieldAssessment {
  field_name: string;
  sample_values?: string[];
  classification_level: string;
  classification_code: string;
  confidential_sub_level?: string;
  is_pii: boolean;
  stakeholder_verdict: string;
  ndmo_rule_applied: string;
  remediation_action: string;
  remediation_detail: string;
}

export interface SharingEligibilityData {
  stakeholder_tier: string;
  stakeholder_description: string;
  overall_verdict: string;
  verdict_rationale: string;
  governing_field: string;
  overall_classification: string;
  blocking_fields: string[];
  conditional_fields: string[];
  safe_fields: string[];
  field_assessments: FieldAssessment[];
  approval_checklist?: { item: string; required_for_fields: string[]; owner: string; blocking: boolean }[];
  safe_version_possible?: boolean;
  safe_version_instructions?: string;
  estimated_remediation_effort?: string;
  pdpl_exposure: boolean;
  pdpl_exposure_note?: string;
}

export interface DashboardVisual {
  visual_id: string;
  visual_type: string;
  title: string;
  fields_used: string[];
  x_axis?: string;
  y_axis?: string;
  legend?: string;
  tooltip_fields?: string[];
  dax_measure: string;
  insight_purpose: string;
  placement: string;
}

export interface DashboardDesignData {
  dashboard_title: string;
  dashboard_type: string;
  audience: string;
  pages: { page_number: number; page_title: string; page_purpose: string; visuals: DashboardVisual[] }[];
  slicers: { field_name: string; slicer_type: string; controls_visuals: string[] }[];
  dax_measures: { measure_name: string; formula: string; description: string }[];
  power_query_steps: string[];
  kpis: { kpi_name: string; field_used: string; dax_formula: string; target_logic: string; green_threshold: string; amber_threshold: string; red_threshold: string }[];
  color_theme_json: Record<string, unknown>;
  layout_summary: string;
  recommended_page_count: number;
}

export interface GovernanceIssue {
  field_name: string;
  classification_code: string;
  verdict: string;
  remediation: string;
}

export interface DataQualityIssue {
  issue_id: string;
  field_name: string;
  issue_type: string;
  severity: string;
  description: string;
  affected_rows: string;
  fix_recommendation: string;
}

export interface BusinessLogicIssue {
  issue_id: string;
  issue_type: string;
  description: string;
  severity: string;
  recommendation: string;
}

export interface PresentationIssue {
  issue_id: string;
  field_name: string;
  issue_type: string;
  current_value: string;
  recommended_value: string;
}

export interface ReportTestData {
  report_purpose: string;
  stakeholder_description: string;
  governance_verdict: string;
  governance_summary: string;
  overall_quality_score: number;
  quality_grade: string;
  dimension_scores: { data_governance: number; data_quality: number; business_logic: number; presentation: number };
  governance_issues: GovernanceIssue[];
  data_quality_issues: DataQualityIssue[];
  business_logic_issues: BusinessLogicIssue[];
  presentation_issues: PresentationIssue[];
  recommended_column_order: string[];
  send_recommendation: string;
  pre_send_checklist: string[];
}

export interface TestCase {
  tc_id: string;
  category: string;
  test_name: string;
  objective: string;
  preconditions: string;
  test_steps: string[];
  test_data: string;
  expected_result: string;
  actual_result: string;
  pass_fail_criteria: string;
  severity: string;
  estimated_duration_minutes: number;
  ndmo_reference: string;
}

export interface TestCaseData {
  report_purpose: string;
  test_depth: string;
  total_test_cases: number;
  test_cases: TestCase[];
  coverage_summary: Record<string, number>;
  total_estimated_duration_minutes: number;
  critical_test_count: number;
  recommended_execution_order: string[];
}

export interface DashboardTestCase extends TestCase {
  visual_tested: string;
  power_bi_specific_note: string;
}

export interface DashboardTestData {
  dashboard_description: string;
  audience: string;
  total_test_cases: number;
  test_cases: DashboardTestCase[];
  coverage_summary: Record<string, number>;
  total_estimated_duration_minutes: number;
  critical_test_count: number;
  governance_risk_level: string;
  governance_risk_note: string;
}

interface AppendSheetOptions {
  severityCol?: number;
  actualResultCol?: number;
  verdictRow?: { rowIdx: number; value: string };
}

const HEADER_FILL = { fgColor: { rgb: "1A4B8C" } };
const HEADER_FONT = { bold: true, color: { rgb: "FFFFFF" }, sz: 11 };
const ALT_ROW_FILL = { fgColor: { rgb: "EBF2FB" } };
const YELLOW_FILL = { fgColor: { rgb: "FFFDE7" } };
const SEVERITY_FILLS: Record<string, { fgColor: { rgb: string } }> = {
  Critical: { fgColor: { rgb: "FFCDD2" } },
  High: { fgColor: { rgb: "FFE0B2" } },
  Medium: { fgColor: { rgb: "FFF9C4" } },
  Low: { fgColor: { rgb: "C8E6C9" } },
};
const VERDICT_FILLS: Record<string, { fgColor: { rgb: string } }> = {
  CLEARED: { fgColor: { rgb: "C8E6C9" } },
  "CLEARED WITH CONDITIONS": { fgColor: { rgb: "FFE0B2" } },
  "CLEARED AFTER REMEDIATION": { fgColor: { rgb: "FFF9C4" } },
  BLOCKED: { fgColor: { rgb: "FFCDD2" } },
};

let workbook: XLSX.WorkBook | null = null;

function getOrCreateWorkbook(): XLSX.WorkBook {
  if (!workbook) workbook = XLSX.utils.book_new();
  return workbook;
}

function applyHeaderStyle(ws: XLSX.WorkSheet, headerRowIdx: number, colCount: number) {
  for (let c = 0; c < colCount; c++) {
    const ref = XLSX.utils.encode_cell({ r: headerRowIdx, c });
    if (ws[ref]) {
      ws[ref].s = { fill: HEADER_FILL, font: HEADER_FONT, alignment: { horizontal: "center" } };
    }
  }
}

function applyAltRowFill(ws: XLSX.WorkSheet, startRow: number, endRow: number, colCount: number) {
  for (let r = startRow; r <= endRow; r++) {
    if ((r - startRow) % 2 === 1) {
      for (let c = 0; c < colCount; c++) {
        const ref = XLSX.utils.encode_cell({ r, c });
        if (ws[ref]) {
          ws[ref].s = { ...(ws[ref].s || {}), fill: ALT_ROW_FILL };
        }
      }
    }
  }
}

function applySeverityFill(ws: XLSX.WorkSheet, rows: (string | number | boolean)[][], startRow: number, sevColIdx: number, colCount: number) {
  rows.forEach((row, i) => {
    const sev = String(row[sevColIdx] || "");
    const fill = SEVERITY_FILLS[sev];
    if (fill) {
      for (let c = 0; c < colCount; c++) {
        const ref = XLSX.utils.encode_cell({ r: startRow + i, c });
        if (ws[ref]) ws[ref].s = { ...(ws[ref].s || {}), fill };
      }
    }
  });
}

function applyActualResultYellowFill(ws: XLSX.WorkSheet, startRow: number, rowCount: number, colIdx: number) {
  for (let r = startRow; r < startRow + rowCount; r++) {
    const ref = XLSX.utils.encode_cell({ r, c: colIdx });
    if (!ws[ref]) ws[ref] = { t: "s", v: "" };
    ws[ref].s = { ...(ws[ref].s || {}), fill: YELLOW_FILL };
  }
}

function autoSizeColumns(allRows: (string | number | boolean)[][], headers: string[], minWidths?: number[]): { wch: number }[] {
  return headers.map((h, c) => {
    let max = h.length;
    for (const row of allRows) {
      if (row[c] !== undefined && row[c] !== null) {
        const len = String(row[c]).length;
        if (len > max) max = len;
      }
    }
    const min = minWidths && minWidths[c] ? minWidths[c] : 8;
    return { wch: Math.max(min, Math.min(max + 2, 60)) };
  });
}

function applyAllStyles(ws: XLSX.WorkSheet, headerRowIdx: number, headers: string[], allDataRows: (string | number | boolean)[][], options?: AppendSheetOptions) {
  applyHeaderStyle(ws, headerRowIdx, headers.length);
  applyAltRowFill(ws, headerRowIdx + 1, headerRowIdx + allDataRows.length, headers.length);
  if (options?.severityCol !== undefined) {
    applySeverityFill(ws, allDataRows, headerRowIdx + 1, options.severityCol, headers.length);
  }
  if (options?.actualResultCol !== undefined) {
    applyActualResultYellowFill(ws, headerRowIdx + 1, allDataRows.length, options.actualResultCol);
  }
}

function appendToSheet(wb: XLSX.WorkBook, sheetName: string, headers: string[], rows: (string | number | boolean)[][], summaryRows?: (string | number | boolean)[][], colWidths?: number[], options?: AppendSheetOptions) {
  const existing = wb.Sheets[sheetName];

  if (existing) {
    const oldData = XLSX.utils.sheet_to_json<(string | number | boolean)[]>(existing, { header: 1 });
    const separator: (string | number | boolean)[] = [`--- Run ${new Date().toLocaleString()} ---`, ...Array(headers.length - 1).fill("")];
    const combined = [...oldData, separator, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(combined);

    const headerRowIdx = oldData.findIndex(row => row.length > 0 && String(row[0]) === headers[0]);
    if (headerRowIdx >= 0) {
      const dataRows = combined.slice(headerRowIdx + 1);
      ws["!cols"] = autoSizeColumns(combined, headers, colWidths);
      ws["!freeze"] = { xSplit: 0, ySplit: headerRowIdx + 1 };
      applyHeaderStyle(ws, headerRowIdx, headers.length);
      applyAltRowFill(ws, headerRowIdx + 1, headerRowIdx + dataRows.length, headers.length);
      if (options?.severityCol !== undefined) {
        applySeverityFill(ws, dataRows, headerRowIdx + 1, options.severityCol, headers.length);
      }
      if (options?.actualResultCol !== undefined) {
        applyActualResultYellowFill(ws, headerRowIdx + 1, dataRows.length, options.actualResultCol);
      }
    } else {
      ws["!cols"] = autoSizeColumns(combined, headers, colWidths);
    }
    wb.Sheets[sheetName] = ws;
  } else {
    const allRows = summaryRows ? [...summaryRows, [], headers, ...rows] : [headers, ...rows];
    const headerRowIdx = summaryRows ? summaryRows.length + 1 : 0;
    const ws = XLSX.utils.aoa_to_sheet(allRows);
    ws["!cols"] = autoSizeColumns(allRows, headers, colWidths);
    ws["!freeze"] = { xSplit: 0, ySplit: headerRowIdx + 1 };

    applyAllStyles(ws, headerRowIdx, headers, rows, options);

    if (options?.verdictRow && summaryRows) {
      const vFill = VERDICT_FILLS[options.verdictRow.value];
      if (vFill) {
        for (let c = 0; c < headers.length; c++) {
          const ref = XLSX.utils.encode_cell({ r: options.verdictRow.rowIdx, c });
          if (ws[ref]) ws[ref].s = { ...(ws[ref].s || {}), fill: vFill };
        }
      }
    }

    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }
}

export function appendBiSheet(sheetName: string, headers: string[], rows: (string | number | boolean)[][], summaryRows?: (string | number | boolean)[][], colWidths?: number[], options?: AppendSheetOptions) {
  const wb = getOrCreateWorkbook();
  appendToSheet(wb, sheetName, headers, rows, summaryRows, colWidths, options);
}

export function addSharingEligibilitySheet(data: Record<string, unknown>) {
  const wb = getOrCreateWorkbook();
  const d = data as Record<string, unknown>;
  const verdict = String(d.overall_verdict || "");
  const summaryRows: (string | number | boolean)[][] = [
    ["SHARING ELIGIBILITY REPORT"],
    ["Generated", new Date().toLocaleString()],
    ["Overall Verdict", verdict],
    ["Stakeholder", String(d.stakeholder_description || "")],
    ["Stakeholder Tier", String(d.stakeholder_tier || "")],
    ["Governing Field", String(d.governing_field || "")],
    ["Overall Classification", String(d.overall_classification || "")],
    ["PDPL Exposure", d.pdpl_exposure ? "YES" : "NO"],
    [],
  ];
  const headers = ["Field Name", "Classification", "Code", "Sub-Level", "Is PII", "Verdict", "Remediation Action", "Remediation Detail", "NDMO Rule"];
  const assessments = (d.field_assessments || []) as Record<string, unknown>[];
  const rows = assessments.map(f => [
    String(f.field_name || ""),
    String(f.classification_level || ""),
    String(f.classification_code || ""),
    String(f.confidential_sub_level || "N/A"),
    f.is_pii ? "YES" : "NO",
    String(f.stakeholder_verdict || ""),
    String(f.remediation_action || ""),
    String(f.remediation_detail || ""),
    String(f.ndmo_rule_applied || ""),
  ]);
  appendToSheet(wb, "sharing_eligibility", headers, rows, summaryRows, [18, 16, 8, 10, 8, 14, 18, 35, 30], { verdictRow: { rowIdx: 2, value: verdict } });
}

export function addDashboardDesignSheets(data: Record<string, unknown>) {
  const wb = getOrCreateWorkbook();
  const pages = (data.pages || []) as Record<string, unknown>[];
  const designHeaders = ["Visual ID", "Visual Type", "Title", "Fields Used", "DAX Measure", "Insight Purpose", "Placement"];
  const designRows: (string | number | boolean)[][] = [];
  pages.forEach(p => {
    designRows.push([`--- Page ${p.page_number}: ${p.page_title} ---`, "", "", "", "", "", ""]);
    const visuals = (p.visuals || []) as Record<string, unknown>[];
    visuals.forEach(v => {
      designRows.push([
        String(v.visual_id || ""),
        String(v.visual_type || ""),
        String(v.title || ""),
        ((v.fields_used || []) as string[]).join(", "),
        String(v.dax_measure || ""),
        String(v.insight_purpose || ""),
        String(v.placement || ""),
      ]);
    });
  });
  appendToSheet(wb, "dashboard_design", designHeaders, designRows, undefined, [12, 14, 25, 30, 40, 35, 14]);

  const daxMeasures = (data.dax_measures || []) as Record<string, unknown>[];
  const daxHeaders = ["Measure Name", "Formula", "Description"];
  const daxRows = daxMeasures.map(m => [String(m.measure_name || ""), String(m.formula || ""), String(m.description || "")]);
  appendToSheet(wb, "dax_measures", daxHeaders, daxRows, undefined, [25, 60, 40]);

  const kpis = (data.kpis || []) as Record<string, unknown>[];
  const kpiHeaders = ["KPI Name", "DAX Formula", "Target Logic", "Green", "Amber", "Red"];
  const kpiRows = kpis.map(k => [
    String(k.kpi_name || ""),
    String(k.dax_formula || ""),
    String(k.target_logic || ""),
    String(k.green_threshold || ""),
    String(k.amber_threshold || ""),
    String(k.red_threshold || ""),
  ]);
  appendToSheet(wb, "kpis", kpiHeaders, kpiRows, undefined, [25, 50, 30, 15, 15, 15]);
}

export function addReportTestSheet(data: Record<string, unknown>) {
  const wb = getOrCreateWorkbook();
  const verdict = String(data.governance_verdict || "");
  const summaryRows: (string | number | boolean)[][] = [
    ["REPORT TEST RESULTS"],
    ["Generated", new Date().toLocaleString()],
    ["Governance Verdict", verdict],
    ["Quality Score", Number(data.overall_quality_score || 0)],
    ["Grade", String(data.quality_grade || "")],
    ["Send Recommendation", String(data.send_recommendation || "")],
    [],
  ];
  const headers = ["Dimension", "Issue ID", "Field", "Severity", "Description", "Fix Recommendation"];
  const rows: (string | number | boolean)[][] = [];
  const govIssues = (data.governance_issues || []) as Record<string, unknown>[];
  govIssues.forEach(i => {
    const v = String(i.verdict || "");
    const sev = v === "BLOCK" ? "Critical" : v === "CONDITIONAL" ? "High" : "Low";
    rows.push(["Governance", "", String(i.field_name || ""), sev, `[${v}] ${i.classification_code}: ${i.remediation || ""}`, String(i.remediation || "")]);
  });
  const dqIssues = (data.data_quality_issues || []) as Record<string, unknown>[];
  dqIssues.forEach(i => rows.push(["Data Quality", String(i.issue_id || ""), String(i.field_name || ""), String(i.severity || ""), String(i.description || ""), String(i.fix_recommendation || "")]));
  const blIssues = (data.business_logic_issues || []) as Record<string, unknown>[];
  blIssues.forEach(i => rows.push(["Business Logic", String(i.issue_id || ""), "", String(i.severity || ""), String(i.description || ""), String(i.recommendation || "")]));
  const prIssues = (data.presentation_issues || []) as Record<string, unknown>[];
  prIssues.forEach(i => rows.push(["Presentation", String(i.issue_id || ""), String(i.field_name || ""), "", `${i.current_value} → ${i.recommended_value}`, ""]));
  appendToSheet(wb, "report_test_results", headers, rows, summaryRows, [16, 10, 18, 12, 45, 35], { severityCol: 3, verdictRow: { rowIdx: 2, value: verdict } });
}

export function addTestCaseSheets(data: Record<string, unknown>) {
  const wb = getOrCreateWorkbook();
  const cases = (data.test_cases || []) as Record<string, unknown>[];
  const headers = ["TC ID", "Category", "Test Name", "Severity", "Objective", "Preconditions", "Test Steps", "Test Data", "Expected Result", "Actual Result", "Pass/Fail", "Duration (min)", "NDMO Ref"];
  const rows = cases.map(tc => [
    String(tc.tc_id || ""),
    String(tc.category || ""),
    String(tc.test_name || ""),
    String(tc.severity || ""),
    String(tc.objective || ""),
    String(tc.preconditions || ""),
    ((tc.test_steps || []) as string[]).join("\n"),
    String(tc.test_data || ""),
    String(tc.expected_result || ""),
    "",
    "",
    Number(tc.estimated_duration_minutes || 0),
    String(tc.ndmo_reference || "N/A"),
  ]);
  appendToSheet(wb, "test_cases", headers, rows, undefined, [10, 18, 25, 10, 35, 25, 40, 25, 35, 20, 10, 10, 20], { severityCol: 3, actualResultCol: 9 });

  const coverage = (data.coverage_summary || {}) as Record<string, number>;
  const summHeaders = ["Category", "Count"];
  const summRows: (string | number | boolean)[][] = Object.entries(coverage).map(([k, v]) => [k.replace(/_/g, " "), v]);
  summRows.push(["Total Duration (min)", Number(data.total_estimated_duration_minutes || 0)]);
  summRows.push(["Critical Tests", Number(data.critical_test_count || 0)]);
  appendToSheet(wb, "test_summary", summHeaders, summRows, undefined, [25, 10]);
}

export function addDashboardTestSheet(data: Record<string, unknown>) {
  const wb = getOrCreateWorkbook();
  const cases = (data.test_cases || []) as Record<string, unknown>[];
  const headers = ["TC ID", "Category", "Visual Tested", "Test Name", "Severity", "Objective", "Preconditions", "Test Steps", "Test Data", "Expected Result", "Actual Result", "Pass/Fail", "Duration (min)", "NDMO Ref", "Power BI Note"];
  const rows = cases.map(tc => [
    String(tc.tc_id || ""),
    String(tc.category || ""),
    String(tc.visual_tested || ""),
    String(tc.test_name || ""),
    String(tc.severity || ""),
    String(tc.objective || ""),
    String(tc.preconditions || ""),
    ((tc.test_steps || []) as string[]).join("\n"),
    String(tc.test_data || ""),
    String(tc.expected_result || ""),
    "",
    "",
    Number(tc.estimated_duration_minutes || 0),
    String(tc.ndmo_reference || "N/A"),
    String(tc.power_bi_specific_note || ""),
  ]);
  appendToSheet(wb, "dashboard_test_cases", headers, rows, undefined, [12, 18, 20, 25, 10, 35, 25, 40, 25, 35, 20, 10, 10, 20, 30], { severityCol: 4, actualResultCol: 10 });
}

export function exportTestRunSheet(cases: Record<string, unknown>[], testStatus: Record<string, "pass" | "fail" | null>) {
  const wb = getOrCreateWorkbook();
  const headers = ["TC ID", "Category", "Test Name", "Severity", "Objective", "Preconditions", "Test Steps", "Test Data", "Expected Result", "Actual Result", "Pass/Fail", "Duration (min)", "NDMO Ref"];
  const rows = cases.map(tc => {
    const tcId = String(tc.tc_id || "");
    const status = testStatus[tcId];
    return [
      tcId,
      String(tc.category || ""),
      String(tc.test_name || ""),
      String(tc.severity || ""),
      String(tc.objective || ""),
      String(tc.preconditions || ""),
      ((tc.test_steps || []) as string[]).join("\n"),
      String(tc.test_data || ""),
      String(tc.expected_result || ""),
      status === "pass" ? "PASSED" : status === "fail" ? "FAILED" : "",
      status === "pass" ? "PASS" : status === "fail" ? "FAIL" : "",
      Number(tc.estimated_duration_minutes || 0),
      String(tc.ndmo_reference || "N/A"),
    ];
  });
  appendToSheet(wb, "test_cases", headers, rows, undefined, [10, 18, 25, 10, 35, 25, 40, 25, 35, 20, 10, 10, 20], { severityCol: 3, actualResultCol: 9 });
}

export function exportDashboardTestRunSheet(cases: Record<string, unknown>[], testStatus: Record<string, "pass" | "fail" | null>) {
  const wb = getOrCreateWorkbook();
  const headers = ["TC ID", "Category", "Visual Tested", "Test Name", "Severity", "Objective", "Preconditions", "Test Steps", "Test Data", "Expected Result", "Actual Result", "Pass/Fail", "Duration (min)", "NDMO Ref", "Power BI Note"];
  const rows = cases.map(tc => {
    const tcId = String(tc.tc_id || "");
    const status = testStatus[tcId];
    return [
      tcId,
      String(tc.category || ""),
      String(tc.visual_tested || ""),
      String(tc.test_name || ""),
      String(tc.severity || ""),
      String(tc.objective || ""),
      String(tc.preconditions || ""),
      ((tc.test_steps || []) as string[]).join("\n"),
      String(tc.test_data || ""),
      String(tc.expected_result || ""),
      status === "pass" ? "PASSED" : status === "fail" ? "FAILED" : "",
      status === "pass" ? "PASS" : status === "fail" ? "FAIL" : "",
      Number(tc.estimated_duration_minutes || 0),
      String(tc.ndmo_reference || "N/A"),
      String(tc.power_bi_specific_note || ""),
    ];
  });
  appendToSheet(wb, "dashboard_test_cases", headers, rows, undefined, [12, 18, 20, 25, 10, 35, 25, 40, 25, 35, 20, 10, 10, 20, 30], { severityCol: 4, actualResultCol: 10 });
}

export function downloadBiReport() {
  const wb = getOrCreateWorkbook();
  if (!wb.SheetNames.length) return;
  XLSX.writeFile(wb, "bi_agent_report.xlsx");
}

export function hasSheets(): boolean {
  return workbook !== null && workbook.SheetNames.length > 0;
}

export function resetWorkbook() {
  workbook = null;
}
