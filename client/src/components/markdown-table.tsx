import { useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { downloadTableAsExcel, type ParsedTable } from "@/lib/table-utils";

export function DownloadableTable({ children }: { children: React.ReactNode }) {
  const tableRef = useRef<HTMLTableElement>(null);

  const handleDownload = useCallback(() => {
    if (!tableRef.current) return;

    const headers: string[] = [];
    const rows: string[][] = [];

    const thElements = tableRef.current.querySelectorAll("thead th");
    thElements.forEach((th) => {
      headers.push((th.textContent || "").trim());
    });

    const trElements = tableRef.current.querySelectorAll("tbody tr");
    trElements.forEach((tr) => {
      const cells: string[] = [];
      tr.querySelectorAll("td").forEach((td) => {
        cells.push((td.textContent || "").trim());
      });
      if (cells.length > 0) rows.push(cells);
    });

    if (headers.length === 0 && rows.length > 0) {
      const firstRow = rows.shift();
      if (firstRow) {
        headers.push(...firstRow);
      }
    }

    if (headers.length > 0) {
      const table: ParsedTable = { headers, rows };
      const timestamp = new Date().toISOString().slice(0, 10);
      downloadTableAsExcel(table, `data-export-${timestamp}`);
    }
  }, []);

  return (
    <div className="not-prose my-3 rounded-md border border-border bg-background" data-testid="downloadable-table">
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border bg-muted/50">
        <span className="text-xs text-muted-foreground font-medium">Table Output</span>
        <Button
          size="sm"
          variant="secondary"
          onClick={handleDownload}
          className="gap-1.5 text-xs h-7"
          data-testid="button-download-table"
        >
          <Download className="w-3 h-3" />
          Download Excel
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table ref={tableRef} className="w-full text-xs border-collapse">
          {children}
        </table>
      </div>
    </div>
  );
}

export function TableHead({ children }: { children: React.ReactNode }) {
  return <thead className="bg-muted/70">{children}</thead>;
}

export function TableBody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-border">{children}</tbody>;
}

export function TableRow({ children }: { children: React.ReactNode }) {
  return <tr className="transition-colors">{children}</tr>;
}

export function TableHeader({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-3 py-2 text-left font-semibold text-foreground whitespace-nowrap border-b border-border">
      {children}
    </th>
  );
}

export function TableCell({ children }: { children: React.ReactNode }) {
  return (
    <td className="px-3 py-2 text-foreground">
      {children}
    </td>
  );
}
