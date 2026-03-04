import { useState, useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from "react";
import { Button } from "@/components/ui/button";
import { Download, FileCode, Key, Link2, BarChart3, Circle } from "lucide-react";
import { toPng } from "html-to-image";

export interface DataModelField {
  field_name: string;
  data_type: string;
  role: "pk" | "fk" | "measure" | "attribute";
  aggregation?: string;
}

export interface FactTable {
  table_name: string;
  grain?: string;
  fields: DataModelField[];
}

export interface DimensionTable {
  table_name: string;
  fields: DataModelField[];
}

export interface DataModelRelationship {
  from_table: string;
  from_field: string;
  to_table: string;
  to_field: string;
  type: string;
}

export interface DataModelJSON {
  model_name: string;
  grain_statement?: string;
  fact_tables: FactTable[];
  dimension_tables: DimensionTable[];
  relationships: DataModelRelationship[];
}

interface TablePosition {
  x: number;
  y: number;
}

const FACT_COLOR = "#00338D";
const DIM_COLOR = "#005EB8";
const TABLE_WIDTH = 220;
const HEADER_HEIGHT = 36;
const FIELD_HEIGHT = 24;
const TABLE_PADDING = 8;

function getRoleIcon(role: string) {
  switch (role) {
    case "pk":
      return <Key className="w-3 h-3 text-yellow-300 flex-shrink-0" />;
    case "fk":
      return <Link2 className="w-3 h-3 text-cyan-300 flex-shrink-0" />;
    case "measure":
      return <BarChart3 className="w-3 h-3 text-green-300 flex-shrink-0" />;
    default:
      return <Circle className="w-2.5 h-2.5 text-white/50 flex-shrink-0" />;
  }
}

function getRoleLabel(role: string) {
  switch (role) {
    case "pk": return "PK";
    case "fk": return "FK";
    case "measure": return "Measure";
    default: return "Attr";
  }
}

function getTableHeight(fieldCount: number) {
  return HEADER_HEIGHT + fieldCount * FIELD_HEIGHT + TABLE_PADDING * 2;
}

function computeInitialPositions(
  factTables: FactTable[],
  dimensionTables: DimensionTable[]
): Record<string, TablePosition> {
  const positions: Record<string, TablePosition> = {};
  const centerX = 400;
  const centerY = 300;
  const factSpacing = 280;

  factTables.forEach((ft, i) => {
    const offsetX = factTables.length === 1 ? 0 : (i - (factTables.length - 1) / 2) * factSpacing;
    positions[ft.table_name] = { x: centerX + offsetX - TABLE_WIDTH / 2, y: centerY - getTableHeight(ft.fields.length) / 2 };
  });

  const dimCount = dimensionTables.length;
  if (dimCount > 0) {
    const radius = 280;
    dimensionTables.forEach((dt, i) => {
      const angle = (2 * Math.PI * i) / dimCount - Math.PI / 2;
      positions[dt.table_name] = {
        x: centerX + Math.cos(angle) * radius - TABLE_WIDTH / 2,
        y: centerY + Math.sin(angle) * radius - getTableHeight(dt.fields.length) / 2,
      };
    });
  }

  return positions;
}

function generateDDL(model: DataModelJSON): string {
  const lines: string[] = [];
  lines.push(`-- DDL Script for ${model.model_name}`);
  if (model.grain_statement) {
    lines.push(`-- Grain: ${model.grain_statement}`);
  }
  lines.push(`-- Generated on ${new Date().toISOString().split("T")[0]}`);
  lines.push("");

  const allTables = [
    ...model.dimension_tables.map((t) => ({ ...t, tableType: "dimension" as const })),
    ...model.fact_tables.map((t) => ({ ...t, tableType: "fact" as const })),
  ];

  for (const table of allTables) {
    const pks = table.fields.filter((f) => f.role === "pk");
    const fks = table.fields.filter((f) => f.role === "fk");

    lines.push(`CREATE TABLE ${table.table_name} (`);

    const fieldLines: string[] = [];
    for (const field of table.fields) {
      let sqlType = mapDataType(field.data_type);
      let comment = "";
      if (field.role === "pk") comment = "-- Primary Key";
      else if (field.role === "fk") comment = "-- Foreign Key";
      else if (field.role === "measure" && field.aggregation) comment = `-- Measure (${field.aggregation})`;

      const notNull = field.role === "pk" ? " NOT NULL" : "";
      fieldLines.push(`  ${padRight(field.field_name, 25)} ${padRight(sqlType + notNull, 20)}${comment ? "  " + comment : ""}`);
    }

    if (pks.length > 0) {
      fieldLines.push(`  CONSTRAINT pk_${table.table_name} PRIMARY KEY (${pks.map((f) => f.field_name).join(", ")})`);
    }

    const rels = model.relationships.filter((r) => r.from_table === table.table_name);
    for (const rel of rels) {
      fieldLines.push(
        `  CONSTRAINT fk_${table.table_name}_${rel.from_field} FOREIGN KEY (${rel.from_field}) REFERENCES ${rel.to_table}(${rel.to_field})`
      );
    }

    lines.push(fieldLines.join(",\n"));
    lines.push(");");
    lines.push("");
  }

  return lines.join("\n");
}

function mapDataType(dt: string): string {
  const lower = dt.toLowerCase();
  if (lower.includes("int")) return "INTEGER";
  if (lower.includes("decimal") || lower.includes("numeric") || lower.includes("float") || lower.includes("double") || lower.includes("number")) return "DECIMAL(18,2)";
  if (lower.includes("date") && !lower.includes("time")) return "DATE";
  if (lower.includes("datetime") || lower.includes("timestamp")) return "TIMESTAMP";
  if (lower.includes("bool")) return "BOOLEAN";
  if (lower.includes("text") || lower.includes("clob")) return "TEXT";
  if (lower.includes("varchar")) return dt.toUpperCase();
  return "VARCHAR(255)";
}

function padRight(str: string, len: number): string {
  return str.length >= len ? str : str + " ".repeat(len - str.length);
}

export interface DataModelDiagramHandle {
  captureAsPng: () => Promise<void>;
}

interface DataModelDiagramProps {
  model: DataModelJSON;
  onDownloadExcel?: () => void;
}

const DataModelDiagram = forwardRef<DataModelDiagramHandle, DataModelDiagramProps>(
  function DataModelDiagram({ model, onDownloadExcel }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [positions, setPositions] = useState<Record<string, TablePosition>>(() =>
      computeInitialPositions(model.fact_tables, model.dimension_tables)
    );
    const [dragging, setDragging] = useState<string | null>(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [svgSize, setSvgSize] = useState({ width: 900, height: 700 });

    useEffect(() => {
      const allPositions = Object.values(positions);
      if (allPositions.length === 0) return;

      let maxX = 0;
      let maxY = 0;
      for (const [tableName, pos] of Object.entries(positions)) {
        const table = [...model.fact_tables, ...model.dimension_tables].find((t) => t.table_name === tableName);
        const height = table ? getTableHeight(table.fields.length) : 100;
        maxX = Math.max(maxX, pos.x + TABLE_WIDTH + 40);
        maxY = Math.max(maxY, pos.y + height + 40);
      }

      setSvgSize({
        width: Math.max(900, maxX),
        height: Math.max(700, maxY),
      });
    }, [positions, model]);

    const handleMouseDown = useCallback(
      (tableName: string, e: React.MouseEvent) => {
        e.preventDefault();
        const pos = positions[tableName];
        if (!pos) return;
        setDragging(tableName);
        setDragOffset({ x: e.clientX - pos.x, y: e.clientY - pos.y });
      },
      [positions]
    );

    const handleMouseMove = useCallback(
      (e: React.MouseEvent) => {
        if (!dragging) return;
        setPositions((prev) => ({
          ...prev,
          [dragging]: {
            x: e.clientX - dragOffset.x,
            y: e.clientY - dragOffset.y,
          },
        }));
      },
      [dragging, dragOffset]
    );

    const handleMouseUp = useCallback(() => {
      setDragging(null);
    }, []);

    const captureAsPng = useCallback(async () => {
      if (!containerRef.current) return;
      try {
        const dataUrl = await toPng(containerRef.current, {
          backgroundColor: "#ffffff",
          pixelRatio: 2,
        });
        const link = document.createElement("a");
        link.download = "data_model_diagram.png";
        link.href = dataUrl;
        link.click();
      } catch (err) {
        console.error("Failed to capture diagram as PNG:", err);
      }
    }, []);

    useImperativeHandle(ref, () => ({ captureAsPng }), [captureAsPng]);

    const handleDownloadDDL = useCallback(() => {
      const ddl = generateDDL(model);
      const blob = new Blob([ddl], { type: "text/sql" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = `${model.model_name.replace(/\s+/g, "_").toLowerCase()}_ddl.sql`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    }, [model]);

    const getTableCenter = (tableName: string): { x: number; y: number } => {
      const pos = positions[tableName];
      if (!pos) return { x: 0, y: 0 };
      const table = [...model.fact_tables, ...model.dimension_tables].find((t) => t.table_name === tableName);
      const height = table ? getTableHeight(table.fields.length) : 100;
      return { x: pos.x + TABLE_WIDTH / 2, y: pos.y + height / 2 };
    };

    const renderTable = (
      tableName: string,
      fields: DataModelField[],
      color: string,
      tableType: "fact" | "dimension"
    ) => {
      const pos = positions[tableName];
      if (!pos) return null;
      const height = getTableHeight(fields.length);

      return (
        <g
          key={tableName}
          onMouseDown={(e) => handleMouseDown(tableName, e)}
          style={{ cursor: dragging === tableName ? "grabbing" : "grab" }}
          data-testid={`table-node-${tableName}`}
        >
          <rect
            x={pos.x}
            y={pos.y}
            width={TABLE_WIDTH}
            height={height}
            rx={6}
            ry={6}
            fill={color}
            stroke={color === FACT_COLOR ? "#001F5C" : "#003D7A"}
            strokeWidth={1.5}
            filter="url(#tableShadow)"
          />
          <rect
            x={pos.x}
            y={pos.y}
            width={TABLE_WIDTH}
            height={HEADER_HEIGHT}
            rx={6}
            ry={6}
            fill={color === FACT_COLOR ? "#001F5C" : "#003D7A"}
          />
          <rect
            x={pos.x}
            y={pos.y + HEADER_HEIGHT - 6}
            width={TABLE_WIDTH}
            height={6}
            fill={color === FACT_COLOR ? "#001F5C" : "#003D7A"}
          />
          <text
            x={pos.x + TABLE_WIDTH / 2}
            y={pos.y + HEADER_HEIGHT / 2 + 1}
            textAnchor="middle"
            dominantBaseline="central"
            fill="white"
            fontSize={12}
            fontWeight="bold"
            fontFamily="system-ui, sans-serif"
          >
            {tableName}
          </text>
          <text
            x={pos.x + TABLE_WIDTH - 8}
            y={pos.y + HEADER_HEIGHT / 2 + 1}
            textAnchor="end"
            dominantBaseline="central"
            fill="rgba(255,255,255,0.5)"
            fontSize={9}
            fontFamily="system-ui, sans-serif"
          >
            {tableType === "fact" ? "FACT" : "DIM"}
          </text>
          {fields.map((field, fi) => {
            const fy = pos.y + HEADER_HEIGHT + TABLE_PADDING + fi * FIELD_HEIGHT;
            return (
              <g key={field.field_name}>
                {fi > 0 && (
                  <line
                    x1={pos.x + 8}
                    y1={fy}
                    x2={pos.x + TABLE_WIDTH - 8}
                    y2={fy}
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth={0.5}
                  />
                )}
                <foreignObject
                  x={pos.x + 8}
                  y={fy + 2}
                  width={TABLE_WIDTH - 16}
                  height={FIELD_HEIGHT - 4}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      height: "100%",
                      color: "white",
                      fontSize: "11px",
                      fontFamily: "system-ui, sans-serif",
                    }}
                  >
                    {getRoleIcon(field.role)}
                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {field.field_name}
                    </span>
                    <span style={{ opacity: 0.5, fontSize: "9px", flexShrink: 0 }}>
                      {getRoleLabel(field.role)}
                    </span>
                  </div>
                </foreignObject>
              </g>
            );
          })}
        </g>
      );
    };

    const renderRelationships = () => {
      return model.relationships.map((rel, i) => {
        const from = getTableCenter(rel.from_table);
        const to = getTableCenter(rel.to_table);

        const fromPos = positions[rel.from_table];
        const toPos = positions[rel.to_table];
        if (!fromPos || !toPos) return null;

        const fromTable = [...model.fact_tables, ...model.dimension_tables].find((t) => t.table_name === rel.from_table);
        const toTable = [...model.fact_tables, ...model.dimension_tables].find((t) => t.table_name === rel.to_table);
        const fromH = fromTable ? getTableHeight(fromTable.fields.length) : 100;
        const toH = toTable ? getTableHeight(toTable.fields.length) : 100;

        const { startX, startY, endX, endY } = getEdgePoints(
          fromPos.x, fromPos.y, TABLE_WIDTH, fromH,
          toPos.x, toPos.y, TABLE_WIDTH, toH
        );

        const midX = (startX + endX) / 2;
        const midY = (startY + endY) / 2;

        const angle = Math.atan2(endY - startY, endX - startX);
        const arrowLen = 8;
        const ax1 = endX - arrowLen * Math.cos(angle - 0.4);
        const ay1 = endY - arrowLen * Math.sin(angle - 0.4);
        const ax2 = endX - arrowLen * Math.cos(angle + 0.4);
        const ay2 = endY - arrowLen * Math.sin(angle + 0.4);

        const cardinality = rel.type?.includes("many") ? "N" : "1";
        const fromCard = rel.type?.includes("many-to") ? "N" : "1";
        const toCard = rel.type?.includes("to-one") ? "1" : rel.type?.includes("to-many") ? "N" : "1";

        return (
          <g key={`rel-${i}`} data-testid={`relationship-${rel.from_table}-${rel.to_table}`}>
            <line
              x1={startX}
              y1={startY}
              x2={endX}
              y2={endY}
              stroke="#94A3B8"
              strokeWidth={1.5}
              strokeDasharray="4 2"
            />
            <polygon
              points={`${endX},${endY} ${ax1},${ay1} ${ax2},${ay2}`}
              fill="#94A3B8"
            />
            <rect
              x={midX - 14}
              y={midY - 10}
              width={28}
              height={20}
              rx={4}
              fill="white"
              stroke="#CBD5E1"
              strokeWidth={1}
            />
            <text
              x={midX}
              y={midY + 1}
              textAnchor="middle"
              dominantBaseline="central"
              fill="#475569"
              fontSize={10}
              fontWeight="bold"
              fontFamily="system-ui, sans-serif"
            >
              {`${fromCard}:${toCard}`}
            </text>
          </g>
        );
      });
    };

    return (
      <div className="w-full" data-testid="data-model-diagram">
        <div className="mb-3">
          <h3 className="text-sm font-bold" style={{ color: FACT_COLOR }} data-testid="text-model-name">
            {model.model_name}
          </h3>
          {model.grain_statement && (
            <p className="text-xs text-muted-foreground mt-0.5" data-testid="text-grain-statement">
              {model.grain_statement}
            </p>
          )}
          <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: FACT_COLOR }} />
              Fact Tables ({model.fact_tables.length})
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: DIM_COLOR }} />
              Dimension Tables ({model.dimension_tables.length})
            </span>
            <span className="flex items-center gap-1"><Key className="w-2.5 h-2.5 text-yellow-500" /> PK</span>
            <span className="flex items-center gap-1"><Link2 className="w-2.5 h-2.5 text-cyan-500" /> FK</span>
            <span className="flex items-center gap-1"><BarChart3 className="w-2.5 h-2.5 text-green-500" /> Measure</span>
          </div>
        </div>

        <div
          ref={containerRef}
          className="border border-border rounded-md bg-white dark:bg-slate-900 overflow-auto"
          style={{ maxHeight: "500px" }}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          data-testid="diagram-container"
        >
          <svg
            width={svgSize.width}
            height={svgSize.height}
            style={{ minWidth: svgSize.width, minHeight: svgSize.height }}
          >
            <defs>
              <filter id="tableShadow" x="-5%" y="-5%" width="110%" height="110%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15" />
              </filter>
            </defs>

            {renderRelationships()}

            {model.fact_tables.map((ft) =>
              renderTable(ft.table_name, ft.fields, FACT_COLOR, "fact")
            )}
            {model.dimension_tables.map((dt) =>
              renderTable(dt.table_name, dt.fields, DIM_COLOR, "dimension")
            )}
          </svg>
        </div>

        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <Button
            size="sm"
            onClick={captureAsPng}
            className="gap-1.5 text-[11px] text-white font-medium"
            style={{ backgroundColor: FACT_COLOR }}
            data-testid="button-download-png"
          >
            <Download className="w-3.5 h-3.5" />
            Download Diagram as PNG
          </Button>
          <Button
            size="sm"
            onClick={handleDownloadDDL}
            variant="outline"
            className="gap-1.5 text-[11px] font-medium"
            data-testid="button-download-ddl"
          >
            <FileCode className="w-3.5 h-3.5" />
            Download DDL Script
          </Button>
          {onDownloadExcel && (
            <Button
              size="sm"
              onClick={onDownloadExcel}
              className="gap-1.5 text-[11px] text-white font-medium"
              style={{ backgroundColor: "#00A3A1" }}
              data-testid="button-download-excel-model"
            >
              <Download className="w-3.5 h-3.5" />
              Download result.xlsx
            </Button>
          )}
        </div>
      </div>
    );
  }
);

function getEdgePoints(
  x1: number, y1: number, w1: number, h1: number,
  x2: number, y2: number, w2: number, h2: number
): { startX: number; startY: number; endX: number; endY: number } {
  const cx1 = x1 + w1 / 2;
  const cy1 = y1 + h1 / 2;
  const cx2 = x2 + w2 / 2;
  const cy2 = y2 + h2 / 2;

  const dx = cx2 - cx1;
  const dy = cy2 - cy1;

  function intersectRect(cx: number, cy: number, w: number, h: number, targetX: number, targetY: number) {
    const ddx = targetX - cx;
    const ddy = targetY - cy;
    const hw = w / 2;
    const hh = h / 2;

    if (ddx === 0 && ddy === 0) return { x: cx, y: cy };

    const absDx = Math.abs(ddx);
    const absDy = Math.abs(ddy);

    if (absDx * hh > absDy * hw) {
      const sign = ddx > 0 ? 1 : -1;
      return { x: cx + sign * hw, y: cy + (ddy * hw) / absDx };
    } else {
      const sign = ddy > 0 ? 1 : -1;
      return { x: cx + (ddx * hh) / absDy, y: cy + sign * hh };
    }
  }

  const start = intersectRect(cx1, cy1, w1, h1, cx2, cy2);
  const end = intersectRect(cx2, cy2, w2, h2, cx1, cy1);

  return { startX: start.x, startY: start.y, endX: end.x, endY: end.y };
}

export { generateDDL };
export default DataModelDiagram;
