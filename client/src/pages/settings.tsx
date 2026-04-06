import { useState, useEffect } from "react";
import { Link } from "wouter";
import { ArrowLeft, Database, Layers, Brain, Target, BarChart3, ShieldCheck, BookOpen, CheckCircle, ScanEye, Cpu, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "zatca-page-visibility";

export interface PageVisibility {
  "data-classification": boolean;
  "business-definitions": boolean;
  "dq-rules": boolean;
  "pii-detection": boolean;
  "informatica": boolean;
  "data-model": boolean;
  "insights": boolean;
  "nudge": boolean;
  "bi": boolean;
}

const DEFAULT_VISIBILITY: PageVisibility = {
  "data-classification": true,
  "business-definitions": true,
  "dq-rules": true,
  "pii-detection": true,
  "informatica": true,
  "data-model": true,
  "insights": true,
  "nudge": true,
  "bi": true,
};

export function loadPageVisibility(): PageVisibility {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { ...DEFAULT_VISIBILITY, ...JSON.parse(stored) };
  } catch {}
  return { ...DEFAULT_VISIBILITY };
}

export function savePageVisibility(v: PageVisibility) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(v));
}

const PAGE_CONFIGS = [
  { group: "Data Management", items: [
    { id: "data-classification" as const, icon: ShieldCheck, label: "Data Classification", labelAr: "تصنيف البيانات", color: "#067647", description: "Classify data fields per SDAIA NDMO standards" },
    { id: "business-definitions" as const, icon: BookOpen, label: "Business Definitions", labelAr: "التعريفات التجارية", color: "#51BAB4", description: "Generate bilingual business definitions" },
    { id: "dq-rules" as const, icon: CheckCircle, label: "DQ Rules", labelAr: "قواعد جودة البيانات", color: "#774896", description: "Generate data quality rules" },
    { id: "pii-detection" as const, icon: ScanEye, label: "PII Detection", labelAr: "كشف البيانات الشخصية", color: "#E53935", description: "Scan for personal & sensitive data" },
    { id: "informatica" as const, icon: Cpu, label: "Informatica Output", labelAr: "مخرجات إنفورماتيكا", color: "#F57C00", description: "Generate Informatica-compatible metadata" },
  ]},
  { group: "Other Agents", items: [
    { id: "data-model" as const, icon: Layers, label: "Analytical Model", labelAr: "النموذج التحليلي", color: "#774896", description: "Design star schema / dimensional models" },
    { id: "insights" as const, icon: Brain, label: "Insights Agent", labelAr: "وكيل الرؤى", color: "#067647", description: "Analyze data and generate insights reports" },
    { id: "nudge" as const, icon: Target, label: "Nudge Agent", labelAr: "وكيل التحفيز", color: "#7C3AED", description: "Behavioral economics for tax compliance" },
    { id: "bi" as const, icon: BarChart3, label: "BI Agent", labelAr: "وكيل BI", color: "#1A4B8C", description: "Dashboard design, report testing, test cases" },
  ]},
];

export default function SettingsPage() {
  const [visibility, setVisibility] = useState<PageVisibility>(loadPageVisibility);

  useEffect(() => {
    savePageVisibility(visibility);
  }, [visibility]);

  const toggle = (id: keyof PageVisibility) => {
    setVisibility(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const enabledCount = Object.values(visibility).filter(Boolean).length;
  const totalCount = Object.keys(visibility).length;

  return (
    <div className="h-screen flex flex-col" style={{ backgroundColor: "#F8FAFC" }}>
      {/* Header */}
      <div className="h-14 flex items-center gap-3 px-6 border-b bg-white flex-shrink-0" style={{ borderColor: "#E5E7EB" }}>
        <Link href="/">
          <button className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all hover:bg-gray-100" style={{ color: "#6B7280" }}>
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </Link>
        <div className="flex-1">
          <h1 className="text-sm font-bold" style={{ color: "#1A1A2E" }}>Page Visibility Settings</h1>
          <p className="text-[11px]" style={{ color: "#9CA3AF" }}>
            Show or hide agent pages. {enabledCount} of {totalCount} pages visible.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="text-[11px] h-7"
            onClick={() => setVisibility(DEFAULT_VISIBILITY)}
          >
            Show All
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-[11px] h-7"
            onClick={() => {
              const allOff = Object.fromEntries(Object.keys(visibility).map(k => [k, false])) as PageVisibility;
              // Keep at least data-classification visible
              allOff["data-classification"] = true;
              setVisibility(allOff);
            }}
          >
            Hide All
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {PAGE_CONFIGS.map(group => (
            <div key={group.group}>
              <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#9CA3AF" }}>
                {group.group}
              </h2>
              <div className="bg-white rounded-lg border overflow-hidden" style={{ borderColor: "#E5E7EB" }}>
                {group.items.map((item, i) => {
                  const isVisible = visibility[item.id];
                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 px-4 py-3 transition-colors"
                      style={{
                        borderTop: i > 0 ? "1px solid #F3F4F6" : undefined,
                        backgroundColor: isVisible ? "white" : "#FAFAFA",
                        opacity: isVisible ? 1 : 0.6,
                      }}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${item.color}15` }}
                      >
                        <item.icon className="w-4 h-4" style={{ color: item.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium" style={{ color: "#1A1A2E" }}>{item.label}</div>
                        <div className="text-[11px]" style={{ color: "#9CA3AF" }}>{item.description}</div>
                      </div>
                      <button
                        onClick={() => toggle(item.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all"
                        style={{
                          backgroundColor: isVisible ? "#DCFCE7" : "#F3F4F6",
                          color: isVisible ? "#166534" : "#9CA3AF",
                        }}
                      >
                        {isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        {isVisible ? "Visible" : "Hidden"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
