import * as XLSX from "xlsx";
import { extractTablesFromMarkdown, type ParsedTable } from "./table-utils";

export type AnalysisType = "business_definitions" | "data_classification" | "data_quality" | "nudge_sludge";

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
  nudge_sludge_type?: string;
  use_case?: string;
  required_data_elements?: string;
  implementation_notes?: string;
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
  nudge_sludge: {
    keys: ["nudge_sludge_type", "use_case", "required_data_elements", "implementation_notes"],
    headers: ["Nudge/Sludge Type", "Use Case", "Required Data Elements", "Implementation Notes"],
  },
};

const ANALYSIS_LABELS: Record<AnalysisType, string> = {
  business_definitions: "Business Definitions",
  data_classification: "Data Classification",
  data_quality: "Data Quality Rules",
  nudge_sludge: "Nudge & Sludge",
};

const ANALYSIS_ORDER: AnalysisType[] = ["business_definitions", "data_classification", "data_quality", "nudge_sludge"];

const HEADER_PATTERNS: Record<AnalysisType, string[]> = {
  business_definitions: ["business term", "business definition", "business def"],
  data_classification: ["classification level", "classification", "sensitivity"],
  data_quality: ["dq dimension", "dq rule", "quality dimension", "quality rule", "data quality"],
  nudge_sludge: ["nudge", "sludge", "nudge/sludge", "behavioural", "behavioral"],
};

function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
}

function findFieldNameColumn(headers: string[]): number {
  const patterns = ["field_name", "field", "column_name", "column", "data_element", "attribute", "name"];
  for (const pattern of patterns) {
    const idx = headers.findIndex((h) => normalizeHeader(h) === pattern);
    if (idx !== -1) return idx;
  }
  const partialPatterns = ["field", "name", "column", "element"];
  for (const pattern of partialPatterns) {
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
  nudge_sludge: {
    nudge_sludge_type: ["nudge_sludge_type", "type", "nudge_sludge", "intervention_type"],
    use_case: ["use_case", "usecase", "case"],
    required_data_elements: ["required_data_elements", "data_elements", "required_elements", "required_data"],
    implementation_notes: ["implementation_notes", "notes", "implementation", "details"],
  },
};

function mapHeaderToKey(header: string, analysisType: AnalysisType): string | null {
  const norm = normalizeHeader(header);
  const typeMap = HEADER_MAPPINGS[analysisType];
  for (const [key, patterns] of Object.entries(typeMap)) {
    if (patterns.some((p) => norm === p || norm.includes(p))) {
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
  const results: AnalysisResult[] = [];
  const processedTypes = new Set<AnalysisType>();

  for (const table of tables) {
    const analysisType = detectTableAnalysisType(table);
    if (!analysisType) continue;
    if (processedTypes.has(analysisType)) continue;
    processedTypes.add(analysisType);

    if (analysisType === "data_quality") {
      const dqMultiRows = extractDqMultiRows(table);
      const fieldData = extractFieldDataFromTable(table, analysisType);
      results.push({ analysisType, fieldData, dqMultiRows });
    } else {
      const fieldData = extractFieldDataFromTable(table, analysisType);
      if (Object.keys(fieldData).length > 0) {
        results.push({ analysisType, fieldData });
      }
    }
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

export function generateResultExcel(rows: ResultRow[], includedAnalyses: AnalysisType[]): void {
  const orderedAnalyses = ANALYSIS_ORDER.filter((a) => includedAnalyses.includes(a));

  const hasDq = orderedAnalyses.includes("data_quality");
  const hasDqMultiRows = hasDq && rows.some(
    (r, i, arr) => arr.findIndex((x) => x.field_name.toLowerCase() === r.field_name.toLowerCase()) !== i
  );

  const headers = ["Field Name"];
  const keys = ["field_name"];

  for (const analysis of orderedAnalyses) {
    const config = ANALYSIS_COLUMNS[analysis];
    headers.push(...config.headers);
    keys.push(...config.keys);
  }

  const wsData = [headers];
  for (const row of rows) {
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

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Analysis Results");
  XLSX.writeFile(wb, "result.xlsx");
}

export function getIncludedAnalysisLabels(types: AnalysisType[]): string {
  const ordered = ANALYSIS_ORDER.filter((a) => types.includes(a));
  return ordered.map((t) => ANALYSIS_LABELS[t]).join(" + ");
}

export function getAnalysisLabel(type: AnalysisType): string {
  return ANALYSIS_LABELS[type];
}
