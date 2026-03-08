import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import * as XLSX from "xlsx";
import {
  ArrowLeft,
  Target,
  Download,
  ChevronDown,
  ChevronUp,
  Globe,
  AlertCircle,
  CheckCircle2,
  Loader2,
  LayoutGrid,
  Users,
  Search,
  Zap,
  TrendingUp,
} from "lucide-react";
import zatcaLogoPath from "@assets/zatca-logo.svg";

type Lang = "en" | "ar";

interface NudgeSegment {
  id: string;
  name: string;
  archetype: string;
  population_pct: number;
  risk_level: "Critical" | "High" | "Medium" | "Low";
  main_barrier: string;
  receptiveness: "High" | "Medium" | "Low";
  best_channel: string;
  best_timing: string;
}

interface NudgeLever {
  id: string;
  type: string;
  name: string;
  target_segments: string[];
  message_text: string;
  channel: string;
  timing: string;
  expected_impact: string;
  implementation_effort: "Low" | "Medium" | "High";
  priority: "High" | "Medium" | "Low";
}

interface NudgeReport {
  use_case: string;
  use_case_category: string;
  severity: "Critical" | "High" | "Medium" | "Low";
  diagnosis: {
    primary_root_cause: string;
    secondary_root_causes: string[];
    is_intentional: boolean;
    emotional_drivers: string[];
    friction_points: string[];
    rationale: string;
  };
  segments: NudgeSegment[];
  levers: NudgeLever[];
  intervention_plan: {
    recommended_sequence: string[];
    quick_wins: string[];
    kpis: string[];
    estimated_lift: string;
  };
}

const ZATCA_BLUE = "#0D2E5C";
const ZATCA_ACCENT = "#2563EB";
const ZATCA_GREEN = "#2E7D32";

const translations = {
  en: {
    appTitle: "Nudge Agent",
    backToAgent: "Back to Agent",
    useCases: "Use Cases",
    analyseBtn: "Analyse",
    inputPlaceholder: "Describe a tax non-compliance scenario in natural language...",
    examplesTitle: "Examples you can try:",
    examples: [
      "SMEs filing VAT returns late every quarter",
      "Family businesses not paying Zakat on time",
      "Freelancers underreporting income",
      "Retail businesses ignoring reminder notices",
      "First-time registrants missing their first deadline",
    ],
    infoCard1Title: "Diagnose Non-Compliance",
    infoCard1Desc: "Find out why taxpayers are not complying",
    infoCard2Title: "Segment Taxpayers",
    infoCard2Desc: "Group non-compliant taxpayers by behavior profile",
    infoCard3Title: "Map Behavioral Levers",
    infoCard3Desc: "Get the right intervention for each group",
    step1: "Reading your scenario",
    step2: "Diagnosing root causes",
    step3: "Segmenting taxpayer population...",
    step4: "Mapping behavioral levers",
    step5: "Building intervention plan",
    step6: "Generating report",
    errorMsg: "Something went wrong. Please try rephrasing your scenario.",
    sectionDiagnosis: "🔍 Why is this happening?",
    sectionSegments: "👥 Who are we dealing with?",
    sectionLevers: "🎯 What should we do?",
    sectionPlan: "📋 Intervention Plan",
    labelPrimaryRootCause: "Primary Root Cause",
    labelIntentional: "Is it intentional?",
    labelYes: "Yes",
    labelNo: "No",
    labelSecondary: "Secondary Root Causes",
    labelEmotional: "Emotional Drivers",
    labelFriction: "Friction Points",
    labelRationale: "Rationale",
    colSegment: "Segment Name",
    colArchetype: "Archetype",
    colPop: "Population %",
    colRisk: "Risk Level",
    colBarrier: "Main Barrier",
    colReceptiveness: "Receptiveness",
    colChannel: "Best Channel",
    colTiming: "Best Timing",
    labelTargetSegs: "Target Segments",
    labelMessage: "Nudge Message",
    labelChannelTiming: "Channel & Timing",
    labelImpactEffort: "Expected Impact & Effort",
    labelPriority: "Priority",
    labelSeq: "Recommended Sequence",
    labelQuickWins: "Quick Wins",
    labelKpis: "KPIs to Track",
    labelLift: "Estimated Compliance Lift",
    downloadBtn: "📥 Download Nudge Report",
    statRootCause: "Root Cause",
    statSegments: "Segments",
    statLevers: "Levers",
    statQuickWins: "Quick Wins",
    statLift: "Est. Lift",
    scenarioLabel: "Scenario:",
    langToggle: "عربي",
    severity: "Severity",
  },
  ar: {
    appTitle: "وكيل التحفيز",
    backToAgent: "العودة إلى الوكيل",
    useCases: "حالات الاستخدام",
    analyseBtn: "تحليل",
    inputPlaceholder: "صف سيناريو عدم امتثال ضريبي بلغة طبيعية...",
    examplesTitle: "أمثلة يمكنك تجربتها:",
    examples: [
      "المنشآت الصغيرة والمتوسطة التي تتأخر في تقديم إقرارات ضريبة القيمة المضافة كل ربع سنة",
      "شركات العائلة التي لا تسدد الزكاة في الوقت المحدد",
      "المستقلون الذين يُقرّون بدخل أقل من الحقيقي",
      "الشركات التجارية التي تتجاهل رسائل التذكير",
      "المسجلون الجدد الذين يفوّتون موعدهم الأول",
    ],
    infoCard1Title: "تشخيص عدم الامتثال",
    infoCard1Desc: "اكتشف لماذا لا يمتثل دافعو الضرائب",
    infoCard2Title: "تقسيم دافعي الضرائب",
    infoCard2Desc: "تجميع غير الممتثلين حسب سلوكهم",
    infoCard3Title: "رسم خريطة الرافعات السلوكية",
    infoCard3Desc: "احصل على التدخل المناسب لكل مجموعة",
    step1: "قراءة السيناريو",
    step2: "تشخيص الأسباب الجذرية",
    step3: "تقسيم شريحة دافعي الضرائب...",
    step4: "رسم خريطة الرافعات السلوكية",
    step5: "بناء خطة التدخل",
    step6: "إنشاء التقرير",
    errorMsg: "حدث خطأ ما. يرجى إعادة صياغة السيناريو.",
    sectionDiagnosis: "🔍 لماذا يحدث هذا؟",
    sectionSegments: "👥 مع من نتعامل؟",
    sectionLevers: "🎯 ماذا يجب أن نفعل؟",
    sectionPlan: "📋 خطة التدخل",
    labelPrimaryRootCause: "السبب الجذري الرئيسي",
    labelIntentional: "هل هو متعمد؟",
    labelYes: "نعم",
    labelNo: "لا",
    labelSecondary: "الأسباب الجذرية الثانوية",
    labelEmotional: "الدوافع العاطفية",
    labelFriction: "نقاط الاحتكاك",
    labelRationale: "المبرر",
    colSegment: "اسم الشريحة",
    colArchetype: "النمط",
    colPop: "% السكان",
    colRisk: "مستوى المخاطر",
    colBarrier: "الحاجز الرئيسي",
    colReceptiveness: "القابلية للتقبل",
    colChannel: "أفضل قناة",
    colTiming: "أفضل توقيت",
    labelTargetSegs: "الشرائح المستهدفة",
    labelMessage: "رسالة التحفيز",
    labelChannelTiming: "القناة والتوقيت",
    labelImpactEffort: "الأثر المتوقع والجهد",
    labelPriority: "الأولوية",
    labelSeq: "التسلسل الموصى به",
    labelQuickWins: "الانتصارات السريعة",
    labelKpis: "مؤشرات الأداء للمتابعة",
    labelLift: "تحسين الامتثال المتوقع",
    downloadBtn: "📥 تنزيل تقرير التحفيز",
    statRootCause: "السبب الجذري",
    statSegments: "الشرائح",
    statLevers: "الرافعات",
    statQuickWins: "انتصارات سريعة",
    statLift: "التحسين المتوقع",
    scenarioLabel: "السيناريو:",
    langToggle: "English",
    severity: "الخطورة",
  },
};

function riskColor(level: string): { bg: string; text: string } {
  if (level === "Critical") return { bg: "#FEE2E2", text: "#991B1B" };
  if (level === "High") return { bg: "#FFEDD5", text: "#C2410C" };
  if (level === "Medium") return { bg: "#FEF9C3", text: "#854D0E" };
  return { bg: "#DCFCE7", text: "#166534" };
}

function priorityColor(p: string): { bg: string; text: string } {
  if (p === "High") return { bg: "#FEE2E2", text: "#991B1B" };
  if (p === "Medium") return { bg: "#FFEDD5", text: "#C2410C" };
  return { bg: "#DCFCE7", text: "#166534" };
}

function effortColor(e: string): { bg: string; text: string } {
  if (e === "High") return { bg: "#FEE2E2", text: "#991B1B" };
  if (e === "Medium") return { bg: "#FEF9C3", text: "#854D0E" };
  return { bg: "#DCFCE7", text: "#166534" };
}

function generateNudgeExcel(report: NudgeReport): void {
  const wb = XLSX.utils.book_new();
  const zatcaBlueFill = { fgColor: { rgb: "0D2E5C" } };
  const whiteFont = { color: { rgb: "FFFFFF" }, bold: true };
  const headerStyle = { fill: zatcaBlueFill, font: whiteFont, alignment: { horizontal: "left" } };

  const applyHeaderStyle = (ws: XLSX.WorkSheet, range: string) => {
    const r = XLSX.utils.decode_range(range);
    for (let C = r.s.c; C <= r.e.c; C++) {
      const addr = XLSX.utils.encode_cell({ r: 0, c: C });
      if (!ws[addr]) ws[addr] = { v: "", t: "s" };
      ws[addr].s = headerStyle;
    }
  };

  const sheet1Data = [
    ["Field", "Value"],
    ["Use Case", report.use_case],
    ["Category", report.use_case_category],
    ["Severity", report.severity],
    ["Primary Root Cause", report.diagnosis.primary_root_cause],
    ["Is Intentional", report.diagnosis.is_intentional ? "Yes" : "No"],
    ["Estimated Compliance Lift", report.intervention_plan.estimated_lift],
    ["KPIs", report.intervention_plan.kpis.join("; ")],
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(sheet1Data);
  ws1["!cols"] = [{ wch: 30 }, { wch: 60 }];
  applyHeaderStyle(ws1, "A1:B1");
  if (ws1["A4"]) ws1["A4"].s = { fill: zatcaBlueFill, font: whiteFont };
  if (ws1["B4"]) ws1["B4"].s = { fill: zatcaBlueFill, font: whiteFont };
  XLSX.utils.book_append_sheet(wb, ws1, "executive_summary");

  const sheet2Data = [
    ["Field", "Value"],
    ["Primary Root Cause", report.diagnosis.primary_root_cause],
    ["Secondary Root Causes", report.diagnosis.secondary_root_causes.join("; ")],
    ["Emotional Drivers", report.diagnosis.emotional_drivers.join("; ")],
    ["Friction Points", report.diagnosis.friction_points.join("; ")],
    ["Rationale", report.diagnosis.rationale],
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(sheet2Data);
  ws2["!cols"] = [{ wch: 30 }, { wch: 80 }];
  applyHeaderStyle(ws2, "A1:B1");
  if (ws2["A2"]) ws2["A2"].s = { fill: zatcaBlueFill, font: whiteFont };
  if (ws2["B2"]) ws2["B2"].s = { fill: zatcaBlueFill, font: whiteFont };
  XLSX.utils.book_append_sheet(wb, ws2, "diagnosis");

  const segHeaders = ["ID", "Name", "Archetype", "Population %", "Risk Level", "Main Barrier", "Receptiveness", "Best Channel", "Best Timing"];
  const segRows = report.segments.map(s => [s.id, s.name, s.archetype, s.population_pct, s.risk_level, s.main_barrier, s.receptiveness, s.best_channel, s.best_timing]);
  const ws3 = XLSX.utils.aoa_to_sheet([segHeaders, ...segRows]);
  ws3["!cols"] = segHeaders.map(() => ({ wch: 20 }));
  applyHeaderStyle(ws3, `A1:${XLSX.utils.encode_col(segHeaders.length - 1)}1`);
  report.segments.forEach((seg, i) => {
    const row = i + 2;
    const riskC = riskColor(seg.risk_level);
    const recC = riskColor(seg.receptiveness === "High" ? "Low" : seg.receptiveness === "Medium" ? "Medium" : "High");
    const riskAddr = XLSX.utils.encode_cell({ r: row - 1, c: 4 });
    const recAddr = XLSX.utils.encode_cell({ r: row - 1, c: 6 });
    if (ws3[riskAddr]) ws3[riskAddr].s = { fill: { fgColor: { rgb: riskC.bg.replace("#", "") } }, font: { color: { rgb: riskC.text.replace("#", "") } } };
    if (ws3[recAddr]) ws3[recAddr].s = { fill: { fgColor: { rgb: recC.bg.replace("#", "") } }, font: { color: { rgb: recC.text.replace("#", "") } } };
  });
  XLSX.utils.book_append_sheet(wb, ws3, "population_segments");

  const levHeaders = ["ID", "Type", "Name", "Target Segments", "Message Text", "Channel", "Timing", "Expected Impact", "Implementation Effort", "Priority"];
  const levRows = report.levers.map(l => [l.id, l.type, l.name, l.target_segments.join("; "), l.message_text, l.channel, l.timing, l.expected_impact, l.implementation_effort, l.priority]);
  const ws4 = XLSX.utils.aoa_to_sheet([levHeaders, ...levRows]);
  ws4["!cols"] = [{ wch: 10 }, { wch: 22 }, { wch: 30 }, { wch: 20 }, { wch: 50 }, { wch: 15 }, { wch: 20 }, { wch: 30 }, { wch: 22 }, { wch: 12 }];
  applyHeaderStyle(ws4, `A1:${XLSX.utils.encode_col(levHeaders.length - 1)}1`);
  report.levers.forEach((lev, i) => {
    const row = i + 2;
    const msgAddr = XLSX.utils.encode_cell({ r: row - 1, c: 4 });
    const prioAddr = XLSX.utils.encode_cell({ r: row - 1, c: 9 });
    const prioC = priorityColor(lev.priority);
    if (ws4[msgAddr]) ws4[msgAddr].s = { fill: { fgColor: { rgb: "FEFCE8" } }, alignment: { wrapText: true } };
    if (ws4[prioAddr]) ws4[prioAddr].s = { fill: { fgColor: { rgb: prioC.bg.replace("#", "") } }, font: { color: { rgb: prioC.text.replace("#", "") }, bold: true } };
  });
  XLSX.utils.book_append_sheet(wb, ws4, "behavioral_levers");

  const sheet5Data = [
    ["Field", "Value"],
    ["Recommended Sequence", report.intervention_plan.recommended_sequence.join(" → ")],
    ["Quick Wins", report.intervention_plan.quick_wins.join("; ")],
    ["KPIs to Track", report.intervention_plan.kpis.join("; ")],
    ["Estimated Compliance Lift", report.intervention_plan.estimated_lift],
  ];
  const ws5 = XLSX.utils.aoa_to_sheet(sheet5Data);
  ws5["!cols"] = [{ wch: 30 }, { wch: 80 }];
  applyHeaderStyle(ws5, "A1:B1");
  XLSX.utils.book_append_sheet(wb, ws5, "intervention_plan");

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  XLSX.writeFile(wb, `nudge_report_${timestamp}.xlsx`);
}

const LOAD_STEPS_EN = [
  "Reading your scenario",
  "Diagnosing root causes",
  "Segmenting taxpayer population...",
  "Mapping behavioral levers",
  "Building intervention plan",
  "Generating report",
];
const LOAD_STEPS_AR = [
  "قراءة السيناريو",
  "تشخيص الأسباب الجذرية",
  "تقسيم شريحة دافعي الضرائب...",
  "رسم خريطة الرافعات السلوكية",
  "بناء خطة التدخل",
  "إنشاء التقرير",
];

export default function NudgePage() {
  const [lang, setLang] = useState<Lang>("en");
  const isRtl = lang === "ar";
  const t = translations[lang];
  const steps = lang === "ar" ? LOAD_STEPS_AR : LOAD_STEPS_EN;

  const [scenario, setScenario] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadStep, setLoadStep] = useState(0);
  const [report, setReport] = useState<NudgeReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, navigate] = useLocation();

  const resultsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sc = params.get("scenario");
    if (sc) {
      setScenario(sc);
      history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (report && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [report]);

  const simulateSteps = async () => {
    for (let i = 0; i < 6; i++) {
      setLoadStep(i);
      await new Promise(r => setTimeout(r, i < 2 ? 600 : i < 4 ? 800 : 500));
    }
  };

  const handleAnalyse = async () => {
    if (!scenario.trim()) return;
    setLoading(true);
    setLoadStep(0);
    setError(null);
    setReport(null);
    setFollowUpAnswer(null);

    const stepsPromise = simulateSteps();

    try {
      const res = await fetch("/api/nudge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario: scenario.trim() }),
      });
      const json = await res.json();
      await stepsPromise;
      if (json.ok && json.data) {
        setReport(json.data as NudgeReport);
      } else {
        setError(t.errorMsg);
      }
    } catch {
      await stepsPromise;
      setError(t.errorMsg);
    } finally {
      setLoading(false);
      setLoadStep(0);
    }
  };


  const riskBadge = (level: string) => {
    const c = riskColor(level);
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ backgroundColor: c.bg, color: c.text }}>{level}</span>;
  };

  const recBadge = (level: string) => {
    const mapped = level === "High" ? "Low" : level === "Low" ? "High" : "Medium";
    const c = riskColor(mapped);
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ backgroundColor: c.bg, color: c.text }}>{level}</span>;
  };

  return (
    <div className="min-h-screen flex bg-gray-50 font-main" dir={isRtl ? "rtl" : "ltr"}>
      {/* Sidebar */}
      <div className="hidden md:flex flex-col w-56 flex-shrink-0 shadow-xl z-20" style={{ backgroundColor: ZATCA_BLUE }}>
        <div className="p-4 pb-3">
          <div className="flex items-center gap-2 mb-3">
            <img src={zatcaLogoPath} alt="ZATCA" className="h-7 flex-shrink-0 brightness-0 invert" />
          </div>
          <h1 className="text-white font-bold text-sm mb-3" data-testid="text-nudge-app-title">{t.appTitle}</h1>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium" style={{ backgroundColor: "#2563EB30", color: "#93C5FD" }}>
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            {lang === "en" ? "Behavioural Economics" : "الاقتصاد السلوكي"}
          </div>
        </div>
        <div className="border-t border-white/10" />
        <div className="p-3 space-y-1">
          <Link
            href="/"
            className="flex items-center gap-2 px-2.5 py-2 rounded-md text-[11px] font-medium text-white/60 hover:text-white hover:bg-white/10 transition-all"
            data-testid="link-back-to-chat"
          >
            <ArrowLeft className="w-3.5 h-3.5 flex-shrink-0" />
            {t.backToAgent}
          </Link>
          <Link
            href="/use-cases"
            className="flex items-center gap-2 px-2.5 py-2 rounded-md text-[11px] font-medium text-white/60 hover:text-white hover:bg-white/10 transition-all"
            data-testid="link-use-cases-nudge"
          >
            <LayoutGrid className="w-3.5 h-3.5 flex-shrink-0" />
            {t.useCases}
          </Link>
        </div>
        <div className="mt-auto p-3">
          <button
            onClick={() => setLang(l => l === "en" ? "ar" : "en")}
            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-[11px] font-medium text-white/50 hover:text-white hover:bg-white/10 transition-all border border-white/10"
            data-testid="button-toggle-lang-sidebar"
          >
            <Globe className="w-3.5 h-3.5" />
            {t.langToggle}
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 shadow-sm" style={{ backgroundColor: ZATCA_BLUE }}>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-white/70 hover:text-white" data-testid="link-back-mobile">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <img src={zatcaLogoPath} alt="ZATCA" className="h-6 brightness-0 invert" />
            <span className="text-white font-bold text-sm">{t.appTitle}</span>
          </div>
          <button
            onClick={() => setLang(l => l === "en" ? "ar" : "en")}
            className="text-white/70 hover:text-white text-xs border border-white/20 rounded px-2 py-1"
            data-testid="button-toggle-lang-mobile"
          >
            {t.langToggle}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Hero / First load */}
          {!report && !loading && (
            <div className="max-w-3xl mx-auto px-4 py-10">
              {/* Info cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {[
                  { icon: Search, title: t.infoCard1Title, desc: t.infoCard1Desc, color: ZATCA_ACCENT },
                  { icon: Users, title: t.infoCard2Title, desc: t.infoCard2Desc, color: "#067647" },
                  { icon: Target, title: t.infoCard3Title, desc: t.infoCard3Desc, color: "#774896" },
                ].map(({ icon: Icon, title, desc, color }, i) => (
                  <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow" data-testid={`info-card-${i + 1}`}>
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: color + "18" }}>
                      <Icon className="w-5 h-5" style={{ color }} />
                    </div>
                    <h3 className="font-bold text-gray-900 text-sm mb-1">{title}</h3>
                    <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>

              {/* Examples */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6 shadow-sm">
                <p className="text-sm font-semibold text-gray-600 mb-3">{t.examplesTitle}</p>
                <ul className="space-y-1.5">
                  {t.examples.map((ex, i) => (
                    <li key={i} className="text-sm text-gray-500 flex items-start gap-2">
                      <span className="text-gray-300 flex-shrink-0 mt-0.5">—</span>
                      <span>{ex}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Loading steps */}
          {loading && (
            <div className="max-w-2xl mx-auto px-4 py-16">
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
                <div className="flex items-center gap-3 mb-6">
                  <Loader2 className="w-6 h-6 animate-spin" style={{ color: ZATCA_ACCENT }} />
                  <span className="font-semibold text-gray-700">{lang === "en" ? "Analysing your scenario..." : "جارٍ تحليل السيناريو..."}</span>
                </div>
                <div className="space-y-3">
                  {steps.map((step, i) => (
                    <div key={i} className="flex items-center gap-3" data-testid={`load-step-${i + 1}`}>
                      {i < loadStep ? (
                        <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ color: ZATCA_GREEN }} />
                      ) : i === loadStep ? (
                        <Loader2 className="w-5 h-5 flex-shrink-0 animate-spin" style={{ color: ZATCA_ACCENT }} />
                      ) : (
                        <div className="w-5 h-5 flex-shrink-0 rounded-full border-2 border-gray-200" />
                      )}
                      <span className={`text-sm ${i < loadStep ? "text-gray-400 line-through" : i === loadStep ? "text-gray-800 font-medium" : "text-gray-300"}`}>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="max-w-2xl mx-auto px-4 py-6">
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4" data-testid="error-message">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* Results */}
          {report && !loading && (
            <div className="max-w-4xl mx-auto px-4 py-6 space-y-5" ref={resultsRef}>
              {/* Scenario label */}
              <div className="flex items-start gap-2 text-sm text-gray-500">
                <span className="font-semibold text-gray-700 flex-shrink-0">{t.scenarioLabel}</span>
                <span className="italic">{scenario}</span>
              </div>

              {/* Summary Banner */}
              <div
                className="rounded-xl p-4 grid grid-cols-2 md:grid-cols-5 gap-3"
                style={{ backgroundColor: ZATCA_BLUE }}
                data-testid="summary-banner"
              >
                {[
                  { label: t.statRootCause, value: report.diagnosis.primary_root_cause.split(" ").slice(0, 4).join(" ") + "…" },
                  { label: t.statSegments, value: String(report.segments.length) },
                  { label: t.statLevers, value: String(report.levers.length) },
                  { label: t.statQuickWins, value: String(report.intervention_plan.quick_wins.length) },
                  { label: t.statLift, value: report.intervention_plan.estimated_lift },
                ].map(({ label, value }, i) => (
                  <div key={i} className="text-center" data-testid={`stat-tile-${i}`}>
                    <div className="text-white font-bold text-lg leading-tight truncate">{value}</div>
                    <div className="text-white/60 text-[11px] mt-0.5">{label}</div>
                  </div>
                ))}
              </div>

              {/* Section A — Diagnosis */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden" data-testid="section-diagnosis">
                <div className="px-5 py-4 border-b border-gray-100" style={{ backgroundColor: "#F8FAFF" }}>
                  <h2 className="font-bold text-gray-800 text-base">{t.sectionDiagnosis}</h2>
                </div>
                <div className="p-5 space-y-4">
                  <div>
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">{t.labelPrimaryRootCause}</p>
                    <div className="px-4 py-3 rounded-lg font-semibold text-white text-sm" style={{ backgroundColor: ZATCA_ACCENT }}>
                      {report.diagnosis.primary_root_cause}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t.labelIntentional}</span>
                    <span
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
                      style={report.diagnosis.is_intentional ? { backgroundColor: "#FEE2E2", color: "#991B1B" } : { backgroundColor: "#DCFCE7", color: "#166534" }}
                      data-testid="badge-intentional"
                    >
                      {report.diagnosis.is_intentional ? t.labelYes : t.labelNo}
                    </span>
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-4">{t.severity}</span>
                    {riskBadge(report.severity)}
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">{t.labelSecondary}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {report.diagnosis.secondary_root_causes.map((c, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-full text-xs bg-blue-50 text-blue-700 border border-blue-100">{c}</span>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">{t.labelEmotional}</p>
                      <ul className="space-y-1">
                        {report.diagnosis.emotional_drivers.map((d, i) => (
                          <li key={i} className="flex gap-2 text-sm text-gray-700"><span className="text-blue-400 flex-shrink-0">•</span>{d}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">{t.labelFriction}</p>
                      <ul className="space-y-1">
                        {report.diagnosis.friction_points.map((f, i) => (
                          <li key={i} className="flex gap-2 text-sm text-gray-700"><span className="text-orange-400 flex-shrink-0">•</span>{f}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">{t.labelRationale}</p>
                    <p className="text-sm text-gray-600 italic leading-relaxed bg-gray-50 rounded-lg px-4 py-3 border border-gray-100">{report.diagnosis.rationale}</p>
                  </div>
                </div>
              </div>

              {/* Section B — Segments */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden" data-testid="section-segments">
                <div className="px-5 py-4 border-b border-gray-100" style={{ backgroundColor: "#F8FAFF" }}>
                  <h2 className="font-bold text-gray-800 text-base">{t.sectionSegments}</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr style={{ backgroundColor: ZATCA_BLUE }}>
                        {[t.colSegment, t.colArchetype, t.colPop, t.colRisk, t.colBarrier, t.colReceptiveness, t.colChannel, t.colTiming].map(h => (
                          <th key={h} className="px-3 py-3 text-[11px] font-semibold text-white/80 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {report.segments.map((seg, i) => (
                        <tr key={seg.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"} data-testid={`segment-row-${seg.id}`}>
                          <td className="px-3 py-2.5 font-semibold text-gray-800 whitespace-nowrap">{seg.name}</td>
                          <td className="px-3 py-2.5 text-gray-600">{seg.archetype}</td>
                          <td className="px-3 py-2.5 text-gray-700 font-medium">{seg.population_pct}%</td>
                          <td className="px-3 py-2.5">{riskBadge(seg.risk_level)}</td>
                          <td className="px-3 py-2.5 text-gray-600 max-w-[180px]">{seg.main_barrier}</td>
                          <td className="px-3 py-2.5">{recBadge(seg.receptiveness)}</td>
                          <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">{seg.best_channel}</td>
                          <td className="px-3 py-2.5 text-gray-600">{seg.best_timing}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section C — Levers */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden" data-testid="section-levers">
                <div className="px-5 py-4 border-b border-gray-100" style={{ backgroundColor: "#F8FAFF" }}>
                  <h2 className="font-bold text-gray-800 text-base">{t.sectionLevers}</h2>
                </div>
                <div className="p-5 space-y-4">
                  {report.levers.map((lever) => {
                    const prioC = priorityColor(lever.priority);
                    const effC = effortColor(lever.implementation_effort);
                    return (
                      <div key={lever.id} className="rounded-lg border border-gray-200 overflow-hidden" data-testid={`lever-card-${lever.id}`}>
                        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between flex-wrap gap-2">
                          <div>
                            <span className="font-bold text-gray-800 text-sm">{lever.name}</span>
                            <span className="ml-2 text-[11px] text-gray-400 font-medium">{lever.type}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-gray-400 uppercase">{t.labelPriority}</span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ backgroundColor: prioC.bg, color: prioC.text }}>{lever.priority}</span>
                          </div>
                        </div>
                        <div className="p-4 space-y-3">
                          <div>
                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">{t.labelTargetSegs}</p>
                            <div className="flex flex-wrap gap-1.5">
                              {lever.target_segments.map(s => (
                                <span key={s} className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-100">{s}</span>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">{t.labelMessage}</p>
                            <div className="px-4 py-3 rounded-lg border border-yellow-200 bg-yellow-50 text-sm text-gray-800 leading-relaxed font-medium" data-testid={`lever-message-${lever.id}`}>
                              "{lever.message_text}"
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">{t.labelChannelTiming}</p>
                              <p className="text-sm text-gray-700">{lever.channel} · {lever.timing}</p>
                            </div>
                            <div>
                              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">{t.labelImpactEffort}</p>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm text-gray-700">{lever.expected_impact}</span>
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ backgroundColor: effC.bg, color: effC.text }}>
                                  {lever.implementation_effort} effort
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Section D — Intervention Plan */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden" data-testid="section-plan">
                <div className="px-5 py-4 border-b border-gray-100" style={{ backgroundColor: "#F8FAFF" }}>
                  <h2 className="font-bold text-gray-800 text-base">{t.sectionPlan}</h2>
                </div>
                <div className="p-5 space-y-4">
                  <div>
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">{t.labelSeq}</p>
                    <ol className="space-y-1.5">
                      {report.intervention_plan.recommended_sequence.map((id, i) => {
                        const lever = report.levers.find(l => l.id === id);
                        return (
                          <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                            <span className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 text-white" style={{ backgroundColor: ZATCA_ACCENT }}>{i + 1}</span>
                            <span>{lever ? `${id} — ${lever.name}` : id}</span>
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">{t.labelQuickWins}</p>
                      <ul className="space-y-1.5">
                        {report.intervention_plan.quick_wins.map((qw, i) => (
                          <li key={i} className="flex gap-2 text-sm text-gray-700">
                            <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                            {qw}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">{t.labelKpis}</p>
                      <ul className="space-y-1.5">
                        {report.intervention_plan.kpis.map((kpi, i) => (
                          <li key={i} className="flex gap-2 text-sm text-gray-700">
                            <TrendingUp className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                            {kpi}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="rounded-xl border border-green-200 bg-green-50 p-5 text-center">
                    <p className="text-[11px] font-bold text-green-600 uppercase tracking-wider mb-1">{t.labelLift}</p>
                    <p className="text-3xl font-bold text-green-700" data-testid="estimated-lift">{report.intervention_plan.estimated_lift}</p>
                  </div>
                </div>
              </div>

              {/* Download */}
              <div className="flex justify-center">
                <button
                  onClick={() => generateNudgeExcel(report)}
                  className="flex items-center gap-2 px-6 py-3 rounded-lg text-white font-semibold text-sm hover:opacity-90 active:scale-95 transition-all shadow-md"
                  style={{ backgroundColor: ZATCA_GREEN }}
                  data-testid="button-download-nudge-report"
                >
                  <Download className="w-4 h-4" />
                  {t.downloadBtn}
                </button>
              </div>

            </div>
          )}

          {/* Command Input — always at bottom of scrollable area */}
          <div className="sticky bottom-0 bg-white border-t border-gray-200 shadow-lg z-10">
            <div className="max-w-4xl mx-auto px-4 py-3">
              <div className="flex gap-2 items-end">
                <textarea
                  ref={inputRef}
                  value={scenario}
                  onChange={e => setScenario(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAnalyse(); } }}
                  placeholder={t.inputPlaceholder}
                  rows={2}
                  className="flex-1 px-4 py-3 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none bg-gray-50 placeholder-gray-400 font-mono"
                  disabled={loading}
                  data-testid="input-scenario"
                />
                <button
                  onClick={handleAnalyse}
                  disabled={!scenario.trim() || loading}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl text-white text-sm font-semibold disabled:opacity-50 transition-all hover:opacity-90 active:scale-95 flex-shrink-0"
                  style={{ backgroundColor: ZATCA_ACCENT }}
                  data-testid="button-analyse"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  {t.analyseBtn}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
