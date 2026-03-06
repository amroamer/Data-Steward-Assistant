import * as XLSX from "xlsx";
import { extractTablesFromMarkdown, type ParsedTable } from "./table-utils";
import type { DataModelJSON } from "@/components/DataModelDiagram";

export type { DataModelJSON };

export type AnalysisType = "business_definitions" | "data_classification" | "data_quality";

export interface PiiScanColumn {
  column_name: string;
  detected_data_type: string;
  is_pii: boolean;
  is_sensitive: boolean;
  pii_category: string;
  pdpl_relevance: string;
  risk_level: string;
  recommendation: string;
  suggested_control: string;
}

export interface PiiScanSummary {
  total_columns_scanned: number;
  pii_columns_found: number;
  sensitive_columns_found: number;
  clean_columns: number;
  overall_risk_level: string;
}

export interface PiiScanResult {
  scan_summary: PiiScanSummary;
  columns: PiiScanColumn[];
}

export interface DqFieldRuleItem {
  rule_id: string;
  rule_name: string;
  rule_layer: string;
  dq_dimension: string;
  rule_type: string;
  rule_description: string;
  rule_expression: string;
  severity: string;
  expected_behavior: string;
  failure_example: string;
  pass_example: string;
  remediation: string;
}

export interface DqFieldRuleGroup {
  field_name: string;
  inferred_data_type: string;
  business_context: string;
  rules: DqFieldRuleItem[];
}

export interface DqCrossFieldRule {
  rule_id: string;
  rule_name: string;
  involved_fields: string[];
  rule_description: string;
  rule_expression: string;
  business_rationale: string;
  severity: string;
  failure_example: string;
  remediation: string;
}

export interface DqBusinessWarning {
  warning_id: string;
  field_name: string;
  warning_type: string;
  description: string;
  recommendation: string;
}

export interface DqAnalysisSummary {
  total_fields_analyzed: number;
  total_rules_generated: number;
  technical_rules_count: number;
  logical_rules_count: number;
  business_rules_count: number;
  cross_field_rules_count: number;
  warnings_count: number;
  fields_with_critical_rules: number;
  overall_complexity: string;
}

export interface DqAnalysisResult {
  analysis_summary: DqAnalysisSummary;
  field_rules: DqFieldRuleGroup[];
  cross_field_rules: DqCrossFieldRule[];
  business_logic_warnings: DqBusinessWarning[];
}

export interface InformaticaClassification {
  classification_level: string;
  rationale: string;
  handling_rules: string;
}

export interface InformaticaOutput {
  descriptions: Record<string, string>;
  data_quality_rules: Record<string, string>;
  informatica_sql: Record<string, string[]>;
  data_classification: Record<string, InformaticaClassification>;
  format_types: Record<string, string>;
}

export interface ResultRow {
  field_name: string;
  business_term?: string;
  business_definition?: string;
  data_type?: string;
  example?: string;
  classification_level?: string;
  classification_rationale?: string;
  data_owner?: string;
  sensitivity_category?: string;
  dq_dimension?: string;
  dq_rule?: string;
  dq_threshold?: string;
  dq_priority?: string;
  [key: string]: string | undefined;
}

const ANALYSIS_COLUMNS: Record<AnalysisType, { keys: string[]; headers: string[] }> = {
  business_definitions: {
    keys: ["business_term", "business_definition", "data_type", "example"],
    headers: ["Business Term", "Business Definition", "Data Type", "Example"],
  },
  data_classification: {
    keys: ["classification_level", "classification_rationale", "data_owner", "sensitivity_category"],
    headers: ["Classification Level", "Classification Rationale", "Data Owner", "Sensitivity Category"],
  },
  data_quality: {
    keys: ["dq_dimension", "dq_rule", "dq_threshold", "dq_priority"],
    headers: ["DQ Dimension", "DQ Rule", "DQ Threshold", "DQ Priority"],
  },
};

const ANALYSIS_LABELS: Record<AnalysisType, string> = {
  business_definitions: "Business Definitions",
  data_classification: "Data Classification",
  data_quality: "Data Quality Rules",
};

const ANALYSIS_SHEET_NAMES: Record<AnalysisType, string> = {
  business_definitions: "business_definitions",
  data_classification: "data_classification",
  data_quality: "data_quality_rules",
};

const ANALYSIS_ORDER: AnalysisType[] = ["business_definitions", "data_classification", "data_quality"];

const HEADER_PATTERNS: Record<AnalysisType, string[]> = {
  business_definitions: ["business term", "business definition", "business def"],
  data_classification: ["classification level", "classification", "sensitivity"],
  data_quality: ["dq dimension", "dq rule", "quality dimension", "quality rule", "data quality"],
};

function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
}

const FIELD_NAME_EXACT = ["field_name", "field", "column_name", "column", "data_element", "attribute", "name"];
const FIELD_NAME_PARTIAL = ["field", "name", "column", "element", "attribute"];

function hasFieldNameColumn(headers: string[]): boolean {
  for (const pattern of FIELD_NAME_EXACT) {
    if (headers.some((h) => normalizeHeader(h) === pattern)) return true;
  }
  for (const pattern of FIELD_NAME_PARTIAL) {
    if (headers.some((h) => normalizeHeader(h).includes(pattern))) return true;
  }
  return false;
}

function findFieldNameColumn(headers: string[]): number {
  for (const pattern of FIELD_NAME_EXACT) {
    const idx = headers.findIndex((h) => normalizeHeader(h) === pattern);
    if (idx !== -1) return idx;
  }
  for (const pattern of FIELD_NAME_PARTIAL) {
    const idx = headers.findIndex((h) => normalizeHeader(h).includes(pattern));
    if (idx !== -1) return idx;
  }
  return 0;
}

function detectTableAnalysisType(table: ParsedTable): AnalysisType | null {
  const headerStr = table.headers.join(" ").toLowerCase();
  for (const type of ANALYSIS_ORDER) {
    if (HEADER_PATTERNS[type].some((p) => headerStr.includes(p))) {
      return type;
    }
  }
  return null;
}

const HEADER_MAPPINGS: Record<AnalysisType, Record<string, string[]>> = {
  business_definitions: {
    business_term: ["business_term", "term"],
    business_definition: ["business_definition", "definition", "description"],
    data_type: ["data_type", "type", "datatype"],
    example: ["example", "sample", "sample_value", "example_value"],
  },
  data_classification: {
    classification_level: ["classification_level", "classification", "level", "class"],
    classification_rationale: ["classification_rationale", "rationale", "justification", "reason"],
    data_owner: ["data_owner", "owner"],
    sensitivity_category: ["sensitivity_category", "sensitivity", "category"],
  },
  data_quality: {
    dq_dimension: ["dq_dimension", "dimension", "quality_dimension", "data_quality_dimension"],
    dq_rule: ["dq_rule", "rule", "quality_rule", "data_quality_rule"],
    dq_threshold: ["dq_threshold", "threshold"],
    dq_priority: ["dq_priority", "priority"],
  },
};

function mapHeaderToKey(header: string, analysisType: AnalysisType): string | null {
  const norm = normalizeHeader(header);
  const typeMap = HEADER_MAPPINGS[analysisType];

  for (const [key, patterns] of Object.entries(typeMap)) {
    if (patterns.some((p) => norm === p)) {
      return key;
    }
  }

  for (const [key, patterns] of Object.entries(typeMap)) {
    if (patterns.some((p) => norm.includes(p))) {
      return key;
    }
  }

  return null;
}

function extractFieldDataFromTable(
  table: ParsedTable,
  analysisType: AnalysisType
): Record<string, Record<string, string>> {
  const result: Record<string, Record<string, string>> = {};
  const fieldNameIdx = findFieldNameColumn(table.headers);
  const columnMapping: Record<number, string> = {};

  table.headers.forEach((header, idx) => {
    if (idx === fieldNameIdx) return;
    const key = mapHeaderToKey(header, analysisType);
    if (key) columnMapping[idx] = key;
  });

  if (Object.keys(columnMapping).length === 0) return result;

  for (const row of table.rows) {
    const fieldName = row[fieldNameIdx]?.trim();
    if (!fieldName) continue;

    if (!result[fieldName]) result[fieldName] = {};
    for (const [idxStr, key] of Object.entries(columnMapping)) {
      const idx = parseInt(idxStr);
      const value = row[idx]?.trim();
      if (value) result[fieldName][key] = value;
    }
  }

  return result;
}

function extractDqMultiRows(
  table: ParsedTable
): { fieldName: string; columns: Record<string, string> }[] {
  const fieldNameIdx = findFieldNameColumn(table.headers);
  const columnMapping: Record<number, string> = {};

  table.headers.forEach((header, idx) => {
    if (idx === fieldNameIdx) return;
    const key = mapHeaderToKey(header, "data_quality");
    if (key) columnMapping[idx] = key;
  });

  if (Object.keys(columnMapping).length === 0) return [];

  const rows: { fieldName: string; columns: Record<string, string> }[] = [];
  for (const row of table.rows) {
    const fieldName = row[fieldNameIdx]?.trim();
    if (!fieldName) continue;

    const columns: Record<string, string> = {};
    for (const [idxStr, key] of Object.entries(columnMapping)) {
      const idx = parseInt(idxStr);
      const value = row[idx]?.trim();
      if (value) columns[key] = value;
    }
    if (Object.keys(columns).length > 0) {
      rows.push({ fieldName, columns });
    }
  }

  return rows;
}

export interface AnalysisResult {
  analysisType: AnalysisType;
  fieldData: Record<string, Record<string, string>>;
  dqMultiRows?: { fieldName: string; columns: Record<string, string> }[];
}

export function detectAndExtractAllAnalyses(content: string): AnalysisResult[] {
  const tables = extractTablesFromMarkdown(content);

  const accumulatedFieldData = new Map<AnalysisType, Record<string, Record<string, string>>>();
  const accumulatedDqRows = new Map<AnalysisType, { fieldName: string; columns: Record<string, string> }[]>();

  for (const table of tables) {
    if (!hasFieldNameColumn(table.headers)) continue;

    const analysisType = detectTableAnalysisType(table);
    if (!analysisType) continue;

    if (analysisType === "data_quality") {
      const dqMultiRows = extractDqMultiRows(table);
      const existing = accumulatedDqRows.get(analysisType) || [];
      accumulatedDqRows.set(analysisType, [...existing, ...dqMultiRows]);

      const fieldData = extractFieldDataFromTable(table, analysisType);
      const existingFd = accumulatedFieldData.get(analysisType) || {};
      for (const [fieldName, columns] of Object.entries(fieldData)) {
        existingFd[fieldName] = { ...(existingFd[fieldName] || {}), ...columns };
      }
      accumulatedFieldData.set(analysisType, existingFd);
    } else {
      const fieldData = extractFieldDataFromTable(table, analysisType);
      const existingFd = accumulatedFieldData.get(analysisType) || {};
      for (const [fieldName, columns] of Object.entries(fieldData)) {
        existingFd[fieldName] = { ...(existingFd[fieldName] || {}), ...columns };
      }
      accumulatedFieldData.set(analysisType, existingFd);
    }
  }

  const results: AnalysisResult[] = [];
  const allTypes = new Set<AnalysisType>([
    ...accumulatedFieldData.keys(),
    ...accumulatedDqRows.keys(),
  ]);

  for (const analysisType of allTypes) {
    const fieldData = accumulatedFieldData.get(analysisType) || {};
    const dqRows = accumulatedDqRows.get(analysisType);
    if (Object.keys(fieldData).length === 0 && (!dqRows || dqRows.length === 0)) continue;
    const result: AnalysisResult = { analysisType, fieldData };
    if (dqRows && dqRows.length > 0) {
      result.dqMultiRows = dqRows;
    }
    results.push(result);
  }

  return results;
}

export function mergeResults(
  existing: ResultRow[],
  analysisResults: AnalysisResult[]
): ResultRow[] {
  const rowMap = new Map<string, ResultRow>();
  for (const row of existing) {
    rowMap.set(row.field_name.toLowerCase(), { ...row });
  }

  for (const result of analysisResults) {
    if (result.analysisType !== "data_quality") {
      for (const [fieldName, columns] of Object.entries(result.fieldData)) {
        const key = fieldName.toLowerCase();
        const existingRow = rowMap.get(key);
        if (existingRow) {
          rowMap.set(key, { ...existingRow, ...columns, field_name: existingRow.field_name });
        } else {
          rowMap.set(key, { field_name: fieldName, ...columns });
        }
      }
    }
  }

  return Array.from(rowMap.values());
}

export function mergeDqResults(
  existing: ResultRow[],
  dqMultiRows: { fieldName: string; columns: Record<string, string> }[]
): ResultRow[] {
  const existingMap = new Map<string, ResultRow>();
  for (const row of existing) {
    existingMap.set(row.field_name.toLowerCase(), { ...row });
  }

  const dqRows: ResultRow[] = [];
  for (const { fieldName, columns } of dqMultiRows) {
    const key = fieldName.toLowerCase();
    const existingRow = existingMap.get(key);
    if (existingRow) {
      dqRows.push({ ...existingRow, ...columns });
    } else {
      dqRows.push({ field_name: fieldName, ...columns });
    }
  }

  const fieldsWithDq = new Set(dqMultiRows.map((r) => r.fieldName.toLowerCase()));
  const nonDqRows = existing.filter((r) => !fieldsWithDq.has(r.field_name.toLowerCase()));

  return [...nonDqRows, ...dqRows];
}

export function detectPiiScanJSON(content: string): PiiScanResult | null {
  const allBlocks = content.matchAll(/```(?:json)?\s*([\s\S]*?)```/g);
  for (const match of allBlocks) {
    const candidate = match[1].trim();
    if (!candidate) continue;
    try {
      const parsed = JSON.parse(candidate);
      if (
        parsed &&
        parsed.scan_summary &&
        Array.isArray(parsed.columns) &&
        typeof parsed.scan_summary.total_columns_scanned === "number" &&
        typeof parsed.scan_summary.pii_columns_found === "number" &&
        typeof parsed.scan_summary.overall_risk_level === "string" &&
        !parsed.fact_tables &&
        !parsed.dimension_tables
      ) {
        return parsed as PiiScanResult;
      }
    } catch {}
  }
  return null;
}

export function generatePiiScanSummary(scan: PiiScanResult): string {
  const s = scan.scan_summary;
  const riskEmoji = s.overall_risk_level === "High" ? "🔴" : s.overall_risk_level === "Medium" ? "🟡" : "🟢";
  const lines: string[] = [];
  lines.push(`🔍 PII & Sensitive Data Scan Complete`);
  lines.push(`Scanned ${s.total_columns_scanned} columns — ${s.pii_columns_found} contain PII, ${s.sensitive_columns_found} contain sensitive data, ${s.clean_columns} are clean.`);
  lines.push(`${riskEmoji} Overall Risk Level: ${s.overall_risk_level}`);
  lines.push(`Results saved to result.xlsx — Sheet: pii_scan`);
  return lines.join("\n");
}

function appendPiiScanSheet(wb: XLSX.WorkBook, scan: PiiScanResult): void {
  const headers = ["Column Name", "Detected Data Type", "Is PII", "Is Sensitive", "PII Category", "PDPL Relevance", "Risk Level", "Recommendation", "Suggested Control"];
  const wsData: string[][] = [headers];

  for (const col of scan.columns) {
    wsData.push([
      col.column_name,
      col.detected_data_type,
      col.is_pii ? "YES" : "NO",
      col.is_sensitive ? "YES" : "NO",
      col.pii_category,
      col.pdpl_relevance,
      col.risk_level,
      col.recommendation,
      col.suggested_control,
    ]);
  }

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  autoWidthSheet(ws, wsData);
  ws["!freeze"] = { xSplit: 0, ySplit: 1, topLeftCell: "A2", activePane: "bottomLeft", state: "frozen" };
  if (!ws["!rows"]) ws["!rows"] = [];
  XLSX.utils.book_append_sheet(wb, ws, "pii_scan");
}

function repairTruncatedDqJson(candidate: string): DqAnalysisResult | null {
  if (!candidate.includes('"analysis_summary"') || !candidate.includes('"field_rules"')) return null;
  const closers = [
    ']}],"cross_field_rules":[],"business_logic_warnings":[]}',
    '],"cross_field_rules":[],"business_logic_warnings":[]}',
    ',"cross_field_rules":[],"business_logic_warnings":[]}',
  ];
  const positions: number[] = [];
  for (let i = candidate.length - 1; i >= Math.floor(candidate.length * 0.2); i--) {
    if (candidate[i] === '}') positions.push(i + 1);
  }
  for (const pos of positions) {
    const trimmed = candidate.slice(0, pos);
    for (const closer of closers) {
      try {
        const parsed = JSON.parse(trimmed + closer);
        if (parsed && parsed.analysis_summary && Array.isArray(parsed.field_rules) && parsed.field_rules.length > 0) {
          const allRules = parsed.field_rules.flatMap((f: any) => f.rules || []);
          parsed.analysis_summary.total_fields_analyzed = parsed.field_rules.length;
          parsed.analysis_summary.total_rules_generated = allRules.length;
          parsed.analysis_summary.technical_rules_count = allRules.filter((r: any) => r.rule_layer === "Technical").length;
          parsed.analysis_summary.logical_rules_count = allRules.filter((r: any) => r.rule_layer === "Logical").length;
          parsed.analysis_summary.business_rules_count = allRules.filter((r: any) => r.rule_layer === "Business").length;
          parsed.analysis_summary.cross_field_rules_count = 0;
          parsed.analysis_summary.warnings_count = 0;
          parsed.analysis_summary.fields_with_critical_rules = allRules.filter((r: any) => r.severity === "Critical").length;
          if (!parsed.cross_field_rules) parsed.cross_field_rules = [];
          if (!parsed.business_logic_warnings) parsed.business_logic_warnings = [];
          return parsed as DqAnalysisResult;
        }
      } catch {}
    }
  }
  return null;
}

export function detectDqAnalysisJSON(content: string): DqAnalysisResult | null {
  const allBlocks = content.matchAll(/```(?:json)?\s*([\s\S]*?)```/g);
  const candidates: string[] = [];
  for (const match of allBlocks) {
    const candidate = match[1].trim();
    if (!candidate) continue;
    candidates.push(candidate);
    try {
      const parsed = JSON.parse(candidate);
      if (
        parsed &&
        parsed.analysis_summary &&
        Array.isArray(parsed.field_rules) &&
        typeof parsed.analysis_summary.total_rules_generated === "number" &&
        !parsed.fact_tables &&
        !parsed.scan_summary
      ) {
        return parsed as DqAnalysisResult;
      }
    } catch {}
  }
  for (const candidate of candidates) {
    if (candidate.includes('"analysis_summary"') && candidate.includes('"field_rules"') && !candidate.includes('"fact_tables"') && !candidate.includes('"scan_summary"')) {
      const recovered = repairTruncatedDqJson(candidate);
      if (recovered) return recovered;
    }
  }
  const openBlock = content.match(/```(?:json)?\s*([\s\S]*?)$/);
  if (openBlock) {
    const candidate = openBlock[1].trim();
    if (candidate.includes('"analysis_summary"') && candidate.includes('"field_rules"')) {
      const recovered = repairTruncatedDqJson(candidate);
      if (recovered) return recovered;
    }
  }
  return null;
}

export function generateDqAnalysisSummary(dq: DqAnalysisResult): string {
  const s = dq.analysis_summary;
  const lines: string[] = [];
  lines.push(`✅ Data Quality Rules Generated`);
  lines.push(`Analyzed ${s.total_fields_analyzed} fields — ${s.total_rules_generated} rules generated across 7 DQ dimensions.`);
  lines.push(`Technical: ${s.technical_rules_count} | Logical: ${s.logical_rules_count} | Business: ${s.business_rules_count} | Cross-field: ${s.cross_field_rules_count}`);
  lines.push(`Critical rules: ${s.fields_with_critical_rules} | Business warnings: ${s.warnings_count}`);
  lines.push(`Results saved to result.xlsx — Sheets: dq_rules_by_field, cross_field_rules, business_warnings`);
  return lines.join("\n");
}

function appendDqSheets(wb: XLSX.WorkBook, dq: DqAnalysisResult): void {
  const fieldHeaders = [
    "Field Name", "Inferred Data Type", "Business Context",
    "Rule ID", "Rule Name", "Rule Layer", "DQ Dimension", "Rule Type",
    "Rule Description", "Rule Expression", "Severity",
    "Expected Behavior", "Failure Example", "Pass Example", "Remediation"
  ];
  const fieldData: string[][] = [fieldHeaders];

  for (const group of dq.field_rules) {
    for (const rule of group.rules) {
      fieldData.push([
        group.field_name,
        group.inferred_data_type || "",
        group.business_context || "",
        rule.rule_id || "",
        rule.rule_name || "",
        rule.rule_layer || "",
        rule.dq_dimension || "",
        rule.rule_type || "",
        rule.rule_description || "",
        rule.rule_expression || "",
        rule.severity || "",
        rule.expected_behavior || "",
        rule.failure_example || "",
        rule.pass_example || "",
        rule.remediation || "",
      ]);
    }
  }

  if (fieldData.length > 1) {
    const ws = XLSX.utils.aoa_to_sheet(fieldData);
    autoWidthSheet(ws, fieldData);
    ws["!freeze"] = { xSplit: 0, ySplit: 1, topLeftCell: "A2", activePane: "bottomLeft", state: "frozen" };
    XLSX.utils.book_append_sheet(wb, ws, "dq_rules_by_field");
  }

  const cfHeaders = [
    "Rule ID", "Rule Name", "Involved Fields",
    "Rule Description", "Rule Expression", "Business Rationale",
    "Severity", "Failure Example", "Remediation"
  ];
  const cfData: string[][] = [cfHeaders];

  for (const rule of dq.cross_field_rules || []) {
    cfData.push([
      rule.rule_id || "",
      rule.rule_name || "",
      Array.isArray(rule.involved_fields) ? rule.involved_fields.join(", ") : "",
      rule.rule_description || "",
      rule.rule_expression || "",
      rule.business_rationale || "",
      rule.severity || "",
      rule.failure_example || "",
      rule.remediation || "",
    ]);
  }

  if (cfData.length > 1) {
    const ws = XLSX.utils.aoa_to_sheet(cfData);
    autoWidthSheet(ws, cfData);
    ws["!freeze"] = { xSplit: 0, ySplit: 1, topLeftCell: "A2", activePane: "bottomLeft", state: "frozen" };
    XLSX.utils.book_append_sheet(wb, ws, "cross_field_rules");
  }

  const bwHeaders = [
    "Warning ID", "Field Name", "Warning Type",
    "Description", "Recommendation"
  ];
  const bwData: string[][] = [bwHeaders];

  for (const warning of dq.business_logic_warnings || []) {
    bwData.push([
      warning.warning_id || "",
      warning.field_name || "",
      warning.warning_type || "",
      warning.description || "",
      warning.recommendation || "",
    ]);
  }

  if (bwData.length > 1) {
    const ws = XLSX.utils.aoa_to_sheet(bwData);
    autoWidthSheet(ws, bwData);
    ws["!freeze"] = { xSplit: 0, ySplit: 1, topLeftCell: "A2", activePane: "bottomLeft", state: "frozen" };
    XLSX.utils.book_append_sheet(wb, ws, "business_warnings");
  }
}

export function detectInformaticaJSON(content: string): InformaticaOutput | null {
  const allBlocks = content.matchAll(/```(?:json)?\s*([\s\S]*?)```/g);
  for (const match of allBlocks) {
    const candidate = match[1].trim();
    if (!candidate) continue;
    try {
      const parsed = JSON.parse(candidate);
      if (
        parsed &&
        typeof parsed === "object" &&
        parsed.informatica_sql &&
        parsed.descriptions &&
        parsed.data_classification &&
        parsed.format_types
      ) {
        return parsed as InformaticaOutput;
      }
    } catch {}
  }
  return null;
}

export function generateInformaticaSummary(output: InformaticaOutput): string {
  const fieldCount = Object.keys(output.descriptions).length;
  const lines: string[] = [];
  lines.push(`✅ Informatica Output Generated`);
  lines.push(`Processed ${fieldCount} fields — descriptions, DQ rules, SQL expressions, classification, and format types.`);
  lines.push(`Results saved to result.xlsx — Sheet: informatica_output`);
  return lines.join("\n");
}

function appendInformaticaSheet(wb: XLSX.WorkBook, output: InformaticaOutput): void {
  const headers = [
    "Field Name", "Description", "Format Type",
    "Classification Level", "Rationale", "Handling Rules",
    "DQ Rules", "Informatica SQL"
  ];
  const fields = Object.keys(output.descriptions);
  const rows: string[][] = [headers];
  for (const field of fields) {
    const cls = output.data_classification[field] || {};
    const sql = Array.isArray(output.informatica_sql[field]) ? output.informatica_sql[field].join("\n") : (output.informatica_sql[field] || "");
    rows.push([
      field,
      output.descriptions[field] || "",
      output.format_types[field] || "",
      (cls as InformaticaClassification).classification_level || "",
      (cls as InformaticaClassification).rationale || "",
      (cls as InformaticaClassification).handling_rules || "",
      output.data_quality_rules[field] || "",
      sql,
    ]);
  }
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const colWidths = headers.map((h, i) => {
    let max = h.length;
    for (const row of rows.slice(1)) {
      const cell = row[i] || "";
      const len = cell.split("\n").reduce((a, l) => Math.max(a, l.length), 0);
      if (len > max) max = len;
    }
    return { wch: Math.min(Math.max(max + 2, 14), 60) };
  });
  ws["!cols"] = colWidths;
  ws["!freeze"] = { xSplit: 0, ySplit: 1, topLeftCell: "A2", activePane: "bottomLeft", state: "frozen" };
  XLSX.utils.book_append_sheet(wb, ws, "informatica_output");
}

export function generateResultExcel(rows: ResultRow[], includedAnalyses: AnalysisType[], dataModel?: DataModelJSON, piiScan?: PiiScanResult, dqAnalysis?: DqAnalysisResult, informaticaOutput?: InformaticaOutput): void {
  const orderedAnalyses = ANALYSIS_ORDER.filter((a) => includedAnalyses.includes(a));

  const wb = XLSX.utils.book_new();

  for (const analysis of orderedAnalyses) {
    if (analysis === "data_quality" && dqAnalysis) continue;

    const config = ANALYSIS_COLUMNS[analysis];
    const headers = ["Field Name", ...config.headers];
    const keys = ["field_name", ...config.keys];

    const relevantRows = rows.filter((row) => {
      return config.keys.some((k) => row[k] && row[k]!.trim() !== "");
    });

    if (relevantRows.length === 0) continue;

    let outputRows: ResultRow[];
    if (analysis === "data_quality") {
      outputRows = relevantRows;
    } else {
      const seen = new Map<string, ResultRow>();
      for (const row of relevantRows) {
        const key = row.field_name.toLowerCase();
        if (!seen.has(key)) {
          seen.set(key, row);
        } else {
          const existing = seen.get(key)!;
          for (const k of config.keys) {
            if (row[k] && row[k]!.trim() !== "" && (!existing[k] || existing[k]!.trim() === "")) {
              existing[k] = row[k];
            }
          }
        }
      }
      outputRows = Array.from(seen.values());
    }

    const wsData = [headers];
    for (const row of outputRows) {
      wsData.push(keys.map((k) => row[k] || ""));
    }

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const colWidths = headers.map((h, i) => {
      let max = h.length;
      for (const row of wsData.slice(1)) {
        if (row[i] && row[i].length > max) max = row[i].length;
      }
      return { wch: Math.min(Math.max(max + 2, 12), 60) };
    });
    ws["!cols"] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, ANALYSIS_SHEET_NAMES[analysis]);
  }

  if (wb.SheetNames.length === 0 && (!dataModel) && (!piiScan) && (!dqAnalysis) && (!informaticaOutput)) {
    const headers = ["Field Name"];
    const keys = ["field_name"];
    for (const analysis of orderedAnalyses) {
      const config = ANALYSIS_COLUMNS[analysis];
      headers.push(...config.headers);
      keys.push(...config.keys);
    }
    const wsData = [headers, ...rows.map((row) => keys.map((k) => row[k] || ""))];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "Analysis Results");
  }

  if (dqAnalysis) {
    appendDqSheets(wb, dqAnalysis);
  }

  if (dataModel) {
    appendDataModelSheets(wb, dataModel);
  }

  if (piiScan) {
    appendPiiScanSheet(wb, piiScan);
  }

  if (informaticaOutput) {
    appendInformaticaSheet(wb, informaticaOutput);
  }

  XLSX.writeFile(wb, "result.xlsx");
}

function autoWidthSheet(ws: XLSX.WorkSheet, data: string[][]): void {
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

function generateTableDDL(tableName: string, fields: { field_name: string; data_type: string; role: string; aggregation?: string }[], relationships: DataModelJSON["relationships"]): string {
  const lines: string[] = [];
  lines.push(`CREATE TABLE ${tableName} (`);
  const fieldLines: string[] = [];
  const pks = fields.filter(f => f.role === "pk");

  for (const field of fields) {
    let sqlType = field.data_type.toUpperCase();
    if (!sqlType.includes("(") && sqlType === "VARCHAR") sqlType = "VARCHAR(255)";
    let comment = "";
    if (field.role === "pk") comment = "-- Primary Key";
    else if (field.role === "fk") comment = "-- Foreign Key";
    else if (field.role === "measure" && field.aggregation) comment = `-- Measure (${field.aggregation})`;
    const notNull = field.role === "pk" ? " NOT NULL" : "";
    fieldLines.push(`  ${field.field_name.padEnd(25)} ${(sqlType + notNull).padEnd(20)}${comment ? "  " + comment : ""}`);
  }

  if (pks.length > 0) {
    fieldLines.push(`  CONSTRAINT pk_${tableName} PRIMARY KEY (${pks.map(f => f.field_name).join(", ")})`);
  }

  const rels = relationships.filter(r => r.from_table === tableName);
  for (const rel of rels) {
    fieldLines.push(`  CONSTRAINT fk_${tableName}_${rel.from_field} FOREIGN KEY (${rel.from_field}) REFERENCES ${rel.to_table}(${rel.to_field})`);
  }

  lines.push(fieldLines.join(",\n"));
  lines.push(");");
  return lines.join("\n");
}

function appendDataModelSheets(wb: XLSX.WorkBook, model: DataModelJSON): void {
  const fieldsHeaders = ["Table Name", "Field Name", "Table Type", "Role", "Data Type", "Aggregation", "Is PK", "Is FK"];
  const fieldsData: string[][] = [fieldsHeaders];

  for (const ft of model.fact_tables) {
    for (const field of ft.fields) {
      fieldsData.push([
        ft.table_name,
        field.field_name,
        "fact",
        field.role,
        field.data_type,
        field.aggregation || "",
        field.role === "pk" ? "Yes" : "No",
        field.role === "fk" ? "Yes" : "No",
      ]);
    }
  }
  for (const dt of model.dimension_tables) {
    for (const field of dt.fields) {
      fieldsData.push([
        dt.table_name,
        field.field_name,
        "dimension",
        field.role,
        field.data_type,
        "",
        field.role === "pk" ? "Yes" : "No",
        "No",
      ]);
    }
  }

  const fieldsWs = XLSX.utils.aoa_to_sheet(fieldsData);
  autoWidthSheet(fieldsWs, fieldsData);
  XLSX.utils.book_append_sheet(wb, fieldsWs, "data_model_fields");

  const relHeaders = ["From Table", "From Field", "To Table", "To Field", "Relationship Type"];
  const relData: string[][] = [relHeaders];
  for (const rel of model.relationships) {
    relData.push([rel.from_table, rel.from_field, rel.to_table, rel.to_field, rel.type]);
  }

  const relWs = XLSX.utils.aoa_to_sheet(relData);
  autoWidthSheet(relWs, relData);
  XLSX.utils.book_append_sheet(wb, relWs, "data_model_relationships");

  const ddlHeaders = ["Table Name", "DDL Script"];
  const ddlData: string[][] = [ddlHeaders];

  for (const dt of model.dimension_tables) {
    ddlData.push([dt.table_name, generateTableDDL(dt.table_name, dt.fields, model.relationships)]);
  }
  for (const ft of model.fact_tables) {
    ddlData.push([ft.table_name, generateTableDDL(ft.table_name, ft.fields, model.relationships)]);
  }

  const ddlWs = XLSX.utils.aoa_to_sheet(ddlData);
  autoWidthSheet(ddlWs, ddlData);
  XLSX.utils.book_append_sheet(wb, ddlWs, "data_model_ddl");
}

export function generateAnalysisSummary(
  analysisResults: AnalysisResult[],
  totalFieldCount: number
): string {
  const lines: string[] = [];

  for (const result of analysisResults) {
    const fieldCount = Object.keys(result.fieldData).length || (result.dqMultiRows?.length ?? 0);
    const sheetName = ANALYSIS_SHEET_NAMES[result.analysisType];

    if (result.analysisType === "business_definitions") {
      lines.push(`✅ Business definitions generated for ${fieldCount} fields. Results saved to result.xlsx — Sheet: ${sheetName}`);
    } else if (result.analysisType === "data_classification") {
      const levels: Record<string, number> = {};
      for (const columns of Object.values(result.fieldData)) {
        const level = columns.classification_level || "Unknown";
        levels[level] = (levels[level] || 0) + 1;
      }
      const breakdown = Object.entries(levels)
        .map(([level, count]) => `${count} ${level}`)
        .join(", ");
      lines.push(`✅ Data classification completed for ${fieldCount} fields. ${breakdown}. Sheet: ${sheetName} added to result.xlsx`);
    } else if (result.analysisType === "data_quality") {
      const ruleCount = result.dqMultiRows?.length || fieldCount;
      lines.push(`✅ Data quality rules defined — ${ruleCount} rules across ${fieldCount} fields. Sheet: ${sheetName} added to result.xlsx`);
    }
  }

  if (lines.length === 0) {
    return `✅ Analysis completed for ${totalFieldCount} fields. Results saved to result.xlsx`;
  }

  return lines.join("\n\n");
}

export function getIncludedAnalysisLabels(types: AnalysisType[]): string {
  const ordered = ANALYSIS_ORDER.filter((a) => types.includes(a));
  return ordered.map((t) => ANALYSIS_LABELS[t]).join(" + ");
}

export function getAnalysisLabel(type: AnalysisType): string {
  return ANALYSIS_LABELS[type];
}
