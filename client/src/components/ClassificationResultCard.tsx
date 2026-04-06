import { useState, useCallback } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import { Download, AlertTriangle, CheckCircle2, ShieldCheck, Filter } from "lucide-react";
import * as XLSX from "xlsx";

export interface ClassificationItem {
  field_name: string;
  classification_level: string;
  impact_level: string;
  impact_category: string;
  justification: string;
  is_pii_under_pdpl: string;
  recommended_controls: string;
  requires_human_review: boolean;
  human_reviewed: boolean;
  human_override_level: string;
}

const LEVEL_CONFIG: Record<string, { bg: string; text: string; border: string; order: number }> = {
  "Top Secret": { bg: "#FEE2E2", text: "#991B1B", border: "#F87171", order: 0 },
  "SECRET":     { bg: "#FFEDD5", text: "#9A3412", border: "#FB923C", order: 1 },
  "Secret":     { bg: "#FFEDD5", text: "#9A3412", border: "#FB923C", order: 1 },
  "Confidential": { bg: "#FEF9C3", text: "#854D0E", border: "#FACC15", order: 2 },
  "CONFIDENTIAL": { bg: "#FEF9C3", text: "#854D0E", border: "#FACC15", order: 2 },
  "Public":     { bg: "#DCFCE7", text: "#166534", border: "#4ADE80", order: 3 },
  "PUBLIC":     { bg: "#DCFCE7", text: "#166534", border: "#4ADE80", order: 3 },
};

const DONUT_COLORS: Record<string, string> = {
  "Top Secret": "#DC2626",
  "SECRET": "#DC2626",
  "Secret": "#EA580C",
  "Confidential": "#CA8A04",
  "CONFIDENTIAL": "#CA8A04",
  "Public": "#16A34A",
  "PUBLIC": "#16A34A",
};

function normLevel(level: string): string {
  const l = level.trim();
  if (/^top\s*secret$/i.test(l)) return "Top Secret";
  if (/^secret$/i.test(l)) return "Secret";
  if (/^confidential$/i.test(l)) return "Confidential";
  if (/^public$/i.test(l)) return "Public";
  return l;
}

function getLevelConfig(level: string) {
  return LEVEL_CONFIG[level] || LEVEL_CONFIG[normLevel(level)] || { bg: "#F3F4F6", text: "#374151", border: "#D1D5DB", order: 4 };
}

function getDonutColor(level: string) {
  return DONUT_COLORS[level] || DONUT_COLORS[normLevel(level)] || "#9CA3AF";
}

interface Props {
  items: ClassificationItem[];
  lang: "en" | "ar";
  onItemsChange?: (items: ClassificationItem[]) => void;
}

export default function ClassificationResultCard({ items, lang, onItemsChange }: Props) {
  const [filter, setFilter] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);

  // Aggregate counts
  const counts: Record<string, number> = {};
  const piiCount = items.filter(i => {
    const v = String(i.is_pii_under_pdpl).toLowerCase();
    return v === "true" || v === "yes";
  }).length;
  const reviewCount = items.filter(i => i.requires_human_review).length;

  for (const item of items) {
    const lvl = normLevel(item.classification_level);
    counts[lvl] = (counts[lvl] || 0) + 1;
  }

  // Overall classification = highest level present
  const overallLevel = items.length > 0
    ? items.reduce((highest, item) => {
        const hc = getLevelConfig(highest).order;
        const ic = getLevelConfig(item.classification_level).order;
        return ic < hc ? item.classification_level : highest;
      }, items[0].classification_level)
    : "Public";

  const donutData = [
    { name: "Top Secret", value: counts["Top Secret"] || 0, color: "#DC2626" },
    { name: "Secret", value: counts["Secret"] || 0, color: "#EA580C" },
    { name: "Confidential", value: counts["Confidential"] || 0, color: "#CA8A04" },
    { name: "Public", value: counts["Public"] || 0, color: "#16A34A" },
  ].filter(d => d.value > 0);

  const filtered = filter ? items.filter(i => normLevel(i.classification_level) === filter) : items;

  const handleOverride = useCallback((fieldName: string, newLevel: string) => {
    const updated = items.map(item =>
      item.field_name === fieldName
        ? { ...item, classification_level: newLevel, human_reviewed: true, human_override_level: newLevel }
        : item
    );
    onItemsChange?.(updated);
    setEditingField(null);
  }, [items, onItemsChange]);

  const handleExportNdmo = useCallback(() => {
    const wb = XLSX.utils.book_new();

    // Cover sheet
    const coverData = [
      ["NDMO Data Classification Report"],
      [""],
      ["Generated", new Date().toLocaleDateString("en-SA", { year: "numeric", month: "long", day: "numeric" })],
      ["Total Fields", String(items.length)],
      ["Overall Classification", normLevel(overallLevel)],
      ["PII Fields (PDPL)", String(piiCount)],
      ["Fields Requiring Review", String(reviewCount)],
      ["Human-Reviewed Fields", String(items.filter(i => i.human_reviewed).length)],
      [""],
      ["Distribution"],
      ["Top Secret", String(counts["Top Secret"] || 0)],
      ["Secret", String(counts["Secret"] || 0)],
      ["Confidential", String(counts["Confidential"] || 0)],
      ["Public", String(counts["Public"] || 0)],
    ];
    const coverWs = XLSX.utils.aoa_to_sheet(coverData);
    coverWs["!cols"] = [{ wch: 30 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, coverWs, "Cover");

    // Field assessments
    const headers = [
      "Field Name", "Classification Level",
      "Impact Level", "Impact Category", "Justification",
      "PII Under PDPL", "Recommended Controls", "Human Reviewed", "Override Level"
    ];
    const rows = items.map(item => [
      item.field_name,
      normLevel(item.classification_level),
      item.impact_level,
      item.impact_category,
      item.justification,
      item.is_pii_under_pdpl,
      item.recommended_controls,
      item.human_reviewed ? "Yes" : "No",
      item.human_override_level || "",
    ]);
    const assessWs = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    assessWs["!cols"] = headers.map((h, i) => ({ wch: i === 6 ? 50 : i === 8 ? 40 : 20 }));
    XLSX.utils.book_append_sheet(wb, assessWs, "Field Assessments");

    XLSX.writeFile(wb, "ndmo_classification_report.xlsx");
  }, [items, overallLevel, piiCount, reviewCount, counts]);

  return (
    <div className="space-y-3" data-testid="classification-result-card">
      {/* Header */}
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-4 h-4" style={{ color: "#067647" }} />
        <span className="text-xs font-semibold" style={{ color: "#067647" }}>
          {lang === "ar" ? "نتائج التصنيف" : "Classification Results"}
        </span>
        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={getLevelConfig(overallLevel)}>
          {lang === "ar" ? "التصنيف العام:" : "Overall:"} {normLevel(overallLevel)}
        </span>
        {piiCount > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: "#FEE2E2", color: "#991B1B" }}>
            {piiCount} PII
          </span>
        )}
      </div>

      {/* Donut + Legend */}
      <div className="flex items-center gap-4">
        <div className="relative w-20 h-20">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={donutData} cx="50%" cy="50%" innerRadius={25} outerRadius={35} paddingAngle={2} dataKey="value" strokeWidth={0}>
                {donutData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-bold" style={{ color: "#1A1A2E" }}>{items.length}</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          {[
            { label: lang === "ar" ? "سري للغاية" : "Top Secret", value: counts["Top Secret"] || 0, color: "#DC2626" },
            { label: lang === "ar" ? "سري" : "Secret", value: counts["Secret"] || 0, color: "#EA580C" },
            { label: lang === "ar" ? "محدود" : "Confidential", value: counts["Confidential"] || 0, color: "#CA8A04" },
            { label: lang === "ar" ? "عام" : "Public", value: counts["Public"] || 0, color: "#16A34A" },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-[10px]" style={{ color: "#6B7280" }}>{item.label}</span>
              <span className="text-[10px] font-bold" style={{ color: item.color }}>{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <Filter className="w-3 h-3" style={{ color: "#9CA3AF" }} />
        <button
          onClick={() => setFilter(null)}
          className="text-[10px] font-medium px-2 py-0.5 rounded-full transition-all"
          style={{
            backgroundColor: filter === null ? "#0D2E5C" : "#F3F4F6",
            color: filter === null ? "white" : "#6B7280",
          }}
        >
          {lang === "ar" ? "الكل" : "All"} ({items.length})
        </button>
        {(["Top Secret", "Secret", "Confidential", "Public"] as const).map(level => {
          const count = counts[level] || 0;
          if (count === 0) return null;
          const cfg = getLevelConfig(level);
          const isActive = filter === level;
          return (
            <button
              key={level}
              onClick={() => setFilter(isActive ? null : level)}
              className="text-[10px] font-medium px-2 py-0.5 rounded-full transition-all"
              style={{
                backgroundColor: isActive ? cfg.text : cfg.bg,
                color: isActive ? "white" : cfg.text,
                border: `1px solid ${cfg.border}`,
              }}
            >
              {level} ({count})
            </button>
          );
        })}
      </div>

      {/* Field table */}
      <div className="border rounded-md overflow-hidden" style={{ borderColor: "#E5E7EB" }}>
        <table className="w-full text-[11px]">
          <thead>
            <tr style={{ backgroundColor: "#F8FAFC" }}>
              <th className="text-left px-2.5 py-1.5 font-semibold" style={{ color: "#374151" }}>
                {lang === "ar" ? "اسم الحقل" : "Field Name"}
              </th>
              <th className="text-left px-2.5 py-1.5 font-semibold" style={{ color: "#374151" }}>
                {lang === "ar" ? "المستوى" : "Level"}
              </th>
              <th className="text-left px-2.5 py-1.5 font-semibold" style={{ color: "#374151" }}>
                {lang === "ar" ? "التأثير" : "Impact"}
              </th>
              <th className="text-center px-2.5 py-1.5 font-semibold" style={{ color: "#374151" }}>PII</th>
              <th className="text-center px-2.5 py-1.5 font-semibold" style={{ color: "#374151" }}>
                {lang === "ar" ? "الحالة" : "Status"}
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item, i) => {
              const cfg = getLevelConfig(item.classification_level);
              const isPii = String(item.is_pii_under_pdpl).toLowerCase() === "true" || String(item.is_pii_under_pdpl).toLowerCase() === "yes";
              const isEditing = editingField === item.field_name;

              return (
                <tr
                  key={item.field_name}
                  style={{ backgroundColor: i % 2 === 0 ? "white" : "#FAFAFA", borderTop: "1px solid #F3F4F6" }}
                >
                  <td className="px-2.5 py-1.5 font-medium" style={{ color: "#1A1A2E" }}>
                    <div className="flex items-center gap-1">
                      {item.requires_human_review && !item.human_reviewed && (
                        <AlertTriangle className="w-3 h-3 flex-shrink-0" style={{ color: "#D97706" }} title="Requires human review" />
                      )}
                      {item.human_reviewed && (
                        <CheckCircle2 className="w-3 h-3 flex-shrink-0" style={{ color: "#16A34A" }} title="Human reviewed" />
                      )}
                      <span className="truncate max-w-[140px]">{item.field_name}</span>
                    </div>
                  </td>
                  <td className="px-2.5 py-1.5">
                    {isEditing ? (
                      <select
                        className="text-[10px] rounded px-1 py-0.5 border"
                        defaultValue={normLevel(item.classification_level)}
                        onChange={(e) => handleOverride(item.field_name, e.target.value)}
                        onBlur={() => setEditingField(null)}
                        autoFocus
                      >
                        <option value="Top Secret">Top Secret</option>
                        <option value="Secret">Secret</option>
                        <option value="Confidential">Confidential</option>
                        <option value="Public">Public</option>
                      </select>
                    ) : (
                      <button
                        onClick={() => onItemsChange && setEditingField(item.field_name)}
                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full cursor-pointer"
                        style={{ backgroundColor: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}` }}
                        title={onItemsChange ? "Click to override" : ""}
                      >
                        {normLevel(item.classification_level)}
                      </button>
                    )}
                  </td>
                  <td className="px-2.5 py-1.5 text-[10px]" style={{ color: "#6B7280" }}>
                    {item.impact_level || "—"}
                  </td>
                  <td className="px-2.5 py-1.5 text-center">
                    {isPii ? (
                      <span className="text-[9px] font-semibold px-1 py-0.5 rounded-full" style={{ backgroundColor: "#FEE2E2", color: "#991B1B" }}>Yes</span>
                    ) : (
                      <span className="text-[9px]" style={{ color: "#9CA3AF" }}>No</span>
                    )}
                  </td>
                  <td className="px-2.5 py-1.5 text-center">
                    {item.human_reviewed ? (
                      <span className="text-[9px] font-medium px-1 py-0.5 rounded-full" style={{ backgroundColor: "#DCFCE7", color: "#166534" }}>
                        ✓ {lang === "ar" ? "مراجع" : "Reviewed"}
                      </span>
                    ) : item.requires_human_review ? (
                      <span className="text-[9px] font-medium px-1 py-0.5 rounded-full" style={{ backgroundColor: "#FEF3C7", color: "#92400E" }}>
                        ⚠️ {lang === "ar" ? "مراجعة" : "Review"}
                      </span>
                    ) : (
                      <span className="text-[9px]" style={{ color: "#9CA3AF" }}>—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          size="sm"
          onClick={handleExportNdmo}
          className="gap-1.5 text-[11px] text-white font-medium"
          style={{ backgroundColor: "#067647" }}
        >
          <Download className="w-3.5 h-3.5" />
          {lang === "ar" ? "تصدير تقرير NDMO" : "Export NDMO Report"}
        </Button>
        {reviewCount > 0 && (
          <span className="text-[10px]" style={{ color: "#D97706" }}>
            ⚠️ {reviewCount} {lang === "ar" ? "حقل يحتاج مراجعة" : `field${reviewCount > 1 ? "s" : ""} need${reviewCount === 1 ? "s" : ""} review`}
          </span>
        )}
      </div>
    </div>
  );
}
