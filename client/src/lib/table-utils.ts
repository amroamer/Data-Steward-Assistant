import * as XLSX from "xlsx";

export interface ParsedTable {
  headers: string[];
  rows: string[][];
}

function normalizePipeRow(line: string): string {
  let l = line.trim();
  if (!l.startsWith("|")) l = "| " + l;
  if (!l.endsWith("|")) l = l + " |";
  return l;
}

function isPipeRow(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.includes("|") && trimmed.split("|").filter((s) => s.trim()).length >= 1;
}

function parsePipeRow(line: string): string[] {
  const normalized = normalizePipeRow(line);
  return normalized
    .slice(1, -1)
    .split("|")
    .map((cell) => cell.trim().replace(/\*\*/g, ""));
}

function isSeparatorRow(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.includes("|")) return false;
  const normalized = normalizePipeRow(trimmed);
  const cells = normalized.slice(1, -1).split("|");
  return cells.length >= 1 && cells.every((cell) => /^[\s:]*-{2,}[\s:]*$/.test(cell.trim()));
}

export function extractTablesFromMarkdown(markdown: string): ParsedTable[] {
  const tables: ParsedTable[] = [];
  const lines = markdown.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();
    if (isPipeRow(line)) {
      const nextNonEmpty = findNextNonEmptyLine(lines, i + 1);
      if (nextNonEmpty !== -1 && isSeparatorRow(lines[nextNonEmpty])) {
        const headerCells = parsePipeRow(line);
        const rows: string[][] = [];
        i = nextNonEmpty + 1;
        while (i < lines.length) {
          const rowLine = lines[i].trim();
          if (rowLine === "") {
            i++;
            continue;
          }
          if (isPipeRow(rowLine) && !isSeparatorRow(rowLine)) {
            rows.push(parsePipeRow(rowLine));
            i++;
          } else {
            break;
          }
        }
        if (headerCells.length > 0) {
          tables.push({ headers: headerCells, rows });
        }
        continue;
      }
    }
    i++;
  }

  return tables;
}

function findNextNonEmptyLine(lines: string[], start: number): number {
  for (let i = start; i < Math.min(start + 2, lines.length); i++) {
    if (lines[i].trim() !== "") return i;
  }
  return -1;
}

export function downloadTableAsExcel(table: ParsedTable, filename: string = "table-export") {
  const wsData = [table.headers, ...table.rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  const colWidths = table.headers.map((h, i) => {
    let max = h.length;
    for (const row of table.rows) {
      if (row[i] && row[i].length > max) max = row[i].length;
    }
    return { wch: Math.min(Math.max(max + 2, 10), 50) };
  });
  ws["!cols"] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function downloadAllTablesAsExcel(tables: ParsedTable[], filename: string = "all-tables-export") {
  const wb = XLSX.utils.book_new();

  tables.forEach((table, index) => {
    const wsData = [table.headers, ...table.rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    const colWidths = table.headers.map((h, i) => {
      let max = h.length;
      for (const row of table.rows) {
        if (row[i] && row[i].length > max) max = row[i].length;
      }
      return { wch: Math.min(Math.max(max + 2, 10), 50) };
    });
    ws["!cols"] = colWidths;

    const sheetName = `Table ${index + 1}`;
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });

  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function hasMarkdownTables(content: string): boolean {
  const lines = content.split("\n");
  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i].trim();
    if (isPipeRow(line)) {
      const nextNonEmpty = findNextNonEmptyLine(lines, i + 1);
      if (nextNonEmpty !== -1 && isSeparatorRow(lines[nextNonEmpty])) {
        return true;
      }
    }
  }
  return false;
}
