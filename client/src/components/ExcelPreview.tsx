import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { X, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ExcelPreviewProps {
  file: File;
  onClose: () => void;
}

interface SheetData {
  name: string;
  headers: string[];
  rows: string[][];
  totalRows: number;
}

const MAX_ROWS = 200;

export default function ExcelPreview({ file, onClose }: ExcelPreviewProps) {
  const [sheets, setSheets] = useState<SheetData[]>([]);
  const [activeSheet, setActiveSheet] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const read = async () => {
      setLoading(true);
      setError(null);
      try {
        const arrayBuffer = await file.arrayBuffer();
        const wb = XLSX.read(arrayBuffer, { type: "array" });
        const parsed: SheetData[] = wb.SheetNames.map((name) => {
          const ws = wb.Sheets[name];
          const raw: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as string[][];
          const headers = raw[0]?.map(String) || [];
          const dataRows = raw.slice(1).map(row => row.map(String));
          return {
            name,
            headers,
            rows: dataRows.slice(0, MAX_ROWS),
            totalRows: dataRows.length,
          };
        });
        if (!cancelled) {
          setSheets(parsed);
          setActiveSheet(0);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError("Could not read this file. Supported: .xlsx, .xls, .csv");
          setLoading(false);
        }
      }
    };
    read();
    return () => { cancelled = true; };
  }, [file]);

  const sheet = sheets[activeSheet];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose} data-testid="excel-preview-overlay">
      <div
        className="bg-white rounded-xl shadow-2xl flex flex-col w-[92vw] max-w-5xl h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        data-testid="excel-preview-modal"
      >
        <div className="flex items-center gap-3 px-5 py-3 border-b" style={{ borderColor: "#E5E7EB", backgroundColor: "#0D2E5C" }}>
          <FileSpreadsheet className="w-5 h-5 text-teal-300 flex-shrink-0" />
          <span className="text-white font-semibold text-sm truncate flex-1">{file.name}</span>
          <Button
            size="icon"
            variant="ghost"
            onClick={onClose}
            className="h-7 w-7 text-white/60 hover:text-white hover:bg-white/10"
            data-testid="button-close-preview"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {sheets.length > 1 && (
          <div className="flex gap-1 px-4 pt-3 pb-0 border-b" style={{ borderColor: "#E5E7EB" }}>
            {sheets.map((s, i) => (
              <button
                key={s.name}
                onClick={() => setActiveSheet(i)}
                className="px-3 py-1.5 text-xs font-medium rounded-t-md transition-colors"
                style={{
                  backgroundColor: activeSheet === i ? "#0D2E5C" : "#F3F4F6",
                  color: activeSheet === i ? "white" : "#374151",
                }}
                data-testid={`tab-sheet-${i}`}
              >
                {s.name}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-full text-sm text-gray-500">Loading preview...</div>
          ) : error ? (
            <div className="flex items-center justify-center h-full text-sm text-red-500">{error}</div>
          ) : !sheet || sheet.headers.length === 0 ? (
            <div className="flex items-center justify-center h-full text-sm text-gray-500">No data found in this sheet.</div>
          ) : (
            <div className="h-full w-full overflow-auto">
              <table className="text-xs border-collapse min-w-max">
                <thead>
                  <tr style={{ backgroundColor: "#0D2E5C" }}>
                    <th className="sticky top-0 left-0 z-20 px-2 py-2 text-center font-semibold text-white/60 w-10" style={{ backgroundColor: "#0D2E5C" }}>#</th>
                    {sheet.headers.map((h, i) => (
                      <th key={i} className="sticky top-0 z-10 px-3 py-2 text-left font-semibold text-white whitespace-nowrap" style={{ backgroundColor: "#0D2E5C" }}>{h || `Col ${i + 1}`}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sheet.rows.map((row, ri) => (
                    <tr key={ri} style={{ backgroundColor: ri % 2 === 0 ? "#FFFFFF" : "#F9FAFB" }}>
                      <td className="sticky left-0 z-10 px-2 py-1.5 text-center text-gray-400 font-mono" style={{ backgroundColor: ri % 2 === 0 ? "#FFFFFF" : "#F9FAFB" }}>{ri + 1}</td>
                      {sheet.headers.map((_, ci) => (
                        <td key={ci} className="px-3 py-1.5 text-gray-700 whitespace-nowrap border-b" style={{ borderColor: "#F3F4F6" }}>
                          {row[ci] ?? ""}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {sheet && (
          <div className="px-5 py-2 border-t text-xs text-gray-400 flex justify-between" style={{ borderColor: "#E5E7EB" }}>
            <span>{sheet.headers.length} columns</span>
            <span>
              {sheet.totalRows > MAX_ROWS
                ? `Showing first ${MAX_ROWS} of ${sheet.totalRows.toLocaleString()} rows`
                : `${sheet.totalRows} rows`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
