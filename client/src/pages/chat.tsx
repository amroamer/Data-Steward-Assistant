import { useState, useRef, useEffect, useCallback, Fragment } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { apiUrl } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { ErrorCard } from "@/components/error-card";
import {
  Plus,
  Send,
  Upload,
  Trash2,
  MessageSquare,
  FileSpreadsheet,
  X,
  Bot,
  User,
  ShieldCheck,
  BookOpen,
  CheckCircle,
  Loader2,
  Download,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Minimize2,
  Maximize2,
  Paperclip,
  Database,
  PanelLeftClose,
  GripVertical,
  ScanEye,
  Globe,
  BarChart3,
  Menu,
  Info,
  Image,
  Camera,
  Play,
  Clock,
  FileText,
  Activity,
  Circle,
  CheckCircle2,
  AlertCircle,
  Folder,
  Tag,
  Pencil,
  Eye,
  Type,
  Brain,
  Layers,
  Cpu,
  LayoutGrid,
  Target,
  Users,
  Search,
  Zap,
  TrendingUp,
  Share2,
  LayoutDashboard,
  FileSearch,
  ListChecks,
  Monitor,
  Square,
  Settings,
  Sparkles,
  AlertTriangle,
  RotateCcw,
  Code,
  GitBranch,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTouchDevice } from "@/hooks/use-touch-device";
import type { Conversation, Message } from "@shared/schema";
import ReactMarkdown from "react-markdown";
import {
  type AnalysisType,
  type ResultRow,
  type DataModelJSON,
  type PiiScanResult,
  type DqAnalysisResult,
  type InformaticaOutput,
  detectAndExtractAllAnalyses,
  mergeResults,
  mergeDqResults,
  generateResultExcel,
  buildResultWorkbook,
  generateAnalysisSummary,
  getIncludedAnalysisLabels,
  getAnalysisLabel,
  detectPiiScanJSON,
  generatePiiScanSummary,
  detectClassificationJSON,
  detectBusinessDefJSON,
  detectDqAnalysisJSON,
  generateDqAnalysisSummary,
  detectInformaticaJSON,
  generateInformaticaSummary,
} from "@/lib/result-store";
import DataModelDiagram from "@/components/DataModelDiagram";
import ClassificationResultCard, { type ClassificationItem } from "@/components/ClassificationResultCard";
interface PageVisibility {
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
import { useEntity } from "@/context/entity-context";
import ExcelPreview from "@/components/ExcelPreview";
import {
  type InsightsReport,
  type BackendColumnProfile,
  detectInsightsJSON,
  looksLikeInsightsJSON,
  generateInsightsExcel,
} from "@/lib/insights-store";
import { useBranding, type BrandTheme } from "@/hooks/use-branding";
import * as XLSX from "xlsx";
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from "react-resizable-panels";
import {
  addSharingEligibilitySheet,
  addDashboardDesignSheets,
  addReportTestSheet,
  addTestCaseSheets,
  addDashboardTestSheet,
  exportTestRunSheet,
  exportDashboardTestRunSheet,
  downloadBiReport,
  hasSheets as hasBiSheets,
} from "@/lib/bi-store";

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

function nudgeRiskColor(level: string): { bg: string; text: string } {
  if (level === "Critical") return { bg: "#FEE2E2", text: "#991B1B" };
  if (level === "High") return { bg: "#FFEDD5", text: "#C2410C" };
  if (level === "Medium") return { bg: "#FEF9C3", text: "#854D0E" };
  return { bg: "#DCFCE7", text: "#166534" };
}

function nudgePriorityColor(p: string): { bg: string; text: string } {
  if (p === "High") return { bg: "#FEE2E2", text: "#991B1B" };
  if (p === "Medium") return { bg: "#FFEDD5", text: "#C2410C" };
  return { bg: "#DCFCE7", text: "#166534" };
}

type BiTabKey = "sharing" | "dashboard" | "report" | "testcases" | "dashtest";

interface BiTabDef {
  key: BiTabKey;
  label: string;
  labelAr: string;
  icon: string;
  endpoint: string;
  steps: string[];
  stepsAr: string[];
}

const BI_TABS: BiTabDef[] = [
  { key: "sharing", label: "Sharing Eligibility", labelAr: "أهلية المشاركة", icon: "🔍", endpoint: "/api/bi/sharing-eligibility", steps: ["Parsing fields", "Classifying data", "Applying NDMO rules", "Generating verdict"], stepsAr: ["تحليل الحقول", "تصنيف البيانات", "تطبيق قواعد NDMO", "إصدار الحكم"] },
  { key: "dashboard", label: "Dashboard Designer", labelAr: "مصمم لوحة المعلومات", icon: "📐", endpoint: "/api/bi/dashboard-designer", steps: ["Analysing dataset", "Designing visuals", "Writing DAX measures", "Building layout"], stepsAr: ["تحليل البيانات", "تصميم المرئيات", "كتابة مقاييس DAX", "بناء التخطيط"] },
  { key: "report", label: "Report Tester", labelAr: "فاحص التقارير", icon: "🔬", endpoint: "/api/bi/report-tester", steps: ["Checking governance", "Scanning data quality", "Reviewing business logic", "Checking presentation"], stepsAr: ["فحص الحوكمة", "فحص جودة البيانات", "مراجعة منطق الأعمال", "فحص العرض"] },
  { key: "testcases", label: "Test Cases", labelAr: "حالات الاختبار", icon: "📋", endpoint: "/api/bi/test-case-generator", steps: ["Analysing fields", "Writing completeness tests", "Writing accuracy tests", "Writing governance tests", "Finalising test suite"], stepsAr: ["تحليل الحقول", "كتابة اختبارات الاكتمال", "كتابة اختبارات الدقة", "كتابة اختبارات الحوكمة", "إنهاء مجموعة الاختبارات"] },
  { key: "dashtest", label: "Dashboard Tester", labelAr: "فاحص لوحة المعلومات", icon: "🖥", endpoint: "/api/bi/dashboard-tester", steps: ["Analysing dashboard", "Writing visual tests", "Writing DAX tests", "Writing governance tests", "Finalising test suite"], stepsAr: ["تحليل لوحة المعلومات", "كتابة اختبارات المرئيات", "كتابة اختبارات DAX", "كتابة اختبارات الحوكمة", "إنهاء مجموعة الاختبارات"] },
];

const BI_VERDICT_COLORS: Record<string, { bg: string; fg: string; border: string }> = {
  CLEARED: { bg: "#E8F5E9", fg: "#1B5E20", border: "#2E7D32" },
  "CLEARED WITH CONDITIONS": { bg: "#FFF3E0", fg: "#E65100", border: "#E65100" },
  "CLEARED AFTER REMEDIATION": { bg: "#FFFDE7", fg: "#F59E0B", border: "#F59E0B" },
  BLOCKED: { bg: "#FFEBEE", fg: "#B71C1C", border: "#B71C1C" },
};

const BI_SEVERITY_COLORS: Record<string, { bg: string; fg: string }> = {
  Critical: { bg: "#B71C1C", fg: "#fff" },
  High: { bg: "#E65100", fg: "#fff" },
  Medium: { bg: "#F59E0B", fg: "#000" },
  Low: { bg: "#2E7D32", fg: "#fff" },
};

const BI_DONUT_COLORS = ["#1A4B8C", "#2E7D32", "#E65100", "#F59E0B", "#B71C1C", "#0D2E5C", "#6366F1", "#EC4899"];

function parseBiExcelFile(file: File): Promise<Record<string, unknown>[]> {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const wb = XLSX.read(e.target?.result, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: "" }) as Record<string, unknown>[];
        res(rows);
      } catch (err) { rej(err); }
    };
    reader.onerror = rej;
    reader.readAsArrayBuffer(file);
  });
}

interface BiReport {
  tab: BiTabKey;
  data: Record<string, unknown>;
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

  const ws1 = XLSX.utils.aoa_to_sheet([
    ["Field", "Value"],
    ["Use Case", report.use_case],
    ["Category", report.use_case_category],
    ["Severity", report.severity],
    ["Primary Root Cause", report.diagnosis.primary_root_cause],
    ["Is Intentional", report.diagnosis.is_intentional ? "Yes" : "No"],
    ["Estimated Compliance Lift", report.intervention_plan.estimated_lift],
    ["KPIs", report.intervention_plan.kpis.join("; ")],
  ]);
  ws1["!cols"] = [{ wch: 30 }, { wch: 60 }];
  applyHeaderStyle(ws1, "A1:B1");
  XLSX.utils.book_append_sheet(wb, ws1, "executive_summary");

  const ws2 = XLSX.utils.aoa_to_sheet([
    ["Field", "Value"],
    ["Primary Root Cause", report.diagnosis.primary_root_cause],
    ["Secondary Root Causes", report.diagnosis.secondary_root_causes.join("; ")],
    ["Emotional Drivers", report.diagnosis.emotional_drivers.join("; ")],
    ["Friction Points", report.diagnosis.friction_points.join("; ")],
    ["Rationale", report.diagnosis.rationale],
  ]);
  ws2["!cols"] = [{ wch: 30 }, { wch: 80 }];
  applyHeaderStyle(ws2, "A1:B1");
  XLSX.utils.book_append_sheet(wb, ws2, "diagnosis");

  const segHeaders = ["ID", "Name", "Archetype", "Population %", "Risk Level", "Main Barrier", "Receptiveness", "Best Channel", "Best Timing"];
  const ws3 = XLSX.utils.aoa_to_sheet([
    segHeaders,
    ...report.segments.map(s => [s.id, s.name, s.archetype, s.population_pct, s.risk_level, s.main_barrier, s.receptiveness, s.best_channel, s.best_timing]),
  ]);
  ws3["!cols"] = segHeaders.map(() => ({ wch: 20 }));
  applyHeaderStyle(ws3, `A1:${XLSX.utils.encode_col(segHeaders.length - 1)}1`);
  XLSX.utils.book_append_sheet(wb, ws3, "population_segments");

  const levHeaders = ["ID", "Type", "Name", "Target Segments", "Message Text", "Channel", "Timing", "Expected Impact", "Effort", "Priority"];
  const ws4 = XLSX.utils.aoa_to_sheet([
    levHeaders,
    ...report.levers.map(l => [l.id, l.type, l.name, l.target_segments.join("; "), l.message_text, l.channel, l.timing, l.expected_impact, l.implementation_effort, l.priority]),
  ]);
  ws4["!cols"] = [{ wch: 10 }, { wch: 22 }, { wch: 30 }, { wch: 20 }, { wch: 50 }, { wch: 15 }, { wch: 20 }, { wch: 30 }, { wch: 22 }, { wch: 12 }];
  applyHeaderStyle(ws4, `A1:${XLSX.utils.encode_col(levHeaders.length - 1)}1`);
  XLSX.utils.book_append_sheet(wb, ws4, "behavioral_levers");

  const ws5 = XLSX.utils.aoa_to_sheet([
    ["Field", "Value"],
    ["Recommended Sequence", report.intervention_plan.recommended_sequence.join(" → ")],
    ["Quick Wins", report.intervention_plan.quick_wins.join("; ")],
    ["KPIs to Track", report.intervention_plan.kpis.join("; ")],
    ["Estimated Compliance Lift", report.intervention_plan.estimated_lift],
  ]);
  ws5["!cols"] = [{ wch: 30 }, { wch: 80 }];
  applyHeaderStyle(ws5, "A1:B1");
  XLSX.utils.book_append_sheet(wb, ws5, "intervention_plan");

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  XLSX.writeFile(wb, `nudge_report_${timestamp}.xlsx`);
}

const translations = {
  en: {
    newChat: "New Data & Analytics Agent",
    newChatDataManagement: "New Data Management Agent",
    newChatDataModel: "New Analytical Data Model Agent",
    newChatInsights: "New Insight Report Agent",
    noConversations: "No conversations yet",
    deleteSession: "Delete this session?",
    yesDelete: "Yes, Delete",
    cancel: "Cancel",
    deleteAllSessions: "Delete all sessions?",
    yesDeleteAll: "Yes, Delete All",
    clearAllSessions: "Clear All Sessions",
    appTitle: "ZATCA Data & Analytics Agent",
    heroTitle: "Data & Analytics Agent",
    heroDescription: "Your AI assistant for data governance. Upload Excel, PDF, Word, or image files to classify data, generate definitions, or define quality rules.",
    collapse: "Collapse",
    expand: "Expand",
    resultXlsx: "result.xlsx",
    downloadResultXlsx: "Download result.xlsx",
    resultReady: "result.xlsx ready",
    processing: "Processing...",
    analyzing: "Analyzing your data...",
    placeholderWithFile: "Ask for business definitions, data classification, or data quality rules...",
    placeholderNoFile: "Upload a file and ask about data classification, quality rules, or business definitions...",
    uploadFooter: "Upload Excel, PDF, Word, or image files with data for analysis",
    resetTitle: "Reset result.xlsx?",
    resetDescription: (fileName: string, analyses: string) =>
      `You already have analysis results from "${fileName}". Uploading a new file will reset result.xlsx and start fresh with the new file. Your current results (${analyses}) will be lost.`,
    keepCurrent: "Keep Current",
    resetUpload: "Reset & Upload New",
    sessionFields: "Session fields:",
    toastUpdated: "result.xlsx updated",
    toastError: "Error",
    toastErrorDesc: "Failed to send message. Please try again.",
    tryAgain: "Try Again",
    invalidFile: "Invalid file",
    invalidFileDesc: "Please upload an Excel, CSV, PDF, Word, or image file.",
    cardDataClassification: "Classify from File",
    cardDataClassificationDesc: "Upload an Excel or CSV file and classify all columns by NDMO sensitivity level",
    cardClassifyFields: "Classify Specific Fields",
    cardClassifyFieldsDesc: "Manually enter column names to get their classification",
    cardClassifySummary: "Classification Summary Report",
    cardClassifySummaryDesc: "Generate an executive summary of classification results with distribution chart",
    cardReclassify: "Reclassify with Justification",
    cardReclassifyDesc: "Override a previous classification and provide a reason",
    cardBusinessDefs: "Generate Definitions from File",
    cardBusinessDefsDesc: "Upload a data dictionary or dataset and auto-generate business definitions",
    cardDefineTerms: "Define Specific Terms",
    cardDefineTermsDesc: "Enter specific data element names to get bilingual (EN/AR) definitions",
    cardEnrichDefs: "Enrich Existing Definitions",
    cardEnrichDefsDesc: "Upload existing definitions and enhance them with ownership, usage context, and DQ notes",
    cardExportDict: "Export Data Dictionary",
    cardExportDictDesc: "Generate a full data dictionary document from your definitions",
    cardDataQuality: "Auto-Generate DQ Rules",
    cardDataQualityDesc: "Upload a dataset and generate completeness, validity, and consistency rules",
    cardProfileRules: "Profile & Suggest Rules",
    cardProfileRulesDesc: "Run a data profile first, then suggest rules based on detected patterns",
    cardCustomRule: "Custom Rule Builder",
    cardCustomRuleDesc: "Define your own business rules and get them formatted as implementable DQ checks",
    cardDqInformatica: "DQ Rules for Informatica",
    cardDqInformaticaDesc: "Generate DQ rules formatted for import into Informatica Data Quality",
    cardDataModel: "Analytical Data Model",
    cardDataModelDesc: "Design a star schema with fact & dimension tables",
    cardPiiDetection: "Scan File for PII",
    cardPiiDetectionDesc: "Upload a file and detect all personally identifiable information across every column",
    cardPiiFields: "Scan Specific Fields",
    cardPiiFieldsDesc: "Enter column names with sample values to check for PII presence",
    cardPiiRisk: "PII Risk Assessment",
    cardPiiRiskDesc: "Generate a PII risk report with severity levels and recommended controls",
    cardPdplCheck: "Saudi PDPL Compliance Check",
    cardPdplCheckDesc: "Check detected PII against Saudi Personal Data Protection Law requirements",
    factTables: "Fact Tables",
    dimensionTables: "Dimension Tables",
    downloadPng: "Download Diagram as PNG",
    downloadDdl: "Download DDL Script",
    newAnalysis: "New Analysis",
    more: "more",
    piiScanToast: (count: number) => `PII scan complete — ${count} PII columns found`,
    dataModelToast: (name: string) => `Data model "${name}" added with DDL scripts`,
    analysisToast: (labels: string) => `Added ${labels} analysis results`,
    tagPiiScan: "PII Scan",
    tagDataModel: "Data Model",
    tagBusinessDefs: "Business Definitions",
    tagDataClassification: "Data Classification",
    tagDataQuality: "Data Quality Rules",
    tagInsights: "Data Insights",
    tagInformatica: "Informatica Output",
    cardInsights: "Data Insights Report",
    cardInsightsDesc: "Analyze data and generate comprehensive insights report",
    cardInformatica: "Generate Mapping Spec",
    cardInformaticaDesc: "Upload source and target schemas to generate an Informatica mapping specification",
    cardIdqExport: "Export DQ Rules to IDQ",
    cardIdqExportDesc: "Convert generated DQ rules into Informatica Data Quality importable format",
    cardTransformLogic: "Generate Transformation Logic",
    cardTransformLogicDesc: "Describe a transformation and get it formatted as Informatica expression syntax",
    cardLineage: "Data Lineage Documentation",
    cardLineageDesc: "Generate data lineage documentation from uploaded mapping files",
    insightsReportGenerated: "📊 Data Insights Report Generated",
    insightsToast: (title: string) => `Insights report "${title}" generated`,
    downloadInsightsReport: "📥 Download Insights Report",
    previousReports: "Previous Insight Reports",
    scorecardTotalInsights: "📋 Total Insights Found",
    scorecardHighImpact: "🔴 High Impact",
    scorecardAnomalies: "⚠️ Anomalies Detected",
    scorecardCompleteness: "✅ Data Completeness",
    uploadFirst: "Upload a file first to use this feature",
    approachTitle: "How was this generated?",
    approachClassification: "Fields were classified based on the SDAIA NDMO framework, considering data sensitivity, privacy impact, and regulatory requirements under Saudi data governance standards.",
    approachDefinitions: "Definitions were generated by analyzing field names, data types, sample values, and business context patterns to produce clear, comprehensive business terminology.",
    approachQuality: "Quality rules were derived by examining data patterns, null rates, value distributions, and industry-standard data quality dimensions (completeness, accuracy, consistency, timeliness).",
    approachPii: "PII scan analyzed column names and sample data patterns against Saudi PDPL personal data categories, common PII patterns, and international privacy standards.",
    approachModel: "Star schema was designed by identifying business measures (facts) and descriptive attributes (dimensions) from field relationships and data patterns.",
    approachInsights: "Insights were generated from statistical profiling of all columns, including distribution analysis, null patterns, anomaly detection, and trend identification.",
    cameraCapture: "Take a photo",
    cameraError: "Could not access camera. Please check your camera permissions.",
    outputsActivity: "Outputs & Activity",
    liveOutputs: "Live Outputs",
    sheetTracker: "Sheet Tracker",
    activityTimeline: "Activity Timeline",
    noFileLoaded: "No file loaded",
    executeCmd: "Execute",
    enterCommand: "Enter agent command...",
    whatToDo: "What would you like to do today?",
    dragDropUpload: "Upload a file to get started",
    startBtn: "Start",
    commandLabel: "Command:",
    agentIdle: "Idle",
    agentThinking: "Thinking",
    agentExecuting: "Executing",
    agentDone: "Done",
    agentWorking: "Agent Working...",
    agentCompleted: "Agent Completed Task",
    stepReadingFile: "Reading uploaded file",
    stepProcessingRequest: "Processing request",
    stepProfilingData: "Profiling data structure",
    stepGenerating: "Generating analysis",
    stepExecuting: "Executing checks",
    stepSaving: "Saving to result.xlsx",
    quickActions: "Quick Actions",
    sheetsInResult: "sheets",
    fileUploaded: "File uploaded",
    noOutputsYet: "No outputs generated yet",
    noActivityYet: "No activity yet",
    sentAt: "Sent:",
    completedAt: "Completed:",
    excelFile: "Excel File:",
    downloadUserGuide: "Download User Guide",
    userGuide: "User Guide",
    outOfScopeTitle: "Out of Scope",
    outOfScopeBody: "This question is outside the scope of the ZATCA Data & Compliance Agent. Please ask something related to data governance, data quality, tax compliance, or behavioural analysis.",
    renameConversation: "Rename",
    collapseOutputs: "Hide Outputs",
    expandOutputs: "Show Outputs",
    pasteTextMode: "Paste text data",
    pasteTextPlaceholder: "Paste field names or a data table here (e.g. column names, CSV rows)...",
    agentInsights: "Insights Agent",
    agentInsightsDesc: "Generate data insights reports from uploaded data",
    agentDataMgmt: "Data Management",
    agentDataMgmtDesc: "Classify, define, quality rules & PII detection",
    tabDataClassification: "Data Classification",
    tabBusinessDefs: "Business Definitions",
    tabDqRules: "Data Quality Rules",
    tabPiiDetection: "PII Detection",
    tabInformatica: "Informatica Output",
    agentDataModel: "Analytical Model",
    agentDataModelDesc: "Design star schema & generate DDL scripts",
    previewFile: "Preview file",
    useCases: "Use Cases",
    sharingEligibility: "Sharing",
    biAgent: "BI Agent",
    nudgeAgent: "Nudge Agent",
    newChatNudge: "New Nudge Agent",
    agentNudge: "Nudge Agent",
    agentNudgeDesc: "Behavioural economics for tax compliance",
    cardNudgeFiling: "Late VAT Filing",
    cardNudgeFilingDesc: "SMEs filing VAT returns late each quarter",
    cardNudgeZakat: "Zakat Non-Payment",
    cardNudgeZakatDesc: "Family businesses not paying Zakat on time",
    cardNudgeUnderreport: "Income Under-Reporting",
    cardNudgeUnderreportDesc: "Freelancers under-declaring taxable income",
    cardNudgeAudit: "Audit Risk Avoidance",
    cardNudgeAuditDesc: "Businesses ignoring compliance reminders",
    nudgeHeroTitle: "What would you like to analyse today?",
    nudgeHeroDesc: "Describe a tax non-compliance scenario in plain language. The agent will diagnose root causes, segment taxpayers, and design targeted behavioural interventions.",
    nudgeScenarioLabel: "Scenario:",
    nudgeSectionDiagnosis: "🔍 Why is this happening?",
    nudgeSectionSegments: "👥 Who are we dealing with?",
    nudgeSectionLevers: "🎯 What should we do?",
    nudgeSectionPlan: "📋 Intervention Plan",
    nudgeLabelPrimary: "Primary Root Cause",
    nudgeLabelIntentional: "Intentional?",
    nudgeLabelYes: "Yes",
    nudgeLabelNo: "No",
    nudgeLabelSecondary: "Secondary Root Causes",
    nudgeLabelEmotional: "Emotional Drivers",
    nudgeLabelFriction: "Friction Points",
    nudgeLabelRationale: "Rationale",
    nudgeColSegment: "Segment Name",
    nudgeColArchetype: "Archetype",
    nudgeColPop: "Population %",
    nudgeColRisk: "Risk Level",
    nudgeColBarrier: "Main Barrier",
    nudgeColRec: "Receptiveness",
    nudgeColChannel: "Best Channel",
    nudgeColTiming: "Best Timing",
    nudgeLabelMessage: "Nudge Message",
    nudgeLabelChannelTiming: "Channel & Timing",
    nudgeLabelImpact: "Expected Impact & Effort",
    nudgeLabelPriority: "Priority",
    nudgeLabelSeq: "Recommended Sequence",
    nudgeLabelQuickWins: "Quick Wins",
    nudgeLabelKpis: "KPIs to Track",
    nudgeLabelLift: "Estimated Compliance Lift",
    nudgeStatRootCause: "Root Cause",
    nudgeStatSegments: "Segments",
    nudgeStatLevers: "Levers",
    nudgeStatQuickWins: "Quick Wins",
    nudgeStatLift: "Est. Lift",
    nudgeSeverity: "Severity",
    nudgeDownload: "📥 Download Nudge Report",
    nudgeErrorMsg: "Something went wrong. Please rephrase your scenario.",
    nudgeAnalysing: "Analysing your scenario...",
    nudgeSteps: ["Reading your scenario", "Diagnosing root causes", "Segmenting taxpayer population...", "Mapping behavioral levers", "Building intervention plan", "Generating report"],
    nudgeExamplesTitle: "Example scenarios you can try:",
    nudgeExamples: [
      "SMEs filing VAT returns late every quarter",
      "Family businesses not paying Zakat on time",
      "Freelancers under-declaring income",
      "Retail businesses ignoring reminder notices",
      "New registrants missing their first deadline",
    ],
    nudgeInfoCard1: "Diagnose Non-Compliance",
    nudgeInfoCard1Desc: "Discover why taxpayers are not complying",
    nudgeInfoCard2: "Segment Taxpayers",
    nudgeInfoCard2Desc: "Group non-compliers by their behaviour",
    nudgeInfoCard3: "Map Behavioural Levers",
    nudgeInfoCard3Desc: "Get the right intervention for each group",
    refDocHeader: "📎 Reference Documents",
    aiProviderLabel: "AI Provider",
    aiProviderClaude: "Claude",
    aiProviderLocal: "Local",
    addDocument: "Add Document",
    noDocsLoaded: "No documents loaded",
    docsActive: (n: number) => `${n} document(s) active`,
    refDocTypeError: "Only PDF and TXT files are supported",
    refDocSizeError: "File too large. Max 10 MB",
    refDocDupeError: "This file is already loaded",
    stopButton: "⏹ Stop",
    generationStopped: "Generation Stopped",
    stoppedMessage: "The analysis was stopped before it completed. No results were saved.",
    clearInput: "Clear",
    newChatBi: "New BI Agent",
    biHeroTitle: "BI Agent — Business Intelligence",
    biHeroDesc: "Upload an Excel or CSV file, then use the BI tools below to analyse sharing eligibility, design dashboards, test reports, and generate test cases.",
    biUploadPrompt: "Upload an Excel or CSV file to start",
    biInfoCard1: "Sharing Eligibility",
    biInfoCard1Desc: "Check if your dataset can be shared per NDMO rules",
    biInfoCard2: "Dashboard Designer",
    biInfoCard2Desc: "Generate Power BI dashboard blueprints with KPIs",
    biInfoCard3: "Report Tester",
    biInfoCard3Desc: "Audit BI reports for governance, quality & logic issues",
    biInfoCard4: "Test Cases",
    biInfoCard4Desc: "Auto-generate UAT test cases for your report",
    biInfoCard5: "Dashboard Tester",
    biInfoCard5Desc: "Generate dashboard-specific test cases with visual checks",
    biCardSharing: "Sharing Eligibility",
    biCardSharingDesc: "Analyse dataset sharing eligibility per NDMO",
    biCardDashboard: "Dashboard Designer",
    biCardDashboardDesc: "Design Power BI dashboards with KPI cards & visuals",
    biCardReport: "Report Tester",
    biCardReportDesc: "Audit BI reports for data quality & governance",
    biCardTestCases: "Test Case Generator",
    biCardTestCasesDesc: "Generate UAT test cases for BI reports",
    biCardDashTest: "Dashboard Tester",
    biCardDashTestDesc: "Dashboard-specific test cases with visual checks",
    biRunBtn: "Run",
    biStopBtn: "Stop",
    biDownloadReport: "Download bi_agent_report.xlsx",
    biAnalysisComplete: "BI analysis complete",
    biDownloadXlsx: "Download .xlsx",
    biClassification: "Classification:",
    biGoverning: "Governing:",
    biApprovalChecklist: "Approval Checklist",
    biField: "Field",
    biClass: "Class",
    biVerdict: "Verdict",
    biDetail: "Detail:",
    biGovernance: "Governance",
    biDataQuality: "Data Quality",
    biBusinessLogic: "Business Logic",
    biPresentation: "Presentation",
    biPreSendChecklist: "Pre-Send Checklist",
    biTotal: "Total",
    biCritical: "Critical",
    biProgress: "Progress:",
    biAll: "All",
    biExportTestRun: "Export Test Run",
    biObjective: "Objective:",
    biSteps: "Steps:",
    biExpected: "Expected:",
    biPass: "Pass",
    biFail: "Fail",
    biGovRisk: "Gov Risk",
    biGrade: "Grade",
    biMoreTestCases: "more test cases",
    biGeneralPublic: "General Public",
    biPrivateSector: "Private Sector",
    biGovEntities: "Gov. Entities",
    biSidebarDownload: "Download BI Report",
  },
  ar: {
    newChat: "وكيل مالك بيانات جديد",
    newChatDataManagement: "وكيل إدارة البيانات الجديد",
    newChatDataModel: "وكيل النموذج التحليلي الجديد",
    newChatInsights: "وكيل تقرير الرؤى الجديد",
    noConversations: "لا توجد محادثات بعد",
    deleteSession: "حذف هذه الجلسة؟",
    yesDelete: "نعم، حذف",
    cancel: "إلغاء",
    deleteAllSessions: "حذف جميع الجلسات؟",
    yesDeleteAll: "نعم، حذف الكل",
    clearAllSessions: "مسح جميع الجلسات",
    appTitle: "وكيل مالك البيانات - زاتكا",
    heroTitle: "وكيل مالك البيانات",
    heroDescription: "مساعدك الذكي لحوكمة البيانات. قم بتحميل ملفات Excel أو PDF أو Word أو صور لتصنيف البيانات أو إنشاء التعريفات أو تحديد قواعد الجودة.",
    collapse: "طي الكل",
    expand: "توسيع الكل",
    resultXlsx: "result.xlsx",
    downloadResultXlsx: "تحميل result.xlsx",
    resultReady: "result.xlsx جاهز",
    processing: "جارٍ المعالجة...",
    analyzing: "جارٍ تحليل بياناتك...",
    placeholderWithFile: "اطلب تعريفات الأعمال أو تصنيف البيانات أو قواعد جودة البيانات...",
    placeholderNoFile: "قم بتحميل ملف واسأل عن تصنيف البيانات أو قواعد الجودة أو تعريفات الأعمال...",
    uploadFooter: "قم بتحميل ملفات Excel أو PDF أو Word أو صور مع بيانات للتحليل",
    resetTitle: "إعادة تعيين result.xlsx؟",
    resetDescription: (fileName: string, analyses: string) =>
      `لديك بالفعل نتائج تحليل من "${fileName}". تحميل ملف جديد سيعيد تعيين result.xlsx ويبدأ من جديد. ستفقد نتائجك الحالية (${analyses}).`,
    keepCurrent: "الاحتفاظ بالحالي",
    resetUpload: "إعادة تعيين وتحميل جديد",
    sessionFields: "حقول الجلسة:",
    toastUpdated: "تم تحديث result.xlsx",
    toastError: "خطأ",
    toastErrorDesc: "فشل إرسال الرسالة. يرجى المحاولة مرة أخرى.",
    tryAgain: "حاول مجدداً",
    invalidFile: "ملف غير صالح",
    invalidFileDesc: "يرجى تحميل ملف Excel أو CSV أو PDF أو Word أو صورة.",
    cardDataClassification: "تصنيف من ملف",
    cardDataClassificationDesc: "تحميل ملف Excel أو CSV وتصنيف جميع الأعمدة حسب مستوى حساسية NDMO",
    cardClassifyFields: "تصنيف حقول محددة",
    cardClassifyFieldsDesc: "إدخال أسماء الأعمدة يدوياً للحصول على تصنيفها",
    cardClassifySummary: "تقرير ملخص التصنيف",
    cardClassifySummaryDesc: "إنشاء ملخص تنفيذي لنتائج التصنيف مع مخطط التوزيع",
    cardReclassify: "إعادة التصنيف مع التبرير",
    cardReclassifyDesc: "تجاوز تصنيف سابق وتقديم سبب",
    cardBusinessDefs: "إنشاء تعريفات من ملف",
    cardBusinessDefsDesc: "تحميل قاموس بيانات أو مجموعة بيانات وإنشاء تعريفات أعمال تلقائياً",
    cardDefineTerms: "تعريف مصطلحات محددة",
    cardDefineTermsDesc: "إدخال أسماء عناصر بيانات محددة للحصول على تعريفات ثنائية اللغة",
    cardEnrichDefs: "إثراء التعريفات الموجودة",
    cardEnrichDefsDesc: "تحميل تعريفات موجودة وتعزيزها بالملكية وسياق الاستخدام",
    cardExportDict: "تصدير قاموس البيانات",
    cardExportDictDesc: "إنشاء وثيقة قاموس بيانات كاملة من تعريفاتك",
    cardDataQuality: "إنشاء قواعد جودة البيانات تلقائياً",
    cardDataQualityDesc: "تحميل مجموعة بيانات وإنشاء قواعد الاكتمال والصحة والاتساق",
    cardProfileRules: "تحليل واقتراح القواعد",
    cardProfileRulesDesc: "تشغيل ملف تعريف البيانات أولاً ثم اقتراح قواعد بناءً على الأنماط المكتشفة",
    cardCustomRule: "منشئ القواعد المخصصة",
    cardCustomRuleDesc: "تحديد قواعد أعمالك الخاصة وتنسيقها كفحوصات جودة قابلة للتنفيذ",
    cardDqInformatica: "قواعد جودة لـ Informatica",
    cardDqInformaticaDesc: "إنشاء قواعد جودة بتنسيق متوافق مع Informatica Data Quality",
    cardDataModel: "نموذج البيانات التحليلي",
    cardDataModelDesc: "تصميم مخطط نجمي مع جداول الحقائق والأبعاد",
    cardPiiDetection: "فحص ملف للبيانات الشخصية",
    cardPiiDetectionDesc: "تحميل ملف واكتشاف جميع المعلومات الشخصية في كل عمود",
    cardPiiFields: "فحص حقول محددة",
    cardPiiFieldsDesc: "إدخال أسماء الأعمدة مع قيم عينة للتحقق من وجود بيانات شخصية",
    cardPiiRisk: "تقييم مخاطر البيانات الشخصية",
    cardPiiRiskDesc: "إنشاء تقرير مخاطر مع مستويات الخطورة والضوابط الموصى بها",
    cardPdplCheck: "فحص امتثال نظام حماية البيانات",
    cardPdplCheckDesc: "التحقق من نتائج البيانات الشخصية مقابل متطلبات نظام حماية البيانات السعودي",
    factTables: "جداول الحقائق",
    dimensionTables: "جداول الأبعاد",
    downloadPng: "تحميل المخطط كصورة PNG",
    downloadDdl: "تحميل سكريبت DDL",
    newAnalysis: "تحليل جديد",
    more: "المزيد",
    piiScanToast: (count: number) => `اكتمل فحص البيانات الشخصية — تم العثور على ${count} أعمدة`,
    dataModelToast: (name: string) => `تمت إضافة نموذج البيانات "${name}" مع سكريبتات DDL`,
    analysisToast: (labels: string) => `تمت إضافة نتائج تحليل ${labels}`,
    tagPiiScan: "فحص البيانات الشخصية",
    tagDataModel: "نموذج البيانات",
    tagBusinessDefs: "تعريفات الأعمال",
    tagDataClassification: "تصنيف البيانات",
    tagDataQuality: "قواعد جودة البيانات",
    tagInsights: "رؤى البيانات",
    tagInformatica: "مخرجات إنفورماتيكا",
    cardInsights: "تقرير رؤى البيانات",
    cardInsightsDesc: "تحليل البيانات وإنشاء تقرير رؤى شامل",
    cardInformatica: "إنشاء مواصفات التعيين",
    cardInformaticaDesc: "تحميل مخططات المصدر والهدف لإنشاء مواصفات تعيين Informatica",
    cardIdqExport: "تصدير قواعد الجودة إلى IDQ",
    cardIdqExportDesc: "تحويل قواعد الجودة المُنشأة إلى تنسيق قابل للاستيراد في Informatica",
    cardTransformLogic: "إنشاء منطق التحويل",
    cardTransformLogicDesc: "وصف تحويل والحصول عليه بتنسيق تعبيرات Informatica",
    cardLineage: "توثيق سلسلة البيانات",
    cardLineageDesc: "إنشاء توثيق سلسلة البيانات من ملفات التعيين المحملة",
    insightsReportGenerated: "📊 تم إنشاء تقرير رؤى البيانات",
    insightsToast: (title: string) => `تم إنشاء تقرير الرؤى "${title}"`,
    downloadInsightsReport: "📥 تحميل تقرير الرؤى",
    previousReports: "التقارير السابقة",
    scorecardTotalInsights: "📋 إجمالي الرؤى",
    scorecardHighImpact: "🔴 تأثير عالي",
    scorecardAnomalies: "⚠️ شذوذات مكتشفة",
    scorecardCompleteness: "✅ اكتمال البيانات",
    uploadFirst: "قم بتحميل ملف أولاً لاستخدام هذه الميزة",
    approachTitle: "كيف تم إنشاء هذا؟",
    approachClassification: "تم تصنيف الحقول بناءً على إطار عمل SDAIA NDMO، مع مراعاة حساسية البيانات وتأثير الخصوصية والمتطلبات التنظيمية وفقاً لمعايير حوكمة البيانات السعودية.",
    approachDefinitions: "تم إنشاء التعريفات من خلال تحليل أسماء الحقول وأنواع البيانات والقيم النموذجية وأنماط السياق التجاري لإنتاج مصطلحات أعمال واضحة وشاملة.",
    approachQuality: "تم استخلاص قواعد الجودة من خلال فحص أنماط البيانات ومعدلات القيم الفارغة وتوزيعات القيم وأبعاد جودة البيانات القياسية (الاكتمال والدقة والاتساق والتوقيت).",
    approachPii: "فحص البيانات الشخصية حلل أسماء الأعمدة وأنماط البيانات النموذجية مقابل فئات البيانات الشخصية في نظام حماية البيانات الشخصية السعودي وأنماط PII الشائعة.",
    approachModel: "تم تصميم المخطط النجمي من خلال تحديد مقاييس الأعمال (الحقائق) والسمات الوصفية (الأبعاد) من علاقات الحقول وأنماط البيانات.",
    approachInsights: "تم إنشاء الرؤى من التحليل الإحصائي لجميع الأعمدة، بما في ذلك تحليل التوزيع وأنماط القيم الفارغة واكتشاف الشذوذ وتحديد الاتجاهات.",
    cameraCapture: "التقاط صورة",
    cameraError: "تعذر الوصول إلى الكاميرا. يرجى التحقق من أذونات الكاميرا.",
    outputsActivity: "المخرجات والنشاط",
    liveOutputs: "المخرجات المباشرة",
    sheetTracker: "متتبع الأوراق",
    activityTimeline: "الجدول الزمني للنشاط",
    noFileLoaded: "لم يتم تحميل ملف",
    executeCmd: "تنفيذ",
    enterCommand: "أدخل أمر الوكيل...",
    whatToDo: "ماذا تريد أن تفعل اليوم؟",
    dragDropUpload: "قم بتحميل ملف للبدء",
    startBtn: "ابدأ",
    commandLabel: "أمر:",
    agentIdle: "خامل",
    agentThinking: "يفكر",
    agentExecuting: "ينفذ",
    agentDone: "تم",
    agentWorking: "الوكيل يعمل...",
    agentCompleted: "أكمل الوكيل المهمة",
    stepReadingFile: "قراءة الملف المحمل",
    stepProcessingRequest: "معالجة الطلب",
    stepProfilingData: "تحليل هيكل البيانات",
    stepGenerating: "إنشاء التحليل",
    stepExecuting: "تنفيذ الفحوصات",
    stepSaving: "حفظ في result.xlsx",
    quickActions: "إجراءات سريعة",
    sheetsInResult: "أوراق",
    fileUploaded: "تم تحميل الملف",
    noOutputsYet: "لم يتم إنشاء مخرجات بعد",
    noActivityYet: "لا يوجد نشاط بعد",
    sentAt: "أُرسل:",
    completedAt: "اكتمل:",
    excelFile: "ملف Excel:",
    downloadUserGuide: "تنزيل دليل المستخدم",
    userGuide: "دليل المستخدم",
    outOfScopeTitle: "خارج النطاق",
    outOfScopeBody: "هذا السؤال خارج نطاق وكيل البيانات والامتثال لزاتكا. يرجى طرح سؤال متعلق بحوكمة البيانات أو جودة البيانات أو الامتثال الضريبي أو التحليل السلوكي.",
    renameConversation: "إعادة تسمية",
    collapseOutputs: "إخفاء المخرجات",
    expandOutputs: "إظهار المخرجات",
    pasteTextMode: "لصق بيانات نصية",
    pasteTextPlaceholder: "الصق أسماء الحقول أو جدول البيانات هنا...",
    agentInsights: "وكيل الرؤى",
    agentInsightsDesc: "إنشاء تقارير رؤى البيانات من الملفات المحملة",
    agentDataMgmt: "إدارة البيانات",
    agentDataMgmtDesc: "تصنيف، تعريف، قواعد الجودة وكشف البيانات الشخصية",
    tabDataClassification: "تصنيف البيانات",
    tabBusinessDefs: "تعريفات الأعمال",
    tabDqRules: "قواعد جودة البيانات",
    tabPiiDetection: "كشف البيانات الشخصية",
    tabInformatica: "مخرجات إنفورماتيكا",
    agentDataModel: "النموذج التحليلي",
    agentDataModelDesc: "تصميم مخطط نجمي وإنشاء سكريبتات DDL",
    previewFile: "معاينة الملف",
    useCases: "حالات الاستخدام",
    sharingEligibility: "المشاركة",
    biAgent: "وكيل BI",
    nudgeAgent: "وكيل التحفيز",
    newChatNudge: "وكيل تحفيز جديد",
    agentNudge: "وكيل التحفيز",
    agentNudgeDesc: "الاقتصاد السلوكي للامتثال الضريبي",
    cardNudgeFiling: "التأخر في إقرار ضريبة القيمة",
    cardNudgeFilingDesc: "المنشآت الصغيرة المتأخرة في تقديم إقرارات ضريبة القيمة المضافة",
    cardNudgeZakat: "عدم سداد الزكاة",
    cardNudgeZakatDesc: "شركات العائلة التي لا تسدد الزكاة في الوقت المحدد",
    cardNudgeUnderreport: "التقليل من الإبلاغ عن الدخل",
    cardNudgeUnderreportDesc: "المستقلون الذين يُقرّون بدخل أقل من الحقيقي",
    cardNudgeAudit: "تجنب مخاطر التدقيق",
    cardNudgeAuditDesc: "الشركات التي تتجاهل رسائل التذكير بالامتثال",
    nudgeHeroTitle: "ماذا تريد أن تحلل اليوم؟",
    nudgeHeroDesc: "صف سيناريو عدم امتثال ضريبي بلغة طبيعية. سيشخّص الوكيل الأسباب الجذرية ويقسّم دافعي الضرائب ويصمّم تدخلات سلوكية مستهدفة.",
    nudgeScenarioLabel: "السيناريو:",
    nudgeSectionDiagnosis: "🔍 لماذا يحدث هذا؟",
    nudgeSectionSegments: "👥 مع من نتعامل؟",
    nudgeSectionLevers: "🎯 ماذا يجب أن نفعل؟",
    nudgeSectionPlan: "📋 خطة التدخل",
    nudgeLabelPrimary: "السبب الجذري الرئيسي",
    nudgeLabelIntentional: "هل هو متعمد؟",
    nudgeLabelYes: "نعم",
    nudgeLabelNo: "لا",
    nudgeLabelSecondary: "الأسباب الجذرية الثانوية",
    nudgeLabelEmotional: "الدوافع العاطفية",
    nudgeLabelFriction: "نقاط الاحتكاك",
    nudgeLabelRationale: "المبرر",
    nudgeColSegment: "اسم الشريحة",
    nudgeColArchetype: "النمط",
    nudgeColPop: "% السكان",
    nudgeColRisk: "مستوى المخاطر",
    nudgeColBarrier: "الحاجز الرئيسي",
    nudgeColRec: "القابلية للتقبل",
    nudgeColChannel: "أفضل قناة",
    nudgeColTiming: "أفضل توقيت",
    nudgeLabelMessage: "رسالة التحفيز",
    nudgeLabelChannelTiming: "القناة والتوقيت",
    nudgeLabelImpact: "الأثر المتوقع والجهد",
    nudgeLabelPriority: "الأولوية",
    nudgeLabelSeq: "التسلسل الموصى به",
    nudgeLabelQuickWins: "الانتصارات السريعة",
    nudgeLabelKpis: "مؤشرات الأداء للمتابعة",
    nudgeLabelLift: "تحسين الامتثال المتوقع",
    nudgeStatRootCause: "السبب الجذري",
    nudgeStatSegments: "الشرائح",
    nudgeStatLevers: "الرافعات",
    nudgeStatQuickWins: "انتصارات سريعة",
    nudgeStatLift: "التحسين المتوقع",
    nudgeSeverity: "الخطورة",
    nudgeDownload: "📥 تنزيل تقرير التحفيز",
    nudgeErrorMsg: "حدث خطأ ما. يرجى إعادة صياغة السيناريو.",
    nudgeAnalysing: "جارٍ تحليل السيناريو...",
    nudgeSteps: ["قراءة السيناريو", "تشخيص الأسباب الجذرية", "تقسيم شريحة دافعي الضرائب...", "رسم خريطة الرافعات السلوكية", "بناء خطة التدخل", "إنشاء التقرير"],
    nudgeExamplesTitle: "أمثلة يمكنك تجربتها:",
    nudgeExamples: [
      "المنشآت الصغيرة والمتوسطة التي تتأخر في تقديم إقرارات ضريبة القيمة المضافة",
      "شركات العائلة التي لا تسدد الزكاة في الوقت المحدد",
      "المستقلون الذين يُقرّون بدخل أقل من الحقيقي",
      "الشركات التجارية التي تتجاهل رسائل التذكير",
      "المسجلون الجدد الذين يفوّتون موعدهم الأول",
    ],
    nudgeInfoCard1: "تشخيص عدم الامتثال",
    nudgeInfoCard1Desc: "اكتشف لماذا لا يمتثل دافعو الضرائب",
    nudgeInfoCard2: "تقسيم دافعي الضرائب",
    nudgeInfoCard2Desc: "تجميع غير الممتثلين حسب سلوكهم",
    nudgeInfoCard3: "رسم خريطة الرافعات السلوكية",
    nudgeInfoCard3Desc: "احصل على التدخل المناسب لكل مجموعة",
    refDocHeader: "📎 المستندات المرجعية",
    aiProviderLabel: "مزود الذكاء الاصطناعي",
    aiProviderClaude: "Claude",
    aiProviderLocal: "محلي",
    addDocument: "إضافة مستند",
    noDocsLoaded: "لا توجد مستندات محملة",
    docsActive: (n: number) => `${n} مستند(ات) نشط`,
    refDocTypeError: "يُدعم PDF وTXT فقط",
    refDocSizeError: "الملف كبير جدًا. الحد الأقصى 10 ميجابايت",
    refDocDupeError: "هذا الملف محمل بالفعل",
    stopButton: "⏹ إيقاف",
    generationStopped: "تم إيقاف المعالجة",
    stoppedMessage: "تم إيقاف التحليل قبل اكتماله. لم يتم حفظ أي نتائج.",
    clearInput: "مسح",
    newChatBi: "وكيل BI جديد",
    biHeroTitle: "وكيل BI — ذكاء الأعمال",
    biHeroDesc: "حمّل ملف Excel أو CSV واستخدم أدوات BI لتحليل أهلية المشاركة وتصميم لوحات المعلومات وفحص التقارير وإنشاء حالات الاختبار.",
    biUploadPrompt: "حمّل ملف Excel أو CSV للبدء",
    biInfoCard1: "أهلية المشاركة",
    biInfoCard1Desc: "تحقق مما إذا كان يمكن مشاركة بياناتك وفقًا لقواعد NDMO",
    biInfoCard2: "مصمم لوحات المعلومات",
    biInfoCard2Desc: "إنشاء مخططات لوحات Power BI مع مؤشرات الأداء",
    biInfoCard3: "فاحص التقارير",
    biInfoCard3Desc: "فحص تقارير BI للحوكمة والجودة والمنطق",
    biInfoCard4: "حالات الاختبار",
    biInfoCard4Desc: "إنشاء حالات اختبار UAT تلقائيًا لتقريرك",
    biInfoCard5: "فاحص لوحات المعلومات",
    biInfoCard5Desc: "حالات اختبار خاصة بلوحات المعلومات مع فحص المرئيات",
    biCardSharing: "أهلية المشاركة",
    biCardSharingDesc: "تحليل أهلية مشاركة البيانات وفقًا لـ NDMO",
    biCardDashboard: "مصمم لوحات المعلومات",
    biCardDashboardDesc: "تصميم لوحات Power BI مع بطاقات KPI والمرئيات",
    biCardReport: "فاحص التقارير",
    biCardReportDesc: "فحص تقارير BI لجودة البيانات والحوكمة",
    biCardTestCases: "مولد حالات الاختبار",
    biCardTestCasesDesc: "إنشاء حالات اختبار UAT لتقارير BI",
    biCardDashTest: "فاحص لوحات المعلومات",
    biCardDashTestDesc: "حالات اختبار خاصة بلوحات المعلومات مع فحص المرئيات",
    biRunBtn: "تشغيل",
    biStopBtn: "إيقاف",
    biDownloadReport: "تنزيل bi_agent_report.xlsx",
    biAnalysisComplete: "اكتمل تحليل BI",
    biDownloadXlsx: "تنزيل .xlsx",
    biClassification: "التصنيف:",
    biGoverning: "الحقل المهيمن:",
    biApprovalChecklist: "قائمة الموافقات",
    biField: "الحقل",
    biClass: "التصنيف",
    biVerdict: "الحكم",
    biDetail: "التفاصيل:",
    biGovernance: "الحوكمة",
    biDataQuality: "جودة البيانات",
    biBusinessLogic: "منطق الأعمال",
    biPresentation: "العرض",
    biPreSendChecklist: "قائمة ما قبل الإرسال",
    biTotal: "المجموع",
    biCritical: "حرجة",
    biProgress: "التقدم:",
    biAll: "الكل",
    biExportTestRun: "تصدير نتائج الاختبار",
    biObjective: "الهدف:",
    biSteps: "الخطوات:",
    biExpected: "المتوقع:",
    biPass: "✓ نجح",
    biFail: "✕ فشل",
    biGovRisk: "مخاطر الحوكمة",
    biGrade: "الدرجة",
    biMoreTestCases: "حالات اختبار إضافية",
    biGeneralPublic: "عام",
    biPrivateSector: "قطاع خاص",
    biGovEntities: "جهات حكومية",
    biSidebarDownload: "تنزيل تقرير BI",
  },
} as const;

type Translation = (typeof translations)[Lang];
type TranslationKey = keyof Translation;

// Hero descriptions per DM sub-mode
const DM_HERO_DESCRIPTIONS: Record<string, string> = {
  "data-classification": "Classify your data fields according to Saudi NDMO and SDAIA sensitivity standards",
  "business-definitions": "Generate and manage bilingual business definitions for your data elements",
  "dq-rules": "Create comprehensive data quality rules \u2014 technical, logical, and business",
  "pii-detection": "Detect and assess personally identifiable information in your datasets",
  "informatica": "Generate Informatica-ready outputs for mappings, DQ rules, and transformations",
};

const featureCardKeys: { titleKey: TranslationKey; descKey: TranslationKey }[] = [
  // Data Classification (4 cards)
  { titleKey: "cardDataClassification", descKey: "cardDataClassificationDesc" },
  { titleKey: "cardClassifyFields", descKey: "cardClassifyFieldsDesc" },
  { titleKey: "cardClassifySummary", descKey: "cardClassifySummaryDesc" },
  { titleKey: "cardReclassify", descKey: "cardReclassifyDesc" },
  // Business Definitions (4 cards)
  { titleKey: "cardBusinessDefs", descKey: "cardBusinessDefsDesc" },
  { titleKey: "cardDefineTerms", descKey: "cardDefineTermsDesc" },
  { titleKey: "cardEnrichDefs", descKey: "cardEnrichDefsDesc" },
  { titleKey: "cardExportDict", descKey: "cardExportDictDesc" },
  // DQ Rules (4 cards)
  { titleKey: "cardDataQuality", descKey: "cardDataQualityDesc" },
  { titleKey: "cardProfileRules", descKey: "cardProfileRulesDesc" },
  { titleKey: "cardCustomRule", descKey: "cardCustomRuleDesc" },
  { titleKey: "cardDqInformatica", descKey: "cardDqInformaticaDesc" },
  // Data Model (1 card)
  { titleKey: "cardDataModel", descKey: "cardDataModelDesc" },
  // PII Detection (4 cards)
  { titleKey: "cardPiiDetection", descKey: "cardPiiDetectionDesc" },
  { titleKey: "cardPiiFields", descKey: "cardPiiFieldsDesc" },
  { titleKey: "cardPiiRisk", descKey: "cardPiiRiskDesc" },
  { titleKey: "cardPdplCheck", descKey: "cardPdplCheckDesc" },
  // Insights (1 card)
  { titleKey: "cardInsights", descKey: "cardInsightsDesc" },
  // Informatica (4 cards)
  { titleKey: "cardInformatica", descKey: "cardInformaticaDesc" },
  { titleKey: "cardIdqExport", descKey: "cardIdqExportDesc" },
  { titleKey: "cardTransformLogic", descKey: "cardTransformLogicDesc" },
  { titleKey: "cardLineage", descKey: "cardLineageDesc" },
  // Nudge
  { titleKey: "cardNudgeFiling", descKey: "cardNudgeFilingDesc" },
  { titleKey: "cardNudgeZakat", descKey: "cardNudgeZakatDesc" },
  { titleKey: "cardNudgeUnderreport", descKey: "cardNudgeUnderreportDesc" },
  { titleKey: "cardNudgeAudit", descKey: "cardNudgeAuditDesc" },
  // BI
  { titleKey: "biCardSharing", descKey: "biCardSharingDesc" },
  { titleKey: "biCardDashboard", descKey: "biCardDashboardDesc" },
  { titleKey: "biCardReport", descKey: "biCardReportDesc" },
  { titleKey: "biCardTestCases", descKey: "biCardTestCasesDesc" },
  { titleKey: "biCardDashTest", descKey: "biCardDashTestDesc" },
];

const FEATURE_CARDS = [
  // ── Data Classification (4 cards) ─────────────────────────────────────────
  {
    icon: ShieldCheck,
    title: "Classify from File",
    description: "Upload an Excel or CSV file and classify all columns by NDMO sensitivity level",
    prompt: "Classify all columns in the uploaded file per NDMO data classification standards",
    color: "text-[#067647]",
    bg: "bg-[#067647]/5",
    iconBg: "bg-[#067647]/10",
    agentMode: "data-classification" as const,
  },
  {
    icon: Layers,
    title: "Classify Specific Fields",
    description: "Manually enter column names to get their classification",
    prompt: "Classify these data fields: [field1], [field2], [field3]",
    color: "text-[#067647]",
    bg: "bg-[#067647]/5",
    iconBg: "bg-[#067647]/10",
    agentMode: "data-classification" as const,
  },
  {
    icon: FileText,
    title: "Classification Summary Report",
    description: "Generate an executive summary of classification results with distribution chart",
    prompt: "Generate a classification summary report for the uploaded dataset",
    color: "text-[#067647]",
    bg: "bg-[#067647]/5",
    iconBg: "bg-[#067647]/10",
    agentMode: "data-classification" as const,
  },
  {
    icon: RotateCcw,
    title: "Reclassify with Justification",
    description: "Override a previous classification and provide a reason",
    prompt: "Reclassify the following fields with justification: [field] from [current] to [new]",
    color: "text-[#067647]",
    bg: "bg-[#067647]/5",
    iconBg: "bg-[#067647]/10",
    agentMode: "data-classification" as const,
  },
  // ── Business Definitions (4 cards) ────────────────────────────────────────
  {
    icon: BookOpen,
    title: "Generate Definitions from File",
    description: "Upload a data dictionary or dataset and auto-generate business definitions",
    prompt: "Generate business definitions for all columns in the uploaded file",
    color: "text-[#51BAB4]",
    bg: "bg-[#51BAB4]/5",
    iconBg: "bg-[#51BAB4]/10",
    agentMode: "business-definitions" as const,
  },
  {
    icon: FileText,
    title: "Define Specific Terms",
    description: "Enter specific data element names to get bilingual (EN/AR) definitions",
    prompt: "Define the following data elements: [term1], [term2], [term3]",
    color: "text-[#51BAB4]",
    bg: "bg-[#51BAB4]/5",
    iconBg: "bg-[#51BAB4]/10",
    agentMode: "business-definitions" as const,
  },
  {
    icon: Sparkles,
    title: "Enrich Existing Definitions",
    description: "Upload existing definitions and enhance them with ownership, usage context, and DQ notes",
    prompt: "Enrich these existing business definitions with data owner and quality notes",
    color: "text-[#51BAB4]",
    bg: "bg-[#51BAB4]/5",
    iconBg: "bg-[#51BAB4]/10",
    agentMode: "business-definitions" as const,
  },
  {
    icon: Download,
    title: "Export Data Dictionary",
    description: "Generate a full data dictionary document from your definitions",
    prompt: "Export all generated business definitions as a data dictionary",
    color: "text-[#51BAB4]",
    bg: "bg-[#51BAB4]/5",
    iconBg: "bg-[#51BAB4]/10",
    agentMode: "business-definitions" as const,
  },
  // ── DQ Rules (4 cards) ────────────────────────────────────────────────────
  {
    icon: CheckCircle,
    title: "Auto-Generate DQ Rules",
    description: "Upload a dataset and generate completeness, validity, and consistency rules",
    prompt: "Generate full DQ rules (technical, logical, and business) for the uploaded dataset",
    color: "text-[#774896]",
    bg: "bg-[#774896]/5",
    iconBg: "bg-[#774896]/10",
    agentMode: "dq-rules" as const,
  },
  {
    icon: Search,
    title: "Profile & Suggest Rules",
    description: "Run a data profile first, then suggest rules based on detected patterns",
    prompt: "Profile the uploaded data and suggest appropriate DQ rules",
    color: "text-[#774896]",
    bg: "bg-[#774896]/5",
    iconBg: "bg-[#774896]/10",
    agentMode: "dq-rules" as const,
  },
  {
    icon: Pencil,
    title: "Custom Rule Builder",
    description: "Define your own business rules and get them formatted as implementable DQ checks",
    prompt: "Create a custom DQ rule: [describe your rule logic]",
    color: "text-[#774896]",
    bg: "bg-[#774896]/5",
    iconBg: "bg-[#774896]/10",
    agentMode: "dq-rules" as const,
  },
  {
    icon: Cpu,
    title: "DQ Rules for Informatica",
    description: "Generate DQ rules formatted for import into Informatica Data Quality",
    prompt: "Generate DQ rules in Informatica-compatible format for the uploaded dataset",
    color: "text-[#774896]",
    bg: "bg-[#774896]/5",
    iconBg: "bg-[#774896]/10",
    agentMode: "dq-rules" as const,
  },
  // ── Analytical Data Model (1 card) ────────────────────────────────────────
  {
    icon: Database,
    title: "Analytical Data Model",
    description: "Design a star schema with fact & dimension tables",
    prompt: "I want to build an analytical data model (star schema) for my data. Please help me understand what I need to provide and how the model will be structured.",
    color: "text-[#0094D3]",
    bg: "bg-[#0094D3]/5",
    iconBg: "bg-[#0094D3]/10",
    agentMode: "data-model" as const,
  },
  // ── PII Detection (4 cards) ───────────────────────────────────────────────
  {
    icon: ScanEye,
    title: "Scan File for PII",
    description: "Upload a file and detect all personally identifiable information across every column",
    prompt: "Scan the uploaded file for PII and classify each detection",
    color: "text-red-600",
    bg: "bg-red-50",
    iconBg: "bg-red-100",
    agentMode: "pii-detection" as const,
  },
  {
    icon: Search,
    title: "Scan Specific Fields",
    description: "Enter column names with sample values to check for PII presence",
    prompt: "Scan these fields for PII: [field1]: [sample], [field2]: [sample]",
    color: "text-red-600",
    bg: "bg-red-50",
    iconBg: "bg-red-100",
    agentMode: "pii-detection" as const,
  },
  {
    icon: AlertTriangle,
    title: "PII Risk Assessment",
    description: "Generate a PII risk report with severity levels and recommended controls",
    prompt: "Generate a PII risk assessment report for the uploaded dataset",
    color: "text-red-600",
    bg: "bg-red-50",
    iconBg: "bg-red-100",
    agentMode: "pii-detection" as const,
  },
  {
    icon: ShieldCheck,
    title: "Saudi PDPL Compliance Check",
    description: "Check detected PII against Saudi Personal Data Protection Law requirements",
    prompt: "Check PII findings against PDPL compliance requirements",
    color: "text-red-600",
    bg: "bg-red-50",
    iconBg: "bg-red-100",
    agentMode: "pii-detection" as const,
  },
  // ── Data Insights (1 card) ────────────────────────────────────────────────
  {
    icon: BarChart3,
    title: "Data Insights Report",
    description: "Analyze data and generate comprehensive insights report",
    prompt: "I'd like to generate a data insights report. Upload an Excel file with your data and I'll analyze it to find key trends, anomalies, patterns, and provide actionable recommendations.",
    color: "text-[#1A4B8C]",
    bg: "bg-[#1A4B8C]/5",
    iconBg: "bg-[#1A4B8C]/10",
    agentMode: "insights" as const,
  },
  // ── Informatica Output (4 cards) ──────────────────────────────────────────
  {
    icon: Cpu,
    title: "Generate Mapping Spec",
    description: "Upload source and target schemas to generate an Informatica mapping specification",
    prompt: "Generate an Informatica mapping specification from the uploaded source/target files",
    color: "text-[#F57C00]",
    bg: "bg-[#F57C00]/5",
    iconBg: "bg-[#F57C00]/10",
    agentMode: "informatica" as const,
  },
  {
    icon: Download,
    title: "Export DQ Rules to IDQ",
    description: "Convert generated DQ rules into Informatica Data Quality importable format",
    prompt: "Export DQ rules to Informatica Data Quality format",
    color: "text-[#F57C00]",
    bg: "bg-[#F57C00]/5",
    iconBg: "bg-[#F57C00]/10",
    agentMode: "informatica" as const,
  },
  {
    icon: Code,
    title: "Generate Transformation Logic",
    description: "Describe a transformation and get it formatted as Informatica expression syntax",
    prompt: "Generate Informatica transformation logic for: [describe transformation]",
    color: "text-[#F57C00]",
    bg: "bg-[#F57C00]/5",
    iconBg: "bg-[#F57C00]/10",
    agentMode: "informatica" as const,
  },
  {
    icon: GitBranch,
    title: "Data Lineage Documentation",
    description: "Generate data lineage documentation from uploaded mapping files",
    prompt: "Generate data lineage documentation from the uploaded mapping spec",
    color: "text-[#F57C00]",
    bg: "bg-[#F57C00]/5",
    iconBg: "bg-[#F57C00]/10",
    agentMode: "informatica" as const,
  },
  {
    icon: FileText,
    title: "Late VAT Filing",
    description: "SMEs filing VAT returns late each quarter",
    prompt: "SMEs filing VAT returns late every quarter",
    color: "text-[#7C3AED]",
    bg: "bg-[#7C3AED]/5",
    iconBg: "bg-[#7C3AED]/10",
    agentMode: "nudge" as const,
  },
  {
    icon: Users,
    title: "Zakat Non-Payment",
    description: "Family businesses not paying Zakat on time",
    prompt: "Family businesses not paying Zakat on time",
    color: "text-[#7C3AED]",
    bg: "bg-[#7C3AED]/5",
    iconBg: "bg-[#7C3AED]/10",
    agentMode: "nudge" as const,
    hidden: true,
  },
  {
    icon: TrendingUp,
    title: "Income Under-Reporting",
    description: "Freelancers under-declaring taxable income",
    prompt: "Freelancers under-declaring taxable income",
    color: "text-[#7C3AED]",
    bg: "bg-[#7C3AED]/5",
    iconBg: "bg-[#7C3AED]/10",
    agentMode: "nudge" as const,
  },
  {
    icon: Zap,
    title: "Audit Risk Avoidance",
    description: "Businesses ignoring compliance reminders",
    prompt: "Retail businesses ignoring compliance reminder notices",
    color: "text-[#7C3AED]",
    bg: "bg-[#7C3AED]/5",
    iconBg: "bg-[#7C3AED]/10",
    agentMode: "nudge" as const,
    hidden: true,
  },
  {
    icon: Share2,
    title: "Sharing Eligibility",
    description: "Analyse dataset sharing eligibility per NDMO",
    prompt: "",
    color: "text-[#1A4B8C]",
    bg: "bg-[#1A4B8C]/5",
    iconBg: "bg-[#1A4B8C]/10",
    agentMode: "bi" as const,
  },
  {
    icon: LayoutDashboard,
    title: "Dashboard Designer",
    description: "Design Power BI dashboards with KPI cards & visuals",
    prompt: "",
    color: "text-[#1A4B8C]",
    bg: "bg-[#1A4B8C]/5",
    iconBg: "bg-[#1A4B8C]/10",
    agentMode: "bi" as const,
    hidden: true,
  },
  {
    icon: FileSearch,
    title: "Report Tester",
    description: "Audit BI reports for data quality & governance",
    prompt: "",
    color: "text-[#1A4B8C]",
    bg: "bg-[#1A4B8C]/5",
    iconBg: "bg-[#1A4B8C]/10",
    agentMode: "bi" as const,
  },
  {
    icon: ListChecks,
    title: "Test Case Generator",
    description: "Generate UAT test cases for BI reports",
    prompt: "",
    color: "text-[#1A4B8C]",
    bg: "bg-[#1A4B8C]/5",
    iconBg: "bg-[#1A4B8C]/10",
    agentMode: "bi" as const,
    hidden: true,
  },
  {
    icon: Monitor,
    title: "Dashboard Tester",
    description: "Dashboard-specific test cases with visual checks",
    prompt: "",
    color: "text-[#1A4B8C]",
    bg: "bg-[#1A4B8C]/5",
    iconBg: "bg-[#1A4B8C]/10",
    agentMode: "bi" as const,
    hidden: true,
  },
];

interface ThreadPair {
  userMsg: Message;
  assistantMsg?: Message;
}

interface ActivityLogEntry {
  icon: string;
  text: string;
  timestamp: string;
  messageId?: number;
}

type AgentStatus = "idle" | "thinking" | "executing" | "done";

interface ThinkingStep {
  label: string;
  status: "done" | "active" | "pending";
  estimatedSeconds?: number;
  startedAt?: number;
  completedAt?: number;
}

const SHEET_TAG_COLORS: Record<string, string> = {
  business_definitions: "#2563EB",
  data_classification: "#774896",
  data_quality: "#2E7D32",
  pii_scan: "#C62828",
  data_model: "#0D2E5C",
  insights: "#E65100",
  informatica: "#F57C00",
};

type AgentMode = "data-classification" | "business-definitions" | "dq-rules" | "pii-detection" | "informatica" | "data-model" | "insights" | "nudge" | "bi";
const DM_SUB_MODES: AgentMode[] = ["data-classification", "business-definitions", "dq-rules", "pii-detection", "informatica"];
const isDmSubMode = (mode: AgentMode) => DM_SUB_MODES.includes(mode);

const STATUS_COLORS: Record<AgentStatus, { bg: string; text: string; pulse: boolean }> = {
  idle: { bg: "#6B7280", text: "#ffffff", pulse: false },
  thinking: { bg: "#2563EB", text: "#ffffff", pulse: true },
  executing: { bg: "#E65100", text: "#ffffff", pulse: true },
  done: { bg: "#2E7D32", text: "#ffffff", pulse: false },
};

function isOutOfScope(text: string): boolean {
  return text.includes("I am a ZATCA data and compliance consultant");
}

function detectAnalysisTag(userContent: string, assistantContent?: string, t?: Translation): string | null {
  const tr = t || translations.en;
  const combined = `${userContent} ${assistantContent || ""}`.toLowerCase();

  // Strip injected column data from the user's typed text before keyword matching.
  // Injected data is appended after " --- Column" or "[SYSTEM NOTE:" separators.
  const strippedUser = userContent.split(/\s*---\s*Column\s|\n\n\[SYSTEM NOTE:/)[0];
  const userOnly = strippedUser.toLowerCase();

  // 1. Unambiguous JSON structure markers in the AI response (checked first — very precise)
  if (combined.includes("report_title") && combined.includes("key_insights")) return tr.tagInsights;
  if (combined.includes("scan_summary")) return tr.tagPiiScan;
  if (combined.includes("fact_table_name") || (combined.includes("fact_tables") && combined.includes("dimension_tables"))) return tr.tagDataModel;
  if (combined.includes("dq_dimension") || combined.includes("rule_layer")) return tr.tagDataQuality;
  if (combined.includes("informatica_sql") || combined.includes("format_types")) return tr.tagInformatica;

  // 2. User intent only — based on the user's typed text (stripped of injected data)
  if (
    userOnly.includes("insight") || userOnly.includes("رؤى") ||
    userOnly.includes("analyze this data") || userOnly.includes("analyse this data") ||
    userOnly.includes("data report") || userOnly.includes("key findings") ||
    userOnly.includes("summarize this data") || userOnly.includes("explore this dataset") ||
    userOnly.includes("what does this data") || userOnly.includes("tell me about this data") ||
    userOnly.includes("تحليل البيانات")
  ) return tr.tagInsights;

  if (
    userOnly.includes("quality") || userOnly.includes("dq rule") || userOnly.includes(" dq ") ||
    userOnly.startsWith("dq ") || userOnly.includes("جودة") || userOnly.includes("validation rule") ||
    userOnly.includes("quality check") || userOnly.includes("quality rules")
  ) return tr.tagDataQuality;

  if (
    userOnly.includes("pii") || userOnly.includes("pdpl") || userOnly.includes("privacy scan") ||
    userOnly.includes("personal data") || userOnly.includes("sensitive data") ||
    userOnly.includes("بيانات شخصية") || userOnly.includes("detect personal") ||
    userOnly.includes("scan for") || userOnly.includes("sensitive information")
  ) return tr.tagPiiScan;

  if (
    userOnly.includes("data model") || userOnly.includes("star schema") ||
    userOnly.includes("dimensional model") || userOnly.includes("analytical model") ||
    userOnly.includes("نموذج بيانات") || userOnly.includes("نموذج تحليلي")
  ) return tr.tagDataModel;

  // Business definitions checked BEFORE classification — more specific intent
  if (
    userOnly.includes("definition") || userOnly.includes("defintions") || userOnly.includes("definiton") ||
    userOnly.includes("تعريف") ||
    userOnly.includes("business def") || userOnly.includes("business term") ||
    userOnly.includes("data dictionary") || userOnly.includes("define the") ||
    userOnly.includes("define these") || /business\s+defin/.test(userOnly)
  ) return tr.tagBusinessDefs;

  if (
    userOnly.includes("classif") || userOnly.includes("تصنيف")
  ) return tr.tagDataClassification;

  return null;
}

function intentToTag(intent: string, t: Translation): string | null {
  const map: Record<string, string> = {
    classification:       t.tagDataClassification,
    business_definitions: t.tagBusinessDefs,
    dq_rules:             t.tagDataQuality,
    pii:                  t.tagPiiScan,
    data_model:           t.tagDataModel,
    insights:             t.tagInsights,
  };
  return map[intent] ?? null;
}

function detectDataModelJSON(content: string): DataModelJSON | null {
  const fencedMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fencedMatch ? fencedMatch[1].trim() : null;
  if (candidate) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && Array.isArray(parsed.fact_tables) && Array.isArray(parsed.dimension_tables) && Array.isArray(parsed.relationships)) {
        return parsed as DataModelJSON;
      }
    } catch {}
  }
  // Fallback: RAGFlow returns plain JSON (no fences)
  try {
    const parsed = JSON.parse(content.trim());
    if (parsed && Array.isArray(parsed.fact_tables) && Array.isArray(parsed.dimension_tables) && Array.isArray(parsed.relationships)) {
      return parsed as DataModelJSON;
    }
  } catch {}
  return null;
}

function groupMessagesIntoThreads(messages: Message[]): ThreadPair[] {
  const threads: ThreadPair[] = [];
  let i = 0;
  while (i < messages.length) {
    if (messages[i].role === "user") {
      const pair: ThreadPair = { userMsg: messages[i] };
      if (i + 1 < messages.length && messages[i + 1].role === "assistant") {
        pair.assistantMsg = messages[i + 1];
        i += 2;
      } else {
        i += 1;
      }
      threads.push(pair);
    } else {
      threads.push({ userMsg: messages[i], assistantMsg: undefined });
      i += 1;
    }
  }
  return threads;
}

function formatTimestamp(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function inferStepsForCommand(content: string, t: Translation): ThinkingStep[] {
  const lower = content.toLowerCase();
  const hasFile =
    content.includes("**Uploaded File:") ||
    content.includes("**Uploaded Image:") ||
    content.includes("**Uploaded Document:");
  const isDq = lower.includes("quality") || lower.includes("dq") || lower.includes("جودة");
  const isClassification = lower.includes("classification") || lower.includes("تصنيف");
  const isDefinition = lower.includes("definition") || lower.includes("تعريف");
  const isModel = lower.includes("model") || lower.includes("نموذج") || lower.includes("star schema");
  const isPii = lower.includes("pii") || lower.includes("بيانات شخصية") || lower.includes("privacy");
  const isInsight = lower.includes("insight") || lower.includes("رؤى");

  type StepDef = { label: string; est: number };
  const stepDefs: StepDef[] = [
    { label: hasFile ? t.stepReadingFile : t.stepProcessingRequest, est: 2 },
    { label: t.stepProfilingData, est: 3 },
  ];

  if (isDq) {
    stepDefs.push(
      { label: t.stepGenerating, est: 45 },
      { label: t.stepExecuting, est: 45 },
      { label: t.stepSaving, est: 5 },
    );
  } else if (isClassification || isDefinition || isModel) {
    stepDefs.push(
      { label: t.stepGenerating, est: 25 },
      { label: t.stepSaving, est: 5 },
    );
  } else if (isPii) {
    stepDefs.push(
      { label: t.stepGenerating, est: 30 },
      { label: t.stepSaving, est: 5 },
    );
  } else if (isInsight) {
    stepDefs.push(
      { label: t.stepGenerating, est: 40 },
      { label: t.stepSaving, est: 5 },
    );
  } else {
    stepDefs.push({ label: t.stepGenerating, est: 20 });
  }

  return stepDefs.map(({ label, est }) => ({
    label,
    status: "done" as const,
    estimatedSeconds: est,
  }));
}

function getStepIcon(label: string): string {
  const l = label.toLowerCase();
  if (l.includes("saving") || l.includes("export") || l.includes("result")) return "💾";
  if (l.includes("executing") || l.includes("running"))                       return "▶️";
  if (l.includes("checking") || l.includes("validation"))                     return "✅";
  if (l.includes("profiling") || l.includes("structure") || l.includes("data")) return "📊";
  if (l.includes("generating") || l.includes("analysis") || l.includes("output")) return "⚙️";
  return "🔄";
}

function isRawData(text: string): boolean {
  if (!text || text.trim().length === 0) return false;
  const trimmed = text.trim();
  if ((trimmed.startsWith("{") && trimmed.endsWith("}")) ||
      (trimmed.startsWith("[") && trimmed.endsWith("]"))) return true;
  if (trimmed.includes("--- Pasted Data ---")) return true;
  const lines = trimmed.split("\n");
  if (lines.length >= 3 && (lines[0].includes(",") || lines[0].includes("|"))) return true;
  if (lines.length > 2 && !/[.?!]/.test(lines[0])) return true;
  return false;
}

function normalizeProviderError(message: string): string {
  if (!message) return "An unexpected error occurred. Please try again.";
  const m = message.toLowerCase();
  if (m.includes("401") || m.includes("403") || m.includes("unauthorized") || m.includes("forbidden"))
    return "Authentication failed. Please check your API configuration.";
  if (m.includes("404") || m.includes("not found"))
    return "Service not found. Please verify your API endpoint.";
  if (m.includes("500") || m.includes("internal server"))
    return "The AI service encountered an error. Please try again.";
  if (m.includes("timeout") || m.includes("timed out"))
    return "Request timed out. Please try again.";
  if (m.includes("network") || m.includes("failed to fetch") || m.includes("econnrefused"))
    return "Could not connect to the AI service. Please check your connection.";
  if (m.includes("ragflow") || m.includes("rag flow"))
    return "The AI service encountered an error. Please try again.";
  return message;
}

type MetricPill = { label: string; count: number; color: "red" | "amber" | "green" };

function extractMetricPills(
  piiScan?: PiiScanResult | null,
  dqAnalysis?: DqAnalysisResult | null
): MetricPill[] {
  const pills: MetricPill[] = [];
  if (piiScan) {
    const s = piiScan.scan_summary;
    if (s.pii_columns_found > 0)
      pills.push({ label: "PII columns", count: s.pii_columns_found, color: "red" });
    if (s.sensitive_columns_found > 0)
      pills.push({ label: "Sensitive", count: s.sensitive_columns_found, color: "amber" });
    if (s.clean_columns > 0)
      pills.push({ label: "Clean", count: s.clean_columns, color: "green" });
  }
  if (dqAnalysis) {
    const s = dqAnalysis.analysis_summary;
    if (s.fields_with_critical_rules > 0)
      pills.push({ label: "Critical fields", count: s.fields_with_critical_rules, color: "red" });
    if (s.warnings_count > 0)
      pills.push({ label: "Warnings", count: s.warnings_count, color: "amber" });
  }
  return pills;
}

type CommandType = "pii" | "dq" | "model" | "informatica" | "insights";

function detectRequestedCommandTypes(content: string): CommandType[] {
  const lower = content.toLowerCase();
  const types: CommandType[] = [];
  if (lower.includes("pii") || lower.includes("privacy") || lower.includes("pdpl") || lower.includes("personal data")) types.push("pii");
  if (lower.includes("data quality") || lower.includes("dq rules") || lower.includes("quality rules") || lower.includes("validation rules")) types.push("dq");
  if (lower.includes("data model") || lower.includes("star schema") || lower.includes("dimensional model") || lower.includes("fact table")) types.push("model");
  if (lower.includes("informatica")) types.push("informatica");
  if ((lower.includes("insight") || lower.includes("analyze") || lower.includes("analyse")) && !types.includes("dq")) types.push("insights");
  return types;
}

const FOLLOW_UP_MESSAGES: Record<CommandType, string> = {
  pii:         "Now perform a PII scan on the same dataset and return the PII detection results.",
  dq:          "Now generate data quality rules for the same dataset.",
  model:       "Now generate a dimensional data model (star schema) for the same dataset.",
  informatica: "Now generate Informatica-compatible output for the same dataset.",
  insights:    "Now generate a data insights report for the same dataset.",
};

function stripExcelContent(content: string): { displayText: string; fileName: string | null } {
  const uploadPatterns = [
    { regex: /(?:^|\n\n)\*\*Uploaded File: (.+?)\*\*/, marker: "**Uploaded File:" },
    { regex: /(?:^|\n\n)\*\*Uploaded Image: (.+?)\*\*/, marker: "**Uploaded Image:" },
    { regex: /(?:^|\n\n)\*\*Uploaded Document: (.+?)\*\*/, marker: "**Uploaded Document:" },
  ];
  for (const { regex, marker } of uploadPatterns) {
    const match = content.match(regex);
    if (match) {
      const markerIdx = content.indexOf(marker);
      const displayText = markerIdx > 0 ? content.substring(0, markerIdx).trim() : "";
      return { displayText, fileName: match[1] };
    }
  }

  const simpleMatch = content.match(/(?:^|\n\n)Uploaded: (.+)$/);
  if (simpleMatch) {
    const markerIdx = content.indexOf("Uploaded:");
    const displayText = markerIdx > 0 ? content.substring(0, markerIdx).trim() : "";
    return { displayText, fileName: simpleMatch[1] };
  }

  return { displayText: content, fileName: null };
}

function ImagePreview({ file }: { file: File }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  if (!previewUrl) return <Image className="w-4 h-4 text-emerald-600 flex-shrink-0" />;

  return (
    <img
      src={previewUrl}
      alt={file.name}
      className="w-8 h-8 rounded object-cover flex-shrink-0 border border-emerald-200"
      data-testid="img-file-preview"
    />
  );
}

function SidebarContent({
  t,
  conversations,
  conversationsLoading,
  activeConversationId,
  setActiveConversationId,
  onCollapse,
  handleNewChat,
  deletingConvId,
  setDeletingConvId,
  handleDeleteConversation,
  fadingOutConvId,
  fadingOutAll,
  showClearAllConfirm,
  setShowClearAllConfirm,
  handleDeleteAllConversations,
  agentStatus,
  editingConvId,
  setEditingConvId,
  editTitle,
  setEditTitle,
  handleSaveRename,
  agentMode,
  aiProvider,
  onAiProviderChange,
  theme,
}: {
  t: Translation;
  conversations: Conversation[];
  conversationsLoading: boolean;
  activeConversationId: number | null;
  setActiveConversationId: (id: number) => void;
  onCollapse: () => void;
  handleNewChat: () => void;
  deletingConvId: number | null;
  setDeletingConvId: (id: number | null) => void;
  handleDeleteConversation: (id: number) => void;
  fadingOutConvId: number | null;
  fadingOutAll: boolean;
  showClearAllConfirm: boolean;
  setShowClearAllConfirm: (v: boolean) => void;
  handleDeleteAllConversations: () => void;
  agentStatus: AgentStatus;
  editingConvId: number | null;
  setEditingConvId: (id: number | null) => void;
  editTitle: string;
  setEditTitle: (t: string) => void;
  handleSaveRename: (id: number) => void;
  agentMode: AgentMode;
  aiProvider: "claude" | "local";
  onAiProviderChange: (v: "claude" | "local") => void;
  theme: BrandTheme;
}) {
  const statusConfig = STATUS_COLORS[agentStatus];
  const statusLabel = agentStatus === "idle" ? t.agentIdle : agentStatus === "thinking" ? t.agentThinking : agentStatus === "executing" ? t.agentExecuting : t.agentDone;

  return (
    <div
      className="h-full flex flex-col font-main"
      style={{ backgroundColor: theme.sidebarBg }}
      data-testid="sidebar"
    >
      <div className="p-4 pb-3">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1" />
          <Button
            size="icon"
            variant="ghost"
            onClick={onCollapse}
            className="h-7 w-7 flex-shrink-0 text-white/40 hover:text-white hover:bg-white/10"
            data-testid="button-collapse-sidebar"
          >
            <PanelLeftClose className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex flex-col items-center mb-4">
          <img
            src={theme.logo}
            alt="Logo"
            className={`h-14 mb-3 ${theme.logoInvert ? "brightness-0 invert" : ""}`}
          />
          <h1 className="text-white font-bold text-sm text-center" data-testid="text-app-title">{theme.appTitle}</h1>
        </div>
        <div className="flex justify-center">
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium ${statusConfig.pulse ? "animate-pulse-status" : ""}`}
            style={{ backgroundColor: statusConfig.bg + "30", color: statusConfig.text }}
            data-testid="status-agent"
          >
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusConfig.bg }} />
            {statusLabel}
          </div>
        </div>
      </div>
      <div className="border-t border-white/10" />

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-0.5">
          {conversationsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-white/40" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-10 px-4">
              <MessageSquare className="w-8 h-8 text-white/20 mx-auto mb-2" />
              <p className="text-xs text-white/40">
                {t.noConversations}
              </p>
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                className={`rounded-md transition-all duration-150 ${
                  fadingOutConvId === conv.id || fadingOutAll ? "opacity-0 scale-95" : "opacity-100"
                }`}
                data-testid={`conversation-item-${conv.id}`}
              >
                {deletingConvId === conv.id ? (
                  <div className="px-3 py-2.5 rounded-md border" style={{ backgroundColor: "#C6282820", borderColor: "#C6282840" }}>
                    <p className="text-[11px] font-medium mb-2" style={{ color: "#FF8A80" }}>{t.deleteSession}</p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-6 text-[11px] px-2.5"
                        onClick={() => handleDeleteConversation(conv.id)}
                        data-testid={`button-confirm-delete-${conv.id}`}
                      >
                        {t.yesDelete}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-[11px] px-2.5 text-white/60 hover:text-white hover:bg-white/10"
                        onClick={() => setDeletingConvId(null)}
                        data-testid={`button-cancel-delete-${conv.id}`}
                      >
                        {t.cancel}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="group flex items-center gap-1 rounded-md px-2 py-2 cursor-pointer text-sm transition-colors"
                    style={{
                      backgroundColor: activeConversationId === conv.id ? theme.secondary : "transparent",
                      color: activeConversationId === conv.id ? "#ffffff" : "rgba(255,255,255,0.6)",
                    }}
                    onClick={() => editingConvId !== conv.id && setActiveConversationId(conv.id)}
                    onMouseEnter={(e) => { if (activeConversationId !== conv.id) e.currentTarget.style.backgroundColor = theme.secondary + "50"; }}
                    onMouseLeave={(e) => { if (activeConversationId !== conv.id) e.currentTarget.style.backgroundColor = "transparent"; }}
                  >
                    <div className={`flex items-center gap-0.5 transition-opacity flex-shrink-0 ${activeConversationId === conv.id ? "opacity-80" : "opacity-50 group-hover:opacity-100"}`}>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-5 w-5 text-white/60 hover:text-teal-300 hover:bg-white/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingConvId(conv.id);
                          setEditTitle(conv.title);
                        }}
                        data-testid={`button-rename-conversation-${conv.id}`}
                      >
                        <Pencil className="w-2.5 h-2.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-5 w-5 text-white/60 hover:text-red-400 hover:bg-white/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingConvId(conv.id);
                        }}
                        data-testid={`button-delete-conversation-${conv.id}`}
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </Button>
                    </div>
                    <div className="flex-1 min-w-0">
                      {editingConvId === conv.id ? (
                        <input
                          autoFocus
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") { e.preventDefault(); handleSaveRename(conv.id); }
                            if (e.key === "Escape") { e.preventDefault(); setEditingConvId(null); }
                          }}
                          onBlur={() => handleSaveRename(conv.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full bg-white/10 text-white text-[12px] rounded px-2 py-0.5 outline-none border border-white/20"
                          data-testid={`input-rename-${conv.id}`}
                        />
                      ) : (
                        <>
                          <span className="text-[13px] block truncate">{conv.title}</span>
                          <span className="text-[10px] opacity-50">{new Date(conv.createdAt).toLocaleDateString()}</span>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
      <div className="border-t border-white/10" />
      <div className="p-3 space-y-2">
        {conversations.length > 0 && (
          <>
            {showClearAllConfirm ? (
              <div className="px-2 py-2 rounded-md border" style={{ backgroundColor: "#C6282820", borderColor: "#C6282840" }}>
                <p className="text-[11px] font-medium mb-2" style={{ color: "#FF8A80" }}>{t.deleteAllSessions}</p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-6 text-[11px] px-2.5"
                    onClick={handleDeleteAllConversations}
                    data-testid="button-confirm-clear-all"
                  >
                    {t.yesDeleteAll}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-[11px] px-2.5 text-white/60 hover:text-white hover:bg-white/10"
                    onClick={() => setShowClearAllConfirm(false)}
                    data-testid="button-cancel-clear-all"
                  >
                    {t.cancel}
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-center gap-1.5 text-[11px] text-white/40 hover:text-red-400 hover:bg-white/10"
                onClick={() => setShowClearAllConfirm(true)}
                data-testid="button-clear-all-sessions"
              >
                <Trash2 className="w-3 h-3" />
                {t.clearAllSessions}
              </Button>
            )}
          </>
        )}
        <Button
          onClick={handleNewChat}
          className="w-full justify-center gap-2 font-medium text-white ripple-button"
          size="sm"
          style={{ backgroundColor: theme.primary }}
          data-testid="button-new-chat"
        >
          <Plus className="w-4 h-4" />
          {agentMode === "data-model" ? t.newChatDataModel : agentMode === "insights" ? t.newChatInsights : agentMode === "nudge" ? t.newChatNudge : agentMode === "bi" ? t.newChatBi : t.newChatDataManagement}
        </Button>
      </div>
    </div>
  );
}



export default function ChatPage() {
  const [, navigate] = useLocation();
  const { currentEntity } = useEntity();
  const theme = useBranding();
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const isMobile = useIsMobile();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(240);
  const sidebarDragRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [lang, setLang] = useState<Lang>("en");

  const t = translations[lang];
  const isRtl = lang === "ar";

  const [resultRows, setResultRows] = useState<ResultRow[]>([]);
  const [includedAnalyses, setIncludedAnalyses] = useState<AnalysisType[]>([]);
  const [sessionFieldNames, setSessionFieldNames] = useState<string[] | null>(null);
  const [sessionRowCount, setSessionRowCount] = useState<number>(0);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [summaryOverrides, setSummaryOverrides] = useState<Record<number, string>>({});
  const [dataModels, setDataModels] = useState<Record<number, DataModelJSON>>({});
  const [latestDataModel, setLatestDataModel] = useState<DataModelJSON | null>(null);
  const [piiScans, setPiiScans] = useState<Record<number, PiiScanResult>>({});
  const [latestPiiScan, setLatestPiiScan] = useState<PiiScanResult | null>(null);
  const [dqAnalyses, setDqAnalyses] = useState<Record<number, DqAnalysisResult>>({});
  const [latestDqAnalysis, setLatestDqAnalysis] = useState<DqAnalysisResult | null>(null);
  const [informaticaOutputs, setInformaticaOutputs] = useState<Record<number, InformaticaOutput>>({});
  const [classificationForMessage, setClassificationForMessage] = useState<Record<number, ClassificationItem[]>>({});
  const [latestInformaticaOutput, setLatestInformaticaOutput] = useState<InformaticaOutput | null>(null);

  const [insightsReports, setInsightsReports] = useState<{ report: InsightsReport; fileName: string; timestamp: string; excelFileName: string; columns: BackendColumnProfile[] }[]>([]);
  const [insightsForMessage, setInsightsForMessage] = useState<Record<number, InsightsReport>>({});
  const [isInsightsMode, setIsInsightsMode] = useState(false);
  const [profiledColumns, setProfiledColumns] = useState<BackendColumnProfile[]>([]);
  const profiledColumnsRef = useRef<BackendColumnProfile[]>([]);

  const [collapsedThreads, setCollapsedThreads] = useState<Set<number>>(new Set());

  const [agentStatus, setAgentStatus] = useState<AgentStatus>("idle");
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
  const [thinkingSteps, setThinkingSteps] = useState<ThinkingStep[]>([]);
  const [pendingAutoTypes, setPendingAutoTypes] = useState<CommandType[]>([]);
  const [completedStepsForMessage, setCompletedStepsForMessage] = useState<Record<number, ThinkingStep[]>>({});
  const [timeTick, setTimeTick] = useState<number>(Date.now());
  const [mobileOutputsOpen, setMobileOutputsOpen] = useState(false);

  const [deletingConvId, setDeletingConvId] = useState<number | null>(null);
  const [fadingOutConvId, setFadingOutConvId] = useState<number | null>(null);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);
  const [fadingOutAll, setFadingOutAll] = useState(false);
  const [editingConvId, setEditingConvId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [outputsPanelCollapsed, setOutputsPanelCollapsed] = useState(false);
  const [agentMode, setAgentMode] = useState<AgentMode>("data-classification");
  const [referenceDocuments, setReferenceDocuments] = useState<Array<{
    id: string;
    filename: string;
    fileType: "pdf" | "text";
    content: string;
    sizeKb: number;
    uploadedAt: string;
  }>>([]);
  const [refDocError, setRefDocError] = useState<string | null>(null);
  const [aiProvider, setAiProvider] = useState<"claude" | "local">("local");
  const [pageVisibility, setPageVisibility] = useState<PageVisibility>({ ...DEFAULT_VISIBILITY });

  // Fetch page visibility from DB when entity changes
  useEffect(() => {
    if (currentEntity) {
      fetch(apiUrl(`/api/entities/${currentEntity.id}/page-visibility`))
        .then((res) => res.ok ? res.json() : null)
        .then((data) => { if (data) setPageVisibility((prev) => ({ ...prev, ...data })); })
        .catch(() => {});
    } else {
      setPageVisibility({ ...DEFAULT_VISIBILITY });
    }
  }, [currentEntity?.id]);

  // Re-read settings when window regains focus
  useEffect(() => {
    const onFocus = () => {
      if (currentEntity) {
        fetch(apiUrl(`/api/entities/${currentEntity.id}/page-visibility`))
          .then((res) => res.ok ? res.json() : null)
          .then((data) => { if (data) setPageVisibility((prev) => ({ ...prev, ...data })); })
          .catch(() => {});
      } else {
        setPageVisibility({ ...DEFAULT_VISIBILITY });
      }
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [currentEntity?.id]);
  useEffect(() => { sessionStorage.setItem("ai-provider", aiProvider); }, [aiProvider]);
  const refDocInputRef = useRef<HTMLInputElement>(null);
  const refDocErrorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [nudgeReports, setNudgeReports] = useState<Record<number, NudgeReport>>({});
  const [biReports, setBiReports] = useState<Record<number, BiReport>>({});
  const [biActiveTab, setBiActiveTab] = useState<BiTabKey>("sharing");
  const [biFile, setBiFile] = useState<File | null>(null);
  const [biRows, setBiRows] = useState<Record<string, unknown>[]>([]);
  const [biFields, setBiFields] = useState<string[]>([]);
  const [biStakeholder, setBiStakeholder] = useState("");
  const [biBusinessQuestion, setBiBusinessQuestion] = useState("");
  const [biAudience, setBiAudience] = useState("Internal ZATCA Team");
  const [biDashboardType, setBiDashboardType] = useState("Analytical");
  const [biReportPurpose, setBiReportPurpose] = useState("");
  const [biReportFormat, setBiReportFormat] = useState("Mixed");
  const [biTestDepth, setBiTestDepth] = useState("Standard");
  const [biTestCategories, setBiTestCategories] = useState<string[]>(["Data completeness", "Data accuracy", "Business rules", "Edge cases", "Security & governance", "Performance thresholds", "Formatting & presentation"]);
  const [biVisualsList, setBiVisualsList] = useState("");
  const [biDashDesc, setBiDashDesc] = useState("");
  const [biLoading, setBiLoading] = useState(false);
  const [biLoadingStep, setBiLoadingStep] = useState(0);
  const [biError, setBiError] = useState<string | null>(null);
  const biFileInputRef = useRef<HTMLInputElement>(null);
  const biAbortRef = useRef<AbortController | null>(null);
  const [textInputMode, setTextInputMode] = useState(false);
  const [pastedText, setPastedText] = useState("");
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [showExcelPreview, setShowExcelPreview] = useState(false);
  const [previewResultFile, setPreviewResultFile] = useState<File | null>(null);
  const [chatError, setChatError] = useState<{ message: string; retry: () => void } | null>(null);
  const [pageMismatch, setPageMismatch] = useState<{ message: string; targetMode: AgentMode; targetLabel: string } | null>(null);
  const [wasCancelled, setWasCancelled] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const streamingDetectedIntentRef = useRef<string | null>(null);
  const [messageIntents, setMessageIntents] = useState<Record<number, string>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastRequestRef = useRef<{ content: string; file?: File | null; extraText?: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isTouchDevice = useTouchDevice();
  const { toast } = useToast();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const promptParam = params.get("prompt");
    const modeParam = params.get("mode") as AgentMode | "data-management" | null;
    if (promptParam) setInputValue(promptParam);
    if (modeParam === "data-management") setAgentMode("data-classification");
    else if (modeParam && [...DM_SUB_MODES, "data-model", "insights", "nudge", "bi"].includes(modeParam)) setAgentMode(modeParam as AgentMode);
    if (promptParam || modeParam) history.replaceState({}, "", window.location.pathname);
  }, []);

  const { data: conversations = [], isLoading: conversationsLoading } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations", agentMode],
    queryFn: () => fetch(apiUrl(`/api/conversations?agentMode=${agentMode}`)).then(r => r.json()),
  });

  const { data: activeConversation } = useQuery<Conversation & { messages: Message[] }>({
    queryKey: ["/api/conversations", activeConversationId],
    enabled: !!activeConversationId,
  });

  const createConversation = useMutation({
    mutationFn: async (title: string) => {
      const res = await apiRequest("POST", "/api/conversations", { title, agentMode });
      return res.json();
    },
    onSuccess: (data: Conversation) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", agentMode] });
      setActiveConversationId(data.id);
    },
  });

  const deleteConversation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/conversations/${id}`);
    },
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", agentMode] });
      if (activeConversationId === deletedId) {
        setActiveConversationId(null);
        resetResultState();
      }
    },
    onSettled: () => {
      setFadingOutConvId(null);
      setDeletingConvId(null);
    },
  });

  const deleteAllConversations = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/conversations/all?agentMode=${agentMode}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", agentMode] });
      setActiveConversationId(null);
      resetResultState();
    },
    onSettled: () => {
      setShowClearAllConfirm(false);
      setFadingOutAll(false);
    },
  });

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [activeConversation?.messages, streamingContent, scrollToBottom]);

  useEffect(() => {
    resetResultState(true);
    setCollapsedThreads(new Set());
  }, [activeConversationId]);

  useEffect(() => {
    if (agentStatus !== "executing") return;
    const interval = setInterval(() => setTimeTick(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [agentStatus]);

  useEffect(() => {
    if (!activeConversation?.messages) return;
    const overrides: Record<number, string> = {};
    const modelMap: Record<number, DataModelJSON> = {};
    const piiMap: Record<number, PiiScanResult> = {};
    const insightsMap: Record<number, InsightsReport> = {};
    const dqMap: Record<number, DqAnalysisResult> = {};
    const informaticaMap: Record<number, InformaticaOutput> = {};
    const classificationMap: Record<number, ClassificationItem[]> = {};
    let lastModel: DataModelJSON | null = null;
    let lastPii: PiiScanResult | null = null;
    let lastDq: DqAnalysisResult | null = null;
    let lastInformatica: InformaticaOutput | null = null;
    let accumulatedRows: ResultRow[] = [];
    const accumulatedAnalyses = new Set<AnalysisType>();
    let restoredFileName: string | null = null;
    for (const msg of activeConversation.messages) {
      if (msg.role === "user") {
        const uploadMatch = msg.content.match(/Uploaded:\s*(.+)/);
        if (uploadMatch) restoredFileName = uploadMatch[1].trim();
        continue;
      }
      if (msg.role !== "assistant") continue;
      const insights = detectInsightsJSON(msg.content);
      const msgParts: string[] = [];
      if (insights) {
        insightsMap[msg.id] = insights;
        msgParts.push(t.insightsReportGenerated);
      } else if (looksLikeInsightsJSON(msg.content)) {
        msgParts.push(t.insightsReportGenerated);
      }
      const piiScan = detectPiiScanJSON(msg.content);
      if (piiScan) {
        piiMap[msg.id] = piiScan;
        lastPii = piiScan;
        msgParts.push(generatePiiScanSummary(piiScan));
      }
      const dqResult = detectDqAnalysisJSON(msg.content);
      if (dqResult) {
        dqMap[msg.id] = dqResult;
        lastDq = dqResult;
        msgParts.push(generateDqAnalysisSummary(dqResult));
      }
      const informaticaResult = detectInformaticaJSON(msg.content);
      if (informaticaResult) {
        informaticaMap[msg.id] = informaticaResult;
        lastInformatica = informaticaResult;
        msgParts.push(generateInformaticaSummary(informaticaResult));
      }
      const msgModel = detectDataModelJSON(msg.content);
      if (msgModel) {
        modelMap[msg.id] = msgModel;
        lastModel = msgModel;
        const factCount = msgModel.fact_tables.length;
        const dimCount = msgModel.dimension_tables.length;
        const relCount = msgModel.relationships.length;
        const tf = [...msgModel.fact_tables, ...msgModel.dimension_tables].reduce((acc, tbl) => acc + tbl.fields.length, 0);
        msgParts.push(`✅ Analytical data model "${msgModel.model_name}" generated — ${factCount} fact table${factCount !== 1 ? "s" : ""}, ${dimCount} dimension table${dimCount !== 1 ? "s" : ""}, ${relCount} relationship${relCount !== 1 ? "s" : ""}, ${tf} total fields.\n\nSheets added to result.xlsx: data_model_fields, data_model_relationships, data_model_ddl`);
      }
      const msgClassification = detectClassificationJSON(msg.content);
      if (msgClassification && Object.keys(msgClassification.fieldData).length > 0) {
        msgParts.push(`✅ Data classification completed for ${Object.keys(msgClassification.fieldData).length} fields.\n\nResults saved to result.xlsx — Sheet: data_classification`);
        const classItems: ClassificationItem[] = Object.entries(msgClassification.fieldData).map(([name, cols]) => ({
          field_name: name,
          classification_level: cols.classification_level || "",
          impact_level: cols.impact_level || "",
          impact_category: cols.impact_category || "",
          justification: cols.justification || "",
          is_pii_under_pdpl: cols.is_pii_under_pdpl || "",
          recommended_controls: cols.recommended_controls || "",
          requires_human_review: false,
          human_reviewed: false,
          human_override_level: "",
        }));
        classificationMap[msg.id] = classItems;
        accumulatedRows = mergeResults(accumulatedRows, [msgClassification]);
        accumulatedAnalyses.add("data_classification");
      }
      const msgBusinessDef = detectBusinessDefJSON(msg.content);
      if (msgBusinessDef && Object.keys(msgBusinessDef.fieldData).length > 0) {
        msgParts.push(`✅ Business definitions generated for ${Object.keys(msgBusinessDef.fieldData).length} fields.\n\nResults saved to result.xlsx — Sheet: business_definitions`);
        accumulatedRows = mergeResults(accumulatedRows, [msgBusinessDef]);
        accumulatedAnalyses.add("business_definitions");
      }
      const rawResults = detectAndExtractAllAnalyses(msg.content);
      const results = (dqResult ? rawResults.filter(r => r.analysisType !== "data_quality") : rawResults)
        .filter(r => !(msgBusinessDef && r.analysisType === "business_definitions"))
        .filter(r => !(msgClassification && r.analysisType === "data_classification"));
      if (results.length > 0) {
        for (const result of results) {
          if (result.analysisType === "data_quality" && result.dqMultiRows && result.dqMultiRows.length > 0) {
            accumulatedRows = mergeDqResults(accumulatedRows, result.dqMultiRows);
          } else if (Object.keys(result.fieldData).length > 0) {
            accumulatedRows = mergeResults(accumulatedRows, [result]);
          }
          accumulatedAnalyses.add(result.analysisType);
        }
        const totalFields = new Set(
          results.flatMap(r => [
            ...Object.keys(r.fieldData),
            ...(r.dqMultiRows?.map(dr => dr.fieldName) || [])
          ])
        ).size;
        msgParts.push(generateAnalysisSummary(results, totalFields));
      }
      if (msgParts.length === 0) continue;
      overrides[msg.id] = msgParts.join("\n\n");
    }
    if (accumulatedRows.length > 0) {
      setResultRows(accumulatedRows);
    }
    if (accumulatedAnalyses.size > 0) {
      setIncludedAnalyses(Array.from(accumulatedAnalyses));
    }
    if (restoredFileName) {
      setUploadedFileName(restoredFileName);
    }
    if (Object.keys(modelMap).length > 0) {
      setDataModels(prev => ({ ...prev, ...modelMap }));
      setLatestDataModel(lastModel);
    }
    if (Object.keys(piiMap).length > 0) {
      setPiiScans(prev => ({ ...prev, ...piiMap }));
      setLatestPiiScan(lastPii);
    }
    if (Object.keys(dqMap).length > 0) {
      setDqAnalyses(prev => ({ ...prev, ...dqMap }));
      setLatestDqAnalysis(lastDq);
    }
    if (Object.keys(informaticaMap).length > 0) {
      setInformaticaOutputs(prev => ({ ...prev, ...informaticaMap }));
      setLatestInformaticaOutput(lastInformatica);
    }
    if (Object.keys(classificationMap).length > 0) {
      setClassificationForMessage(prev => ({ ...prev, ...classificationMap }));
    }
    if (Object.keys(insightsMap).length > 0) {
      setInsightsForMessage(prev => ({ ...prev, ...insightsMap }));
      const rehydrated = Object.entries(insightsMap).map(([, report]) => {
        const pad = (n: number) => String(n).padStart(2, "0");
        const now = new Date();
        const ts = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
        return { report, fileName: uploadedFileName || "data.xlsx", timestamp: ts, excelFileName: `insights_report_${ts}.xlsx`, columns: [] as BackendColumnProfile[] };
      });
      setInsightsReports(rehydrated);
    }
    if (Object.keys(overrides).length > 0) {
      setSummaryOverrides(prev => ({ ...prev, ...overrides }));
    }

    const rebuiltLog: ActivityLogEntry[] = [];
    const fmtTs = (iso: string) => {
      const d = new Date(iso);
      return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    };
    for (const msg of activeConversation.messages) {
      const ts = msg.createdAt ? fmtTs(msg.createdAt) : "";
      if (msg.role === "user") {
        const text = msg.content.replace(/\n\nUploaded:.*$/, "").replace(/\n\n--- Pasted Data ---[\s\S]*$/, "").trim();
        rebuiltLog.push({ icon: "📤", text: `${t.commandLabel} ${text.substring(0, 50)}${text.length > 50 ? "…" : ""}`, timestamp: ts });
        const uploadMatch = msg.content.match(/Uploaded:\s*(.+)/);
        if (uploadMatch) {
          rebuiltLog.push({ icon: "📥", text: `${t.fileUploaded}: ${uploadMatch[1].trim()}`, timestamp: ts });
        }
      } else {
        if (msg.content.includes("__NUDGE_REPORT_ID_")) {
          rebuiltLog.push({ icon: "🎯", text: lang === "ar" ? "اكتمل تحليل التحفيز" : "Nudge analysis complete", timestamp: ts });
          continue;
        }
        if (msg.content.includes("__BI_REPORT_ID_")) {
          rebuiltLog.push({ icon: "📊", text: lang === "ar" ? "اكتمل تحليل BI" : "BI analysis complete", timestamp: ts });
          continue;
        }
        if (detectInsightsJSON(msg.content) || looksLikeInsightsJSON(msg.content)) {
          rebuiltLog.push({ icon: "📊", text: t.tagInsights, timestamp: ts });
        }
        if (detectPiiScanJSON(msg.content)) {
          rebuiltLog.push({ icon: "🛡️", text: t.tagPiiScan, timestamp: ts });
        }
        if (detectDqAnalysisJSON(msg.content)) {
          rebuiltLog.push({ icon: "🔬", text: t.tagDataQuality, timestamp: ts });
        }
        if (detectDataModelJSON(msg.content)) {
          rebuiltLog.push({ icon: "🏗️", text: t.tagDataModel, timestamp: ts });
        }
        if (detectInformaticaJSON(msg.content)) {
          rebuiltLog.push({ icon: "🔧", text: t.tagInformatica, timestamp: ts });
        }
        const analyses = detectAndExtractAllAnalyses(msg.content);
        for (const r of analyses) {
          if (r.analysisType === "data_classification") rebuiltLog.push({ icon: "📋", text: t.tagDataClassification, timestamp: ts });
          else if (r.analysisType === "business_definitions") rebuiltLog.push({ icon: "📖", text: t.tagBusinessDefs, timestamp: ts });
        }
      }
    }
    if (rebuiltLog.length > 0) {
      setActivityLog(rebuiltLog);
    }
  }, [activeConversation?.messages]);

  const addActivityEntry = useCallback((icon: string, text: string, messageId?: number) => {
    const now = new Date();
    const ts = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    setActivityLog(prev => [...prev, { icon, text, timestamp: ts, messageId }]);
  }, []);

  const getThinkingStepsForCommand = useCallback((content: string): ThinkingStep[] => {
    const now = Date.now();
    return inferStepsForCommand(content, t).map((step, i) => ({
      ...step,
      status: i === 0 ? "active" as const : "pending" as const,
      ...(i === 0 ? { startedAt: now } : {}),
    }));
  }, [t]);

  const resetResultState = (clearActivity = false) => {
    setResultRows([]);
    setIncludedAnalyses([]);
    setSessionFieldNames(null);
    setSessionRowCount(0);
    setUploadedFileName(null);
    setSummaryOverrides({});
    setDataModels({});
    setLatestDataModel(null);
    setPiiScans({});
    setLatestPiiScan(null);
    setDqAnalyses({});
    setLatestDqAnalysis(null);
    setInformaticaOutputs({});
    setLatestInformaticaOutput(null);
    setInsightsReports([]);
    setInsightsForMessage({});
    setIsInsightsMode(false);
    setProfiledColumns([]);
    profiledColumnsRef.current = [];
    if (clearActivity) setActivityLog([]);
  };

  const processAIResponse = (content: string, messageId?: number) => {
    const summaryParts: string[] = [];
    const toastParts: string[] = [];

    const insightsReport = detectInsightsJSON(content);
    if (insightsReport) {
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      const ts = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
      const srcFile = uploadedFileName || "data.xlsx";
      const cols = profiledColumnsRef.current;
      const excelFileName = generateInsightsExcel(insightsReport, srcFile, cols);
      setInsightsReports(prev => [...prev, { report: insightsReport, fileName: srcFile, timestamp: ts, excelFileName, columns: cols }]);
      if (messageId) {
        setInsightsForMessage(prev => ({ ...prev, [messageId]: insightsReport }));
      }
      summaryParts.push(t.insightsReportGenerated);
      toastParts.push(t.insightsToast(insightsReport.report_title));
    }

    const piiScan = detectPiiScanJSON(content);
    if (piiScan) {
      setLatestPiiScan(piiScan);
      if (messageId) {
        setPiiScans(prev => ({ ...prev, [messageId]: piiScan }));
      }
      summaryParts.push(generatePiiScanSummary(piiScan));
      toastParts.push(t.piiScanToast(piiScan.scan_summary.pii_columns_found));
    }

    const dqResult = detectDqAnalysisJSON(content);
    if (dqResult) {
      setLatestDqAnalysis(dqResult);
      setIncludedAnalyses(prev => {
        const updated = [...prev];
        if (!updated.includes("data_quality")) updated.push("data_quality");
        return updated;
      });
      if (messageId) {
        setDqAnalyses(prev => ({ ...prev, [messageId]: dqResult }));
      }
      summaryParts.push(generateDqAnalysisSummary(dqResult));
      toastParts.push(`${dqResult.analysis_summary.total_rules_generated} DQ rules generated across ${dqResult.analysis_summary.total_fields_analyzed} fields`);
    }

    const informaticaResult = detectInformaticaJSON(content);
    if (informaticaResult) {
      setLatestInformaticaOutput(informaticaResult);
      if (messageId) {
        setInformaticaOutputs(prev => ({ ...prev, [messageId]: informaticaResult }));
      }
      summaryParts.push(generateInformaticaSummary(informaticaResult));
      const fieldCount = Object.keys(informaticaResult.descriptions).length;
      toastParts.push(`Informatica output generated for ${fieldCount} fields`);
    }

    const model = detectDataModelJSON(content);
    if (model) {
      setLatestDataModel(model);
      if (messageId) {
        setDataModels(prev => ({ ...prev, [messageId]: model }));
      }
      const factCount = model.fact_tables.length;
      const dimCount = model.dimension_tables.length;
      const relCount = model.relationships.length;
      const totalFields = [...model.fact_tables, ...model.dimension_tables].reduce((acc, tbl) => acc + tbl.fields.length, 0);
      summaryParts.push(`✅ Analytical data model "${model.model_name}" generated — ${factCount} fact table${factCount !== 1 ? "s" : ""}, ${dimCount} dimension table${dimCount !== 1 ? "s" : ""}, ${relCount} relationship${relCount !== 1 ? "s" : ""}, ${totalFields} total fields.\n\nSheets added to result.xlsx: data_model_fields, data_model_relationships, data_model_ddl`);
      toastParts.push(t.dataModelToast(model.model_name));
    }

    const classificationResult = detectClassificationJSON(content);
    if (classificationResult && Object.keys(classificationResult.fieldData).length > 0) {
      setResultRows((prev) => mergeResults(prev, [classificationResult]));
      setIncludedAnalyses((prev) => prev.includes("data_classification") ? prev : [...prev, "data_classification"]);
      const fieldCount = Object.keys(classificationResult.fieldData).length;
      summaryParts.push(`✅ Data classification completed for ${fieldCount} fields.\n\nResults saved to result.xlsx — Sheet: data_classification`);
      toastParts.push(`${fieldCount} fields classified`);

      if (messageId) {
        const classItems: ClassificationItem[] = Object.entries(classificationResult.fieldData).map(([name, cols]) => ({
          field_name: name,
          classification_level: cols.classification_level || "",
          impact_level: cols.impact_level || "",
          impact_category: cols.impact_category || "",
          justification: cols.justification || "",
          is_pii_under_pdpl: cols.is_pii_under_pdpl || "",
          recommended_controls: cols.recommended_controls || "",
          requires_human_review: false,
          human_reviewed: false,
          human_override_level: "",
        }));
        setClassificationForMessage(prev => ({ ...prev, [messageId]: classItems }));
      }
    }

    const businessDefResult = detectBusinessDefJSON(content);
    if (businessDefResult && Object.keys(businessDefResult.fieldData).length > 0) {
      setResultRows((prev) => mergeResults(prev, [businessDefResult]));
      setIncludedAnalyses((prev) => prev.includes("business_definitions") ? prev : [...prev, "business_definitions"]);
      summaryParts.push(`✅ Business definitions generated for ${Object.keys(businessDefResult.fieldData).length} fields.\n\nResults saved to result.xlsx — Sheet: business_definitions`);
      toastParts.push(`${Object.keys(businessDefResult.fieldData).length} business definitions generated`);
    }

    const rawAnalysisResults = detectAndExtractAllAnalyses(content);
    const analysisResults = (dqResult ? rawAnalysisResults.filter(r => r.analysisType !== "data_quality") : rawAnalysisResults)
      .filter(r => !(businessDefResult && r.analysisType === "business_definitions"))
      .filter(r => !(classificationResult && r.analysisType === "data_classification"));
    if (analysisResults.length > 0) {
      const newTypes: AnalysisType[] = [];

      for (const result of analysisResults) {
        if (result.analysisType === "data_quality" && result.dqMultiRows && result.dqMultiRows.length > 0) {
          setResultRows((prev) => mergeDqResults(prev, result.dqMultiRows!));
        } else if (Object.keys(result.fieldData).length > 0) {
          setResultRows((prev) => mergeResults(prev, [result]));
        }
        newTypes.push(result.analysisType);
      }

      setIncludedAnalyses((prev) => {
        const updated = [...prev];
        for (const typ of newTypes) {
          if (!updated.includes(typ)) updated.push(typ);
        }
        return updated;
      });

      const totalFields = new Set(
        analysisResults.flatMap(r => [
          ...Object.keys(r.fieldData),
          ...(r.dqMultiRows?.map(dr => dr.fieldName) || [])
        ])
      ).size;

      summaryParts.push(generateAnalysisSummary(analysisResults, totalFields));
      const labels = newTypes.map((typ) => getAnalysisLabel(typ)).join(", ");
      toastParts.push(t.analysisToast(labels));
    }

    if (summaryParts.length === 0) return;

    const combinedSummary = summaryParts.join("\n\n");
    if (messageId) {
      setSummaryOverrides(prev => ({ ...prev, [messageId]: combinedSummary }));
    }

    toast({
      title: t.toastUpdated,
      description: toastParts.join(" | "),
    });
  };

  const handleBiFile = useCallback(async (f: File | null | undefined) => {
    if (!f) return;
    setBiError(null);
    try {
      const parsed = await parseBiExcelFile(f);
      if (!parsed.length) throw new Error("File appears empty.");
      setBiFile(f);
      setBiRows(parsed);
      setBiFields(Object.keys(parsed[0]));
    } catch (e: unknown) {
      setBiError("Could not read file: " + (e instanceof Error ? e.message : String(e)));
    }
  }, []);

  const biRunAnalysis = async () => {
    if (!biFields.length) return;
    setBiLoading(true);
    setBiError(null);
    setBiLoadingStep(0);
    setAgentStatus("thinking");

    const tabDef = BI_TABS.find(t => t.key === biActiveTab)!;

    const controller = new AbortController();
    biAbortRef.current = controller;

    const stepInterval = setInterval(() => {
      setBiLoadingStep(prev => Math.min(prev + 1, tabDef.steps.length - 1));
    }, 2500);

    let conversationId = activeConversationId;
    if (!conversationId) {
      const inputLabel = biActiveTab === "sharing" ? biStakeholder : biActiveTab === "dashboard" ? biBusinessQuestion : biActiveTab === "report" ? biReportPurpose : biActiveTab === "testcases" ? biReportPurpose : biDashDesc;
      const title = `[BI] ${tabDef.label}: ${(inputLabel || "Analysis").substring(0, 40)}`;
      const newConv = await createConversation.mutateAsync(title);
      conversationId = newConv.id;
    }

    const userMsgId = Date.now();
    const assistantMsgId = userMsgId + 1;
    const inputLabel = biActiveTab === "sharing" ? biStakeholder : biActiveTab === "dashboard" ? biBusinessQuestion : biActiveTab === "report" ? biReportPurpose : biActiveTab === "testcases" ? biReportPurpose : biDashDesc;
    const userContent = `${tabDef.icon} ${tabDef.label}: ${inputLabel || "Analysis"} (${biFile?.name || "file"})`;

    queryClient.setQueryData(
      ["/api/conversations", conversationId],
      (old: any) => {
        const userMsg = { id: userMsgId, conversationId, role: "user", content: userContent, createdAt: new Date().toISOString() };
        return old
          ? { ...old, messages: [...(old.messages || []), userMsg] }
          : { id: conversationId, title: userContent.substring(0, 50), messages: [userMsg] };
      }
    );

    setIsStreaming(true);

    const biStepsArr = lang === "ar" ? tabDef.stepsAr : tabDef.steps;
    setThinkingSteps(biStepsArr.map((label, i) => ({
      label,
      status: i === 0 ? "active" as const : "pending" as const,
      startedAt: i === 0 ? Date.now() : undefined,
    })));

    try {
      let body: Record<string, unknown> = { fields: biFields, sampleRows: biRows.slice(0, 10) };
      if (biActiveTab === "sharing") body.stakeholder = biStakeholder;
      if (biActiveTab === "dashboard") { body.businessQuestion = biBusinessQuestion; body.audience = biAudience; body.dashboardType = biDashboardType; }
      if (biActiveTab === "report") { body.stakeholder = biStakeholder; body.reportPurpose = biReportPurpose; body.reportFormat = biReportFormat; }
      if (biActiveTab === "testcases") { body.reportPurpose = biReportPurpose; body.testDepth = biTestDepth; body.testCategories = biTestCategories; }
      if (biActiveTab === "dashtest") { body.dashboardDescription = biDashDesc; body.visualsList = biVisualsList; body.audience = biAudience; body.testDepth = biTestDepth; }

      const resp = await fetch(tabDef.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearInterval(stepInterval);
      const data = await resp.json();
      if (!data.ok) throw new Error(data.error || "Analysis failed");

      const result = data.data as Record<string, unknown>;

      if (biActiveTab === "sharing") addSharingEligibilitySheet(result);
      if (biActiveTab === "dashboard") addDashboardDesignSheets(result);
      if (biActiveTab === "report") addReportTestSheet(result);
      if (biActiveTab === "testcases") addTestCaseSheets(result);
      if (biActiveTab === "dashtest") addDashboardTestSheet(result);

      const summaryText = `__BI_REPORT_ID_${assistantMsgId}__`;
      queryClient.setQueryData(
        ["/api/conversations", conversationId],
        (old: any) => {
          const assistantMsg = { id: assistantMsgId, conversationId, role: "assistant", content: summaryText, createdAt: new Date().toISOString() };
          return old ? { ...old, messages: [...(old.messages || []), assistantMsg] } : old;
        }
      );

      setBiReports(prev => ({ ...prev, [assistantMsgId]: { tab: biActiveTab, data: result } }));
      addActivityEntry(tabDef.icon, `${tabDef.label} complete`);
      setAgentStatus("done");
      setThinkingSteps(prev => prev.map(s => ({ ...s, status: "done" as const })));
    } catch (e: unknown) {
      clearInterval(stepInterval);
      if ((e as Error).name !== "AbortError") {
        setBiError("Analysis failed: " + (e instanceof Error ? e.message : String(e)));
      }
      setAgentStatus("idle");
    } finally {
      setBiLoading(false);
      setIsStreaming(false);
      setStreamingContent("");
      biAbortRef.current = null;
    }
  };

  const sendMessage = async (content: string, file?: File | null, extraText?: string) => {
    if (!content.trim() && !file && !extraText?.trim()) return;
    setChatError(null);
    setWasCancelled(false);
    lastRequestRef.current = { content, file, extraText };

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const finalContent = extraText?.trim()
      ? `${content}\n\n--- Pasted Data ---\n${extraText.trim()}`
      : content;

    let conversationId = activeConversationId;
    if (!conversationId) {
      const title = content.substring(0, 50) || t.newAnalysis;
      const newConv = await createConversation.mutateAsync(title);
      conversationId = newConv.id;
    }

    setIsStreaming(true);
    setStreamingContent("");
    setInputValue("");
    setSelectedFile(null);
    setPastedText("");
    setTextInputMode(false);
    setAgentStatus("thinking");
    setThinkingSteps(getThinkingStepsForCommand(content));
    addActivityEntry("📤", `${t.commandLabel} ${content.substring(0, 40)}...`);

    // Queue extra command types that need separate requests
    const requestedTypes = detectRequestedCommandTypes(finalContent);
    if (requestedTypes.length > 1) {
      setPendingAutoTypes(requestedTypes.slice(1));
    }

    if (agentMode === "nudge") {
      const userMsgId = Date.now();
      const assistantMsgId = userMsgId + 1;

      queryClient.setQueryData(
        ["/api/conversations", conversationId],
        (old: any) => {
          const userMsg = { id: userMsgId, conversationId, role: "user", content: finalContent, createdAt: new Date().toISOString() };
          return old
            ? { ...old, messages: [...(old.messages || []), userMsg] }
            : { id: conversationId, title: t.newAnalysis, messages: [userMsg] };
        }
      );

      const nudgeStepsArr = t.nudgeSteps as string[];
      let stepIdx = 0;
      setThinkingSteps(nudgeStepsArr.map((label, i) => ({
        label,
        status: i === 0 ? "active" as const : "pending" as const,
        startedAt: i === 0 ? Date.now() : undefined,
      })));

      const stepInterval = setInterval(() => {
        stepIdx = Math.min(stepIdx + 1, nudgeStepsArr.length - 1);
        setThinkingSteps(nudgeStepsArr.map((label, i) => ({
          label,
          status: i < stepIdx ? "done" as const : i === stepIdx ? "active" as const : "pending" as const,
        })));
      }, 900);

      try {
        const res = await fetch(apiUrl("/api/nudge"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: abortControllerRef.current?.signal,
          body: JSON.stringify({ scenario: finalContent }),
        });
        clearInterval(stepInterval);
        const json = await res.json();

        if (json.ok && json.data) {
          const nudgeReport = json.data as NudgeReport;
          const summaryText = `__NUDGE_REPORT_ID_${assistantMsgId}__`;

          queryClient.setQueryData(
            ["/api/conversations", conversationId],
            (old: any) => {
              const assistantMsg = { id: assistantMsgId, conversationId, role: "assistant", content: summaryText, createdAt: new Date().toISOString() };
              return old ? { ...old, messages: [...(old.messages || []), assistantMsg] } : old;
            }
          );

          setNudgeReports(prev => ({ ...prev, [assistantMsgId]: nudgeReport }));
          addActivityEntry("🎯", lang === "ar" ? "اكتمل تحليل التحفيز" : "Nudge analysis complete");
          setAgentStatus("done");
          setThinkingSteps(prev => prev.map(s => ({ ...s, status: "done" as const })));
        } else {
          setChatError({ message: t.nudgeErrorMsg as string, retry: () => { const r = lastRequestRef.current; if (r) sendMessage(r.content, r.file, r.extraText); } });
          setAgentStatus("idle");
        }
      } catch (err: any) {
        clearInterval(stepInterval);
        if (err?.name === "AbortError") {
          setWasCancelled(true);
          setAgentStatus("idle");
        } else {
          setChatError({ message: t.nudgeErrorMsg as string, retry: () => { const r = lastRequestRef.current; if (r) sendMessage(r.content, r.file, r.extraText); } });
          setAgentStatus("idle");
        }
      } finally {
        setIsStreaming(false);
        setStreamingContent("");
        abortControllerRef.current = null;
      }
      return;
    }

    queryClient.setQueryData(
      ["/api/conversations", conversationId],
      (old: any) => {
        const newMessage = {
          id: Date.now(),
          conversationId,
          role: "user",
          content: file ? `${finalContent}\n\nUploaded: ${file.name}` : finalContent,
          createdAt: new Date().toISOString(),
        };
        return old
          ? { ...old, messages: [...(old.messages || []), newMessage] }
          : { id: conversationId, title: t.newChat, messages: [newMessage] };
      }
    );

    try {
      const formData = new FormData();
      formData.append("content", finalContent);
      if (file) {
        formData.append("file", file);
      }
      if (isDmSubMode(agentMode) && referenceDocuments.length > 0) {
        const refDocsPayload = referenceDocuments.map(d => ({
          filename: d.filename,
          fileType: d.fileType,
          content: d.content,
        }));
        formData.append("refDocs", JSON.stringify(refDocsPayload));
      }
      formData.append("aiProvider", aiProvider);
      formData.append("agentMode", agentMode);
      if (currentEntity) formData.append("entityId", String(currentEntity.id));

      const response = await fetch(apiUrl(`/api/conversations/${conversationId}/messages`), {
        method: "POST",
        signal: abortControllerRef.current?.signal,
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to send message");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.pageMismatch) {
                  setIsStreaming(false);
                  setStreamingContent("");
                  await queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId] });
                  await queryClient.invalidateQueries({ queryKey: ["/api/conversations", agentMode] });
                  setPageMismatch({
                    message: data.pageMismatch.message,
                    targetMode: data.pageMismatch.targetMode as AgentMode,
                    targetLabel: data.pageMismatch.targetLabel,
                  });
                  return;
                }
                if (data.detectedIntent) {
                  streamingDetectedIntentRef.current = data.detectedIntent;
                }
                if (data.insightsMode) {
                  setIsInsightsMode(true);
                }
                if (data.profiledColumns) {
                  setProfiledColumns(data.profiledColumns);
                  profiledColumnsRef.current = data.profiledColumns;
                }
                if (data.fieldNames) {
                  setSessionFieldNames(data.fieldNames);
                  if (data.rowCount) setSessionRowCount(data.rowCount);
                  if (file) setUploadedFileName(file.name);
                }
                if (data.type === "error") {
                  setIsStreaming(false);
                  setStreamingContent("");
                  await queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId] });
                  await queryClient.invalidateQueries({ queryKey: ["/api/conversations", agentMode] });
                  setChatError({ message: normalizeProviderError(data.content || (lang === "ar" ? "حدث خطأ أثناء معالجة الصورة" : "An error occurred while processing the image.")), retry: () => { const r = lastRequestRef.current; if (r) sendMessage(r.content, r.file, r.extraText); } });
                  return;
                }
                if (data.content) {
                  accumulated += data.content;
                  setStreamingContent(accumulated);
                  setAgentStatus("executing");
                  setThinkingSteps(prev => {
                    const activeIdx = prev.findIndex(s => s.status === "active");
                    if (activeIdx >= 0 && activeIdx < prev.length - 1 && accumulated.length > (activeIdx + 1) * 500) {
                      const now = Date.now();
                      return prev.map((s, i) => {
                        if (i < activeIdx) return s;
                        if (i === activeIdx) return { ...s, status: "done" as const, completedAt: s.completedAt ?? now };
                        if (i === activeIdx + 1) return { ...s, status: "active" as const, startedAt: s.startedAt ?? now };
                        return s;
                      });
                    }
                    return prev;
                  });
                }
                if (data.done) {
                  setIsStreaming(false);
                  setStreamingContent("");
                  setIsInsightsMode(false);
                  setThinkingSteps(prev => {
                    const now = Date.now();
                    return prev.map(s => ({
                      ...s,
                      status: "done" as const,
                      ...(s.status === "active" && !s.completedAt ? { completedAt: now } : {}),
                    }));
                  });
                  setAgentStatus("done");

                  const detectedInsights = detectInsightsJSON(accumulated);
                  const detectedPii = detectPiiScanJSON(accumulated);
                  const detectedDq = detectDqAnalysisJSON(accumulated);
                  const detectedModel = detectDataModelJSON(accumulated);
                  const detectedBusinessDef = detectBusinessDefJSON(accumulated);
                  const detectedClassification = detectClassificationJSON(accumulated);
                  const analysisResults = detectAndExtractAllAnalyses(accumulated);
                  const hasAnyDetection = detectedInsights || detectedPii || detectedDq || detectedModel || detectedBusinessDef || detectedClassification || analysisResults.length > 0;
                  if (hasAnyDetection) {
                    processAIResponse(accumulated);

                    await queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId] });
                    await queryClient.invalidateQueries({ queryKey: ["/api/conversations", agentMode] });

                    const convData = queryClient.getQueryData<any>(["/api/conversations", conversationId]);
                    if (convData?.messages) {
                      const lastMsg = convData.messages[convData.messages.length - 1];
                      if (lastMsg?.role === "assistant") {
                        if (streamingDetectedIntentRef.current) {
                          setMessageIntents((prev: Record<number, string>) => ({ ...prev, [lastMsg.id]: streamingDetectedIntentRef.current! }));
                          streamingDetectedIntentRef.current = null;
                        }
                        setCompletedStepsForMessage(prev => ({
                          ...prev,
                          [lastMsg.id]: thinkingSteps.map(s => ({ ...s, status: "done" as const })),
                        }));
                        const msgSummaryParts: string[] = [];
                        if (detectedInsights) {
                          setInsightsForMessage(prev => ({ ...prev, [lastMsg.id]: detectedInsights }));
                          msgSummaryParts.push(t.insightsReportGenerated);
                          addActivityEntry("📊", t.tagInsights, lastMsg.id);
                        }
                        if (detectedPii) {
                          setPiiScans(prev => ({ ...prev, [lastMsg.id]: detectedPii }));
                          msgSummaryParts.push(generatePiiScanSummary(detectedPii));
                          addActivityEntry("🛡️", t.tagPiiScan, lastMsg.id);
                        }
                        if (detectedDq) {
                          setDqAnalyses(prev => ({ ...prev, [lastMsg.id]: detectedDq }));
                          msgSummaryParts.push(generateDqAnalysisSummary(detectedDq));
                          addActivityEntry("🔬", t.tagDataQuality, lastMsg.id);
                        }
                        if (detectedModel) {
                          setDataModels(prev => ({ ...prev, [lastMsg.id]: detectedModel }));
                          addActivityEntry("🏗️", t.tagDataModel, lastMsg.id);
                        }
                        if (detectedBusinessDef && Object.keys(detectedBusinessDef.fieldData).length > 0) {
                          addActivityEntry("📖", t.tagBusinessDefs, lastMsg.id);
                        }
                        if (detectedClassification && Object.keys(detectedClassification.fieldData).length > 0) {
                          const classItems: ClassificationItem[] = Object.entries(detectedClassification.fieldData).map(([name, cols]) => ({
                            field_name: name,
                            classification_level: cols.classification_level || "",
                            classification_code: cols.classification_code || "",
                            confidential_sub_level: cols.confidential_sub_level || "N/A",
                            impact_level: cols.impact_level || "",
                            impact_category: cols.impact_category || "",
                            justification: cols.justification || "",
                            is_pii_under_pdpl: cols.is_pii_under_pdpl || "",
                            recommended_controls: cols.recommended_controls || "",
                            requires_human_review: false,
                            human_reviewed: false,
                            human_override_level: "",
                          }));
                          setClassificationForMessage(prev => ({ ...prev, [lastMsg.id]: classItems }));
                        }
                        if (analysisResults.length > 0) {
                          const totalFields = new Set(
                            analysisResults.flatMap((r: any) => [
                              ...Object.keys(r.fieldData),
                              ...(r.dqMultiRows?.map((dr: any) => dr.fieldName) || [])
                            ])
                          ).size;
                          msgSummaryParts.push(generateAnalysisSummary(analysisResults, totalFields));
                          for (const r of analysisResults) {
                            if (r.analysisType === "data_classification") addActivityEntry("📋", t.tagDataClassification, lastMsg.id);
                            else if (r.analysisType === "business_definitions") addActivityEntry("📖", t.tagBusinessDefs, lastMsg.id);
                          }
                        }
                        if (msgSummaryParts.length > 0) {
                          const combined = msgSummaryParts.join("\n\n");
                          setSummaryOverrides(prev => ({ ...prev, [lastMsg.id]: combined }));
                        }
                      }
                    }
                  } else {
                    await queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId] });
                    await queryClient.invalidateQueries({ queryKey: ["/api/conversations", agentMode] });
                    const convData2 = queryClient.getQueryData<any>(["/api/conversations", conversationId]);
                    if (convData2?.messages) {
                      const lastMsg2 = convData2.messages[convData2.messages.length - 1];
                      if (lastMsg2?.role === "assistant") {
                        if (streamingDetectedIntentRef.current) {
                          setMessageIntents((prev: Record<number, string>) => ({ ...prev, [lastMsg2.id]: streamingDetectedIntentRef.current! }));
                          streamingDetectedIntentRef.current = null;
                        }
                        setCompletedStepsForMessage(prev => ({
                          ...prev,
                          [lastMsg2.id]: thinkingSteps.map(s => ({ ...s, status: "done" as const })),
                        }));
                      }
                    }
                  }

                  // Fire next pending auto-command if any (multi-command support)
                  setPendingAutoTypes(prev => {
                    if (prev.length === 0) return prev;
                    const [next, ...rest] = prev;
                    setTimeout(() => sendMessage(FOLLOW_UP_MESSAGES[next]), 400);
                    return rest;
                  });
                }
                if (data.error) {
                  setChatError({ message: normalizeProviderError(data.error || ""), retry: () => { const r = lastRequestRef.current; if (r) sendMessage(r.content, r.file, r.extraText); } });
                }
              } catch {}
            }
          }
        }
      }
    } catch (error: any) {
      if (error?.name === "AbortError") {
        setWasCancelled(true);
        setAgentStatus("idle");
      } else {
        setChatError({ message: t.toastErrorDesc, retry: () => { const r = lastRequestRef.current; if (r) sendMessage(r.content, r.file, r.extraText); } });
        setAgentStatus("idle");
      }
    } finally {
      setIsStreaming(false);
      setStreamingContent("");
      abortControllerRef.current = null;
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (isStreaming) return;
    sendMessage(inputValue, selectedFile, pastedText || undefined);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/gif",
      "image/webp",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv|pdf|png|jpe?g|gif|webp|docx)$/i)) {
      toast({ title: t.invalidFile, description: t.invalidFileDesc, variant: "destructive" });
      return;
    }

    if (sessionFieldNames && sessionFieldNames.length > 0 && (resultRows.length > 0 || latestDataModel || latestPiiScan || latestDqAnalysis)) {
      setPendingFile(file);
      setShowResetDialog(true);
    } else {
      setSelectedFile(file);
      addActivityEntry("📥", `${t.fileUploaded}: ${file.name}`);
    }
  };

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: t.cameraError, variant: "destructive" });
      return;
    }
    if (sessionFieldNames && sessionFieldNames.length > 0 && (resultRows.length > 0 || latestDataModel || latestPiiScan || latestDqAnalysis)) {
      setPendingFile(file);
      setShowResetDialog(true);
    } else {
      setSelectedFile(file);
    }
  };

  const handleResetConfirm = () => {
    resetResultState();
    setSelectedFile(pendingFile);
    setPendingFile(null);
    setShowResetDialog(false);
  };

  const handleResetCancel = () => {
    setPendingFile(null);
    setShowResetDialog(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFeatureCard = (prompt: string) => {
    sendMessage(prompt, selectedFile);
  };

  const renameConversation = useMutation({
    mutationFn: async ({ id, title }: { id: number; title: string }) => {
      await apiRequest("PATCH", `/api/conversations/${id}`, { title });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", agentMode] });
      setEditingConvId(null);
    },
  });

  const showRefDocError = (msg: string) => {
    setRefDocError(msg);
    if (refDocErrorTimerRef.current) clearTimeout(refDocErrorTimerRef.current);
    refDocErrorTimerRef.current = setTimeout(() => setRefDocError(null), 4000);
  };

  const handleAddDocument = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (refDocInputRef.current) refDocInputRef.current.value = "";
    for (const file of files) {
      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      const isTxt = file.type === "text/plain" || file.name.toLowerCase().endsWith(".txt");
      if (!isPdf && !isTxt) { showRefDocError(t.refDocTypeError); continue; }
      if (file.size > 10 * 1024 * 1024) { showRefDocError(t.refDocSizeError); continue; }
      if (referenceDocuments.some(d => d.filename === file.name)) { showRefDocError(t.refDocDupeError); continue; }
      const reader = new FileReader();
      const docId = Math.random().toString(36).slice(2, 8);
      const sizeKb = Math.round(file.size / 1024);
      const uploadedAt = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      if (isPdf) {
        reader.onload = () => {
          const dataUrl = reader.result as string;
          const base64 = dataUrl.split(",")[1] ?? dataUrl;
          setReferenceDocuments(prev => [...prev, { id: docId, filename: file.name, fileType: "pdf", content: base64, sizeKb, uploadedAt }]);
          setRefDocError(null);
        };
        reader.readAsDataURL(file);
      } else {
        reader.onload = () => {
          setReferenceDocuments(prev => [...prev, { id: docId, filename: file.name, fileType: "text", content: reader.result as string, sizeKb, uploadedAt }]);
          setRefDocError(null);
        };
        reader.readAsText(file);
      }
    }
  };

  const handleRemoveDocument = (id: string) => {
    setReferenceDocuments(prev => prev.filter(d => d.id !== id));
  };

  const handleSaveRename = (id: number) => {
    if (editTitle.trim()) {
      renameConversation.mutate({ id, title: editTitle.trim() });
    } else {
      setEditingConvId(null);
    }
  };

  const handleNewChat = () => {
    setActiveConversationId(null);
    setInputValue("");
    setSelectedFile(null);
    setStreamingContent("");
    resetResultState(true);
    setCollapsedThreads(new Set());
  };

  const handleDownloadResult = () => {
    if (resultRows.length > 0 || latestDataModel || latestPiiScan || latestDqAnalysis || latestInformaticaOutput) {
      generateResultExcel(resultRows, includedAnalyses, latestDataModel || undefined, latestPiiScan || undefined, latestDqAnalysis || undefined, latestInformaticaOutput || undefined);
    }
  };

  const handlePreviewResult = () => {
    if (resultRows.length > 0 || latestDataModel || latestPiiScan || latestDqAnalysis || latestInformaticaOutput) {
      const wb = buildResultWorkbook(resultRows, includedAnalyses, latestDataModel || undefined, latestPiiScan || undefined, latestDqAnalysis || undefined, latestInformaticaOutput || undefined);
      const bytes = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      const file = new File([bytes], "result.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      setPreviewResultFile(file);
    }
  };

  const handleDeleteConversation = (id: number) => {
    setFadingOutConvId(id);
    setTimeout(() => {
      deleteConversation.mutate(id);
    }, 150);
  };

  const handleDeleteAllConversations = () => {
    setFadingOutAll(true);
    setTimeout(() => {
      deleteAllConversations.mutate();
    }, 150);
  };

  const toggleThread = (index: number) => {
    setCollapsedThreads(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const collapseAll = (threads: ThreadPair[]) => {
    setCollapsedThreads(new Set(threads.map((_, i) => i)));
  };

  const expandAll = () => {
    setCollapsedThreads(new Set());
  };

  const messages = activeConversation?.messages || [];
  const threads = groupMessagesIntoThreads(messages);

  const dqSheetCount = latestDqAnalysis
    ? (latestDqAnalysis.field_rules.some(g => g.rules.length > 0) ? 1 : 0)
      + (latestDqAnalysis.cross_field_rules.length > 0 ? 1 : 0)
      + (latestDqAnalysis.business_logic_warnings.length > 0 ? 1 : 0)
    : 0;
  const sheetCount =
    includedAnalyses.filter(a => !(a === "data_quality" && latestDqAnalysis)).length
    + (latestDataModel ? 3 : 0)
    + (latestPiiScan ? 1 : 0)
    + dqSheetCount
    + (latestInformaticaOutput ? 1 : 0);

  const sidebarProps = {
    t,
    conversations,
    conversationsLoading,
    activeConversationId,
    handleNewChat,
    deletingConvId,
    setDeletingConvId,
    handleDeleteConversation,
    fadingOutConvId,
    fadingOutAll,
    showClearAllConfirm,
    setShowClearAllConfirm,
    handleDeleteAllConversations,
    agentStatus,
    editingConvId,
    setEditingConvId,
    editTitle,
    setEditTitle,
    handleSaveRename,
    agentMode,
    referenceDocuments,
    refDocError,
    aiProvider,
    onAiProviderChange: setAiProvider,
    onAddDocument: handleAddDocument,
    onRemoveDocument: handleRemoveDocument,
    refDocInputRef,
    theme,
  };

  return (
    <div className="flex h-screen overflow-hidden font-main" dir={isRtl ? "rtl" : "ltr"} data-testid="chat-page">
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.resetTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.resetDescription(uploadedFileName || "", getIncludedAnalysisLabels(includedAnalyses))}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleResetCancel} data-testid="button-reset-cancel">{t.keepCurrent}</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetConfirm} data-testid="button-reset-confirm">{t.resetUpload}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!pageMismatch} onOpenChange={(open) => { if (!open) setPageMismatch(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              <span className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5" style={{ color: "#D97706" }} />
                {lang === "ar" ? "صفحة غير صحيحة" : "Wrong Page"}
              </span>
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pageMismatch?.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPageMismatch(null)}>
              {lang === "ar" ? "إغلاق" : "Dismiss"}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pageMismatch) {
                  setAgentMode(pageMismatch.targetMode);
                  setActiveConversationId(null);
                  resetResultState(true);
                  setCollapsedThreads(new Set());
                }
                setPageMismatch(null);
              }}
              style={{ backgroundColor: theme.primary }}
            >
              {lang === "ar" ? `انتقل إلى ${pageMismatch?.targetLabel}` : `Go to ${pageMismatch?.targetLabel}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isMobile && mobileSidebarOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => setMobileSidebarOpen(false)}
            data-testid="mobile-sidebar-overlay"
          />
          <div
            className={`fixed inset-y-0 z-50 w-[75vw] max-w-[280px] ${isRtl ? "right-0" : "left-0"}`}
            data-testid="mobile-sidebar-drawer"
          >
            <SidebarContent
              {...sidebarProps}
              setActiveConversationId={(id) => { setActiveConversationId(id); setMobileSidebarOpen(false); }}
              onCollapse={() => setMobileSidebarOpen(false)}
            />
          </div>
        </>
      )}

      {isMobile && mobileOutputsOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => setMobileOutputsOpen(false)}
          />
          <div className={`fixed inset-y-0 z-50 w-[80vw] max-w-[320px] ${isRtl ? "left-0" : "right-0"}`}>
            <OutputsPanel
              t={t}
              isRtl={isRtl}
              resultRows={resultRows}
              includedAnalyses={includedAnalyses}
              latestDataModel={latestDataModel}
              latestPiiScan={latestPiiScan}
              latestDqAnalysis={latestDqAnalysis}
              latestInformaticaOutput={latestInformaticaOutput}
              insightsReports={insightsReports}
              uploadedFileName={uploadedFileName}
              onDownloadResult={handleDownloadResult}
              onPreviewResult={handlePreviewResult}
              activityLog={activityLog}
              sheetCount={sheetCount}
            />
          </div>
        </>
      )}

      {showExcelPreview && selectedFile && (
        <ExcelPreview file={selectedFile} onClose={() => setShowExcelPreview(false)} />
      )}
      {previewResultFile && (
        <ExcelPreview file={previewResultFile} onClose={() => setPreviewResultFile(null)} />
      )}

      {!isMobile && (
        <div
          className="flex-shrink-0 overflow-hidden"
          style={{
            width: sidebarCollapsed ? 0 : sidebarWidth,
            transition: sidebarDragRef.current ? "none" : "width 200ms ease-in-out",
          }}
          data-testid="sidebar-panel"
        >
          <div className="h-full" style={{ width: sidebarWidth }}>
            <SidebarContent
              {...sidebarProps}
              setActiveConversationId={setActiveConversationId}
              onCollapse={() => setSidebarCollapsed(true)}
            />
          </div>
        </div>
      )}

      {!isMobile && !sidebarCollapsed && (
        <div
          className="flex-shrink-0 self-stretch cursor-col-resize z-30 group relative"
          style={{ width: 4 }}
          onMouseDown={(e) => {
            e.preventDefault();
            sidebarDragRef.current = { startX: e.clientX, startWidth: sidebarWidth };
            const onMove = (ev: MouseEvent) => {
              if (!sidebarDragRef.current) return;
              const delta = ev.clientX - sidebarDragRef.current.startX;
              const next = Math.min(420, Math.max(160, sidebarDragRef.current.startWidth + delta));
              setSidebarWidth(next);
            };
            const onUp = () => {
              sidebarDragRef.current = null;
              document.removeEventListener("mousemove", onMove);
              document.removeEventListener("mouseup", onUp);
            };
            document.addEventListener("mousemove", onMove);
            document.addEventListener("mouseup", onUp);
          }}
          data-testid="sidebar-resize-handle"
        >
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-0.5 bg-transparent group-hover:bg-[#51BAB4] transition-colors duration-150" />
        </div>
      )}

      {!isMobile && (
        <button
          onClick={() => setSidebarCollapsed(v => !v)}
          className="flex-shrink-0 self-center z-30 flex items-center justify-center rounded-r-md transition-colors"
          style={{ width: 14, height: 48, backgroundColor: theme.sidebarBg, color: "rgba(255,255,255,0.7)", borderTop: `1px solid ${theme.secondary}`, borderRight: `1px solid ${theme.secondary}`, borderBottom: `1px solid ${theme.secondary}` }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = theme.secondary)}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = theme.sidebarBg)}
          data-testid="button-toggle-sidebar"
          title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebarCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      )}

      <div className="flex-1 min-w-0 flex flex-col command-center-bg">
        <div className="h-12 flex items-center gap-3 px-4 flex-shrink-0 border-b" style={{ borderColor: "#E5E7EB", backgroundColor: "#FFFFFF" }}>
          {isMobile && (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setMobileSidebarOpen(true)}
              className="h-8 w-8"
              data-testid="button-expand-sidebar"
            >
              <Menu className="w-4 h-4" />
            </Button>
          )}
          <div className="flex items-center gap-2 text-xs flex-1 min-w-0" style={{ color: "#1A1A2E" }}>
            <Folder className="w-3.5 h-3.5 flex-shrink-0" style={{ color: theme.primary }} />
            <span className="truncate font-medium">
              {uploadedFileName ? `📁 ${uploadedFileName}` : t.noFileLoaded}
            </span>
            {sessionFieldNames && (
              <span className="text-[10px]" style={{ color: "#6B7280" }}> — {sessionFieldNames.length} columns{sessionRowCount > 0 ? `, ${sessionRowCount} rows` : ""}</span>
            )}
          </div>
          {sheetCount > 0 && (
            <div className="flex items-center gap-1.5 text-xs" style={{ color: theme.accent }}>
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span className="font-medium">📊 result.xlsx — {sheetCount} {t.sheetsInResult}</span>
            </div>
          )}
          {threads.length > 1 && (
            <div className="flex gap-0.5">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-[11px] gap-1 px-2"
                style={{ color: "#6B7280" }}
                onClick={() => collapseAll(threads)}
                data-testid="button-collapse-all"
              >
                <Minimize2 className="w-3 h-3" />
                {t.collapse}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-[11px] gap-1 px-2"
                style={{ color: "#6B7280" }}
                onClick={expandAll}
                data-testid="button-expand-all"
              >
                <Maximize2 className="w-3 h-3" />
                {t.expand}
              </Button>
            </div>
          )}
          <Link
            href="/use-cases"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all hover:bg-gray-100 flex-shrink-0"
            style={{ color: "#6B7280" }}
            data-testid="link-use-cases"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            {t.useCases}
          </Link>
          <Link
            href="/user-guide"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all hover:bg-gray-100 flex-shrink-0"
            style={{ color: "#6B7280" }}
            data-testid="link-user-guide"
          >
            <BookOpen className="w-3.5 h-3.5" />
            {t.userGuide}
          </Link>
          <Link
            href="/entity-settings"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all hover:bg-gray-100 flex-shrink-0"
            style={{ color: "#6B7280" }}
            data-testid="link-settings"
          >
            <Settings className="w-3.5 h-3.5" />
            {lang === "ar" ? "الإعدادات" : "Settings"}
          </Link>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2.5 text-[11px] font-medium flex-shrink-0 text-gray-500 hover:text-red-600"
            onClick={() => (window as any).__logout?.()}
            data-testid="button-logout"
          >
            {lang === "ar" ? "خروج" : "Logout"}
          </Button>
          {isMobile && (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setMobileOutputsOpen(true)}
              className="h-8 w-8"
              data-testid="button-mobile-outputs"
            >
              <Activity className="w-4 h-4" />
            </Button>
          )}
        </div>

        {!isMobile && (
          <div className="flex items-center gap-1 px-4 py-2 border-b flex-shrink-0 bg-white" style={{ borderColor: "#E5E7EB" }} data-testid="agent-mode-tabs">
            {([
              { id: "data-management", icon: Database, labelKey: "agentDataMgmt", descKey: "agentDataMgmtDesc", color: "#0094D3" },
              { id: "data-model", icon: Layers, labelKey: "agentDataModel", descKey: "agentDataModelDesc", color: "#774896" },
              { id: "insights", icon: Brain, labelKey: "agentInsights", descKey: "agentInsightsDesc", color: "#067647" },
              { id: "nudge", icon: Target, labelKey: "agentNudge", descKey: "agentDataMgmtDesc", color: "#7C3AED" },
              { id: "bi", icon: BarChart3, labelKey: "biAgent", descKey: "agentDataMgmtDesc", color: theme.secondary },
            ]).filter(tab => {
              if (tab.id === "data-management") return DM_SUB_MODES.some(m => pageVisibility[m]);
              return pageVisibility[tab.id as keyof PageVisibility] !== false;
            }).map((tab) => {
              const isActive = tab.id === "data-management" ? isDmSubMode(agentMode) : agentMode === tab.id;
              return (
              <button
                key={tab.id}
                onClick={() => {
                  if (tab.id === "data-management") {
                    if (!isDmSubMode(agentMode)) {
                      setAgentMode("data-classification");
                      setActiveConversationId(null);
                      resetResultState(true);
                      setCollapsedThreads(new Set());
                    }
                  } else if (agentMode !== tab.id) {
                    setAgentMode(tab.id as AgentMode);
                    setActiveConversationId(null);
                    resetResultState(true);
                    setCollapsedThreads(new Set());
                  }
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  backgroundColor: isActive ? theme.sidebarBg : "transparent",
                  color: isActive ? "white" : "#6B7280",
                }}
                data-testid={`tab-agent-${tab.id}`}
              >
                <tab.icon className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{t[tab.labelKey] as string}</span>
              </button>
              );
            })}
          </div>
        )}

        {isDmSubMode(agentMode) && (
          <div className="flex items-center gap-1 px-4 py-1.5 border-b flex-shrink-0" style={{ borderColor: "#E5E7EB", backgroundColor: "#F8FAFC" }} data-testid="dm-sub-tabs">
            {([
              { id: "data-classification" as AgentMode, icon: ShieldCheck, label: t.tabDataClassification || "Data Classification", color: "#067647" },
              { id: "business-definitions" as AgentMode, icon: BookOpen, label: t.tabBusinessDefs || "Business Definitions", color: "#51BAB4" },
              { id: "dq-rules" as AgentMode, icon: CheckCircle, label: t.tabDqRules || "Data Quality Rules", color: "#774896" },
              { id: "pii-detection" as AgentMode, icon: ScanEye, label: t.tabPiiDetection || "PII Detection", color: "#E53935" },
              { id: "informatica" as AgentMode, icon: Cpu, label: t.tabInformatica || "Informatica Output", color: "#F57C00" },
            ]).filter(sub => pageVisibility[sub.id as keyof PageVisibility] !== false).map(sub => (
              <button
                key={sub.id}
                onClick={() => {
                  if (agentMode !== sub.id) {
                    setAgentMode(sub.id);
                    setActiveConversationId(null);
                    resetResultState(true);
                    setCollapsedThreads(new Set());
                  }
                }}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all"
                style={{
                  backgroundColor: agentMode === sub.id ? sub.color : "transparent",
                  color: agentMode === sub.id ? "white" : "#6B7280",
                }}
                data-testid={`dm-sub-tab-${sub.id}`}
              >
                <sub.icon className="w-3 h-3 flex-shrink-0" />
                <span>{sub.label as string}</span>
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-hidden relative">
          {isDraggingOver && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-blue-50/90 border-2 border-dashed border-blue-400 rounded-lg pointer-events-none">
              <Upload className="w-10 h-10 mb-3 text-blue-400" />
              <p className="text-sm font-medium text-blue-600">Drop file here to upload</p>
            </div>
          )}
          <ScrollArea className="h-full"
            onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
            onDragEnter={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
            onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDraggingOver(false); }}
            onDrop={(e) => {
              e.preventDefault();
              setIsDraggingOver(false);
              const file = e.dataTransfer.files?.[0];
              if (file) handleFileChange({ target: { files: e.dataTransfer.files } } as any);
            }}
          >
            <div className="max-w-4xl mx-auto w-full px-4 py-6">
              {!activeConversationId && messages.length === 0 && !isStreaming ? (
                <div className="flex flex-col items-center justify-center pt-8">
                  <h2 className="text-2xl font-bold mb-2 tracking-tight font-main" style={{ color: agentMode === "nudge" ? "#7C3AED" : agentMode === "bi" ? theme.secondary : theme.primary }} data-testid="text-hero-title">
                    {agentMode === "nudge" ? t.nudgeHeroTitle as string : agentMode === "bi" ? t.biHeroTitle as string : t.whatToDo}
                  </h2>
                  <p className="text-center mb-8 max-w-md text-sm leading-relaxed" style={{ color: "#6B7280" }}>
                    {agentMode === "nudge" ? t.nudgeHeroDesc as string : agentMode === "bi" ? t.biHeroDesc as string : agentMode === "insights" ? t.agentInsightsDesc : agentMode === "data-model" ? t.agentDataModelDesc : DM_HERO_DESCRIPTIONS[agentMode] || t.heroDescription}
                  </p>
                  {agentMode === "nudge" && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-3xl mb-8">
                      {([
                        { icon: Search, title: t.nudgeInfoCard1 as string, desc: t.nudgeInfoCard1Desc as string, color: theme.primary },
                        { icon: Users, title: t.nudgeInfoCard2 as string, desc: t.nudgeInfoCard2Desc as string, color: "#067647" },
                        { icon: Target, title: t.nudgeInfoCard3 as string, desc: t.nudgeInfoCard3Desc as string, color: "#7C3AED" },
                      ]).map(({ icon: Icon, title, desc, color }, i) => (
                        <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: color + "18" }}>
                            <Icon className="w-5 h-5" style={{ color }} />
                          </div>
                          <h3 className="font-bold text-gray-900 text-sm mb-1">{title}</h3>
                          <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {agentMode === "nudge" && (
                    <div className="bg-white rounded-xl border border-gray-200 p-5 mb-8 shadow-sm w-full max-w-3xl">
                      <p className="text-sm font-semibold text-gray-600 mb-3">{t.nudgeExamplesTitle as string}</p>
                      <ul className="space-y-1.5">
                        {(t.nudgeExamples as string[]).map((ex, i) => (
                          <li key={i} className="text-sm text-gray-500 flex items-start gap-2">
                            <span className="text-gray-300 flex-shrink-0 mt-0.5">—</span>
                            <button className="text-left hover:text-gray-700 transition-colors" onClick={() => { setInputValue(ex); textareaRef.current?.focus(); }}>{ex}</button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {agentMode === "bi" && (
                    <div className="w-full max-w-3xl mb-8 space-y-6">
                      {!biFile ? (
                        <div
                          onClick={() => biFileInputRef.current?.click()}
                          onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleBiFile(f); }}
                          onDragOver={(e) => e.preventDefault()}
                          className="hidden bg-white rounded-xl border-2 border-dashed border-gray-300 hover:border-blue-400 p-12 text-center cursor-pointer transition-all"
                          data-testid="bi-upload-zone"
                        >
                          <input ref={biFileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => handleBiFile(e.target.files?.[0] ?? null)} data-testid="bi-input-file" />
                          <div className="text-5xl mb-4">📂</div>
                          <div className="text-lg font-bold text-gray-800 mb-2">{t.biUploadPrompt as string}</div>
                          <div className="text-sm text-gray-500">.xlsx · .xls · .csv</div>
                        </div>
                      ) : (
                        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                          <div className="flex items-center gap-3">
                            <span className="text-xl">📊</span>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold text-gray-800 truncate">{biFile.name}</div>
                              <div className="text-xs text-gray-500">{biRows.length} rows · {biFields.length} fields</div>
                            </div>
                            <button onClick={() => { setBiFile(null); setBiRows([]); setBiFields([]); }} className="text-gray-400 hover:text-gray-600 text-sm" data-testid="button-bi-clear-file">✕</button>
                          </div>
                        </div>
                      )}
                      <div className="hidden grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {([
                          { icon: "🔍", titleKey: "biInfoCard1" as const, descKey: "biInfoCard1Desc" as const, color: theme.secondary },
                          { icon: "📐", titleKey: "biInfoCard2" as const, descKey: "biInfoCard2Desc" as const, color: theme.accent },
                          { icon: "🔬", titleKey: "biInfoCard3" as const, descKey: "biInfoCard3Desc" as const, color: "#E65100" },
                          { icon: "📋", titleKey: "biInfoCard4" as const, descKey: "biInfoCard4Desc" as const, color: "#774896" },
                          { icon: "🖥️", titleKey: "biInfoCard5" as const, descKey: "biInfoCard5Desc" as const, color: theme.sidebarBg },
                        ]).map(({ icon, titleKey, descKey, color }, i) => (
                          <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                            <div className="text-2xl mb-3">{icon}</div>
                            <h3 className="font-bold text-sm mb-1" style={{ color }}>{t[titleKey] as string}</h3>
                            <p className="text-xs text-gray-500 leading-relaxed">{t[descKey] as string}</p>
                          </div>
                        ))}
                      </div>
                      {biError && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700" data-testid="bi-error">
                          ⚠️ {biError}
                        </div>
                      )}
                    </div>
                  )}
                  <div className={`grid ${isMobile ? "grid-cols-1" : "grid-cols-2"} gap-4 w-full max-w-3xl`}>
                    {FEATURE_CARDS.filter(c => c.agentMode === agentMode && !c.hidden).map((card, cardIdx) => {
                      const globalIdx = FEATURE_CARDS.indexOf(card);
                      return (
                      <button
                        key={card.title}
                        onClick={() => {
                          setInputValue(card.prompt);
                          textareaRef.current?.focus();
                        }}
                        className="bg-white rounded-xl p-5 text-left transition-all border hover:shadow-md animate-slide-up group"
                        style={{ borderColor: "#E5E7EB", animationDelay: `${cardIdx * 50}ms` }}
                        data-testid={`card-feature-${card.title.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        <div className={`w-10 h-10 mb-3 rounded-lg ${card.iconBg} flex items-center justify-center`}>
                          <card.icon className={`w-5 h-5 ${card.color}`} />
                        </div>
                        <h3 className="text-sm font-semibold mb-1" style={{ color: "#1A1A2E" }}>{t[featureCardKeys[globalIdx].titleKey] as string}</h3>
                        <p className="text-xs leading-relaxed mb-3" style={{ color: "#6B7280" }}>
                          {t[featureCardKeys[globalIdx].descKey] as string}
                        </p>
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium ripple-button rounded-md px-2.5 py-1" style={{ color: theme.primary, backgroundColor: theme.primary + "10" }}>
                          <Play className="w-3 h-3" />
                          {t.startBtn}
                        </span>
                      </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {threads.map((thread, idx) => {
                    const isCollapsed = collapsedThreads.has(idx);
                    const isLastThread = idx === threads.length - 1;
                    const isActiveStreaming = isLastThread && isStreaming;
                    const storedIntent = thread.assistantMsg
                      ? messageIntents[thread.assistantMsg.id]
                      : undefined;
                    const tag = storedIntent
                      ? intentToTag(storedIntent, t)
                      : detectAnalysisTag(thread.userMsg.content, thread.assistantMsg?.content, t);
                    return (
                      <ThreadCard
                        key={thread.userMsg.id}
                        thread={thread}
                        idx={idx}
                        isCollapsed={isCollapsed}
                        onToggle={() => toggleThread(idx)}
                        tag={tag}
                        isRtl={isRtl}
                        t={t}
                        lang={lang}
                        isActiveStreaming={isActiveStreaming}
                        liveSteps={thinkingSteps}
                        completedSteps={thread.assistantMsg ? completedStepsForMessage[thread.assistantMsg.id] : undefined}
                        streamingContent={isActiveStreaming ? streamingContent : ""}
                        timeTick={isActiveStreaming ? timeTick : undefined}
                        summaryOverride={thread.assistantMsg ? summaryOverrides[thread.assistantMsg.id] : undefined}
                        onDownloadResult={
                          (thread.assistantMsg && biReports[thread.assistantMsg.id])
                            ? downloadBiReport
                            : (resultRows.length > 0 || latestDataModel || latestPiiScan || latestDqAnalysis || latestInformaticaOutput)
                              ? handleDownloadResult
                              : undefined
                        }
                        dataModel={thread.assistantMsg ? (dataModels[thread.assistantMsg.id] || undefined) : undefined}
                        dqAnalysis={thread.assistantMsg ? (dqAnalyses[thread.assistantMsg.id] || undefined) : undefined}
                        informaticaOutput={thread.assistantMsg ? (informaticaOutputs[thread.assistantMsg.id] || undefined) : undefined}
                        insightsReport={thread.assistantMsg ? (insightsForMessage[thread.assistantMsg.id] || undefined) : undefined}
                        allInsightsReports={insightsReports}
                        profiledColumns={profiledColumns}
                        uploadedFileName={uploadedFileName}
                        nudgeReport={thread.assistantMsg ? (nudgeReports[thread.assistantMsg.id] || undefined) : undefined}
                        biReport={thread.assistantMsg ? (biReports[thread.assistantMsg.id] || undefined) : undefined}
                        piiScan={thread.assistantMsg ? (piiScans[thread.assistantMsg.id] || undefined) : undefined}
                        onRetry={isLastThread && !isStreaming ? () => { const r = lastRequestRef.current; if (r) sendMessage(r.content, r.file, r.extraText); } : undefined}
                        usedAiProvider={aiProvider}
                        classificationItems={thread.assistantMsg ? classificationForMessage[thread.assistantMsg.id] : undefined}
                        onClassificationChange={thread.assistantMsg ? (items) => setClassificationForMessage(prev => ({ ...prev, [thread.assistantMsg!.id]: items })) : undefined}
                      />
                    );
                  })}
                  {wasCancelled && !isStreaming && !chatError && (
                    <div className="px-4 py-4 max-w-4xl mx-auto w-full">
                      <div style={{ borderLeft: "4px solid #E65100", backgroundColor: "#FFF3E0", borderRadius: "8px", padding: "16px 20px" }}>
                        <div className="flex items-start gap-3">
                          <span style={{ color: "#E65100", fontSize: "18px", flexShrink: 0 }}>⏹</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm" style={{ color: "#BF360C" }}>{t.generationStopped}</p>
                            <p className="text-sm mt-1" style={{ color: "#6D4C41" }}>{t.stoppedMessage}</p>
                            <div className="flex gap-2 mt-3">
                              <button
                                onClick={() => { const r = lastRequestRef.current; if (r) sendMessage(r.content, r.file, r.extraText); }}
                                style={{ backgroundColor: theme.primary, color: "white", border: "none", borderRadius: "6px", padding: "6px 14px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
                                data-testid="button-cancelled-try-again"
                              >
                                {t.tryAgain}
                              </button>
                              <button
                                onClick={() => { setWasCancelled(false); setInputValue(""); setSelectedFile(null); setPastedText(""); }}
                                style={{ backgroundColor: "#9E9E9E", color: "white", border: "none", borderRadius: "6px", padding: "6px 14px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
                                data-testid="button-cancelled-clear"
                              >
                                {t.clearInput}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {chatError && (
                    <div className="px-4 py-4 max-w-4xl mx-auto w-full">
                      <ErrorCard
                        message={chatError.message}
                        onRetry={chatError.retry}
                        retryLabel={t.tryAgain}
                      />
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        <div className="flex-shrink-0">
          {activeConversationId && (
            <div className="px-4 pt-2 pb-1">
              <div className="max-w-4xl mx-auto flex gap-2 flex-wrap">
                {FEATURE_CARDS.filter(c => c.agentMode === agentMode && !c.hidden).map((card, cardIdx) => {
                  const globalIdx = FEATURE_CARDS.indexOf(card);
                  return (
                  <button
                    key={card.title}
                    onClick={() => {
                      setInputValue(card.prompt);
                      textareaRef.current?.focus();
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all hover:opacity-90"
                    style={{ backgroundColor: theme.sidebarBg, color: "rgba(255,255,255,0.85)" }}
                    data-testid={`pill-feature-${cardIdx}`}
                  >
                    <card.icon className="w-3 h-3" />
                    {t[featureCardKeys[globalIdx].titleKey] as string}
                  </button>
                  );
                })}
              </div>
            </div>
          )}
          <div className="p-3 flex-shrink-0" style={{ backgroundColor: theme.sidebarBg }}>
            <div className="max-w-4xl mx-auto">
              {agentMode === "bi" ? (
                <div data-testid="bi-input-panel">
                  {!biFile ? (
                    <div className="flex items-center gap-3 rounded-lg px-4 py-3 cursor-pointer border border-dashed transition-all"
                      style={{ borderColor: "rgba(255,255,255,0.3)", backgroundColor: "rgba(255,255,255,0.05)" }}
                      onClick={() => biFileInputRef.current?.click()}
                      data-testid="bi-bottom-upload"
                    >
                      <input ref={biFileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => handleBiFile(e.target.files?.[0] ?? null)} />
                      <Upload className="w-4 h-4" style={{ color: "rgba(255,255,255,0.5)" }} />
                      <span className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>{t.biUploadPrompt as string}</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 mb-2 text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>
                        <span>📊</span>
                        <span className="font-medium" style={{ color: "rgba(255,255,255,0.8)" }}>{biFile.name}</span>
                        <span>· {biRows.length} rows · {biFields.length} fields</span>
                        <button onClick={() => { setBiFile(null); setBiRows([]); setBiFields([]); }} className="ml-auto text-white/40 hover:text-white/70 text-sm" data-testid="bi-clear-file-btn">✕</button>
                      </div>
                      <div className="flex items-center gap-1 mb-2">
                        {BI_TABS.filter(tb => tb.key !== "dashboard" && tb.key !== "dashtest" && tb.key !== "testcases").map(tb => (
                          <button key={tb.key} onClick={() => setBiActiveTab(tb.key)}
                            className="px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all"
                            style={{ backgroundColor: biActiveTab === tb.key ? "rgba(26,75,140,0.5)" : "transparent", color: biActiveTab === tb.key ? "#E8EDF5" : "rgba(255,255,255,0.5)", border: `1px solid ${biActiveTab === tb.key ? theme.secondary : "transparent"}` }}
                            data-testid={`bi-tab-${tb.key}`}
                          >{tb.icon} {lang === "ar" ? tb.labelAr : tb.label}</button>
                        ))}
                      </div>
                      <div className="flex items-end gap-2">
                        <div className="flex-1 flex gap-2 flex-wrap">
                          {(biActiveTab === "sharing" || biActiveTab === "report") && (
                            <input value={biStakeholder} onChange={e => setBiStakeholder(e.target.value)} placeholder={lang === "ar" ? "الجهة المستلمة..." : "Stakeholder..."} className="flex-1 min-w-[120px] px-3 py-1.5 rounded-lg text-xs border-0" style={{ backgroundColor: "rgba(255,255,255,0.08)", color: "#fff" }} data-testid="bi-input-stakeholder" />
                          )}
                          {biActiveTab === "dashboard" && (
                            <input value={biBusinessQuestion} onChange={e => setBiBusinessQuestion(e.target.value)} placeholder={lang === "ar" ? "سؤال الأعمال..." : "Business question..."} className="flex-1 min-w-[120px] px-3 py-1.5 rounded-lg text-xs border-0" style={{ backgroundColor: "rgba(255,255,255,0.08)", color: "#fff" }} data-testid="bi-input-bq" />
                          )}
                          {(biActiveTab === "report" || biActiveTab === "testcases") && (
                            <input value={biReportPurpose} onChange={e => setBiReportPurpose(e.target.value)} placeholder={lang === "ar" ? "غرض التقرير..." : "Report purpose..."} className="flex-1 min-w-[120px] px-3 py-1.5 rounded-lg text-xs border-0" style={{ backgroundColor: "rgba(255,255,255,0.08)", color: "#fff" }} data-testid="bi-input-purpose" />
                          )}
                          {biActiveTab === "dashtest" && (
                            <input value={biDashDesc} onChange={e => setBiDashDesc(e.target.value)} placeholder={lang === "ar" ? "وصف لوحة المعلومات..." : "Dashboard description..."} className="flex-1 min-w-[120px] px-3 py-1.5 rounded-lg text-xs border-0" style={{ backgroundColor: "rgba(255,255,255,0.08)", color: "#fff" }} data-testid="bi-input-dashdesc" />
                          )}
                        </div>
                        {biLoading ? (
                          <button type="button" onClick={() => { biAbortRef.current?.abort(); setBiLoading(false); }} className="h-9 px-5 flex-shrink-0 rounded-lg text-xs font-semibold text-white flex items-center gap-2" style={{ backgroundColor: "#EF4444" }} data-testid="bi-stop-btn">
                            <Square className="w-3 h-3 fill-white" /> stop agent
                          </button>
                        ) : (
                          <Button onClick={biRunAnalysis} className="h-9 px-4 flex-shrink-0 rounded-lg gap-1.5 text-xs font-medium text-white ripple-button" style={{ backgroundColor: theme.accent }} disabled={!biFields.length || biLoading} data-testid="bi-run-btn">
                            {t.biRunBtn as string} <Play className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ) : (
              <>
              {selectedFile && (
                <div className="flex items-center gap-2 mb-2 rounded-lg px-3 py-1.5" style={{ backgroundColor: "rgba(255,255,255,0.1)" }}>
                  {selectedFile.type.startsWith("image/") ? (
                    <ImagePreview file={selectedFile} />
                  ) : (
                    <FileSpreadsheet className="w-4 h-4 text-white/60 flex-shrink-0" />
                  )}
                  <span className="text-xs truncate flex-1 text-white/80 font-medium">{selectedFile.name}</span>
                  {!selectedFile.type.startsWith("image/") && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 flex-shrink-0 text-white/40 hover:text-teal-300 hover:bg-transparent"
                      onClick={() => setShowExcelPreview(true)}
                      title={t.previewFile}
                      data-testid="button-preview-file"
                    >
                      <Eye className="w-3 h-3" />
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 flex-shrink-0 text-white/40 hover:text-red-400 hover:bg-transparent"
                    onClick={() => {
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                      if (cameraInputRef.current) cameraInputRef.current.value = "";
                    }}
                    data-testid="button-remove-file"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              )}
              {!selectedFile && !textInputMode && (
                <div
                  className="mb-2 flex items-center gap-3 rounded-lg px-3 py-2 cursor-pointer border border-dashed transition-all"
                  style={{ borderColor: "rgba(255,255,255,0.2)", backgroundColor: "rgba(255,255,255,0.04)" }}
                  onClick={() => fileInputRef.current?.click()}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.4)"; (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.08)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.2)"; (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.04)"; }}
                  data-testid="dropzone-upload"
                >
                  <Upload className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "rgba(255,255,255,0.4)" }} />
                  <span className="text-xs font-medium flex-1" style={{ color: "rgba(255,255,255,0.5)" }}>{t.dragDropUpload}</span>
                  <span className="text-[10px] hidden sm:block" style={{ color: "rgba(255,255,255,0.3)" }}>{t.uploadFooter}</span>
                </div>
              )}
              {textInputMode && (
                <div className="mb-2 rounded-lg overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
                  <div className="flex items-center justify-between px-3 py-1.5 border-b" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
                    <span className="text-xs text-white/60 font-medium">{t.pasteTextMode}</span>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-5 w-5 text-white/40 hover:text-white hover:bg-transparent"
                      onClick={() => { setTextInputMode(false); setPastedText(""); }}
                      data-testid="button-close-paste-mode"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                  <textarea
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder={t.pasteTextPlaceholder}
                    className="w-full bg-transparent text-white/80 text-xs p-3 resize-none outline-none placeholder:text-white/30 font-mono"
                    rows={4}
                    data-testid="textarea-paste-data"
                  />
                </div>
              )}
              <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv,.pdf,.png,.jpg,.jpeg,.gif,.webp,.docx"
                  onChange={handleFileChange}
                  className="hidden"
                  data-testid="input-file"
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleCameraCapture}
                  className="hidden"
                  data-testid="input-camera"
                />
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 flex-shrink-0 text-white/50 hover:text-white hover:bg-white/10"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isStreaming}
                    data-testid="button-upload-file"
                  >
                    <Paperclip className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 flex-shrink-0 text-white/50 hover:text-white hover:bg-white/10"
                    onClick={() => setTextInputMode(v => !v)}
                    disabled={isStreaming}
                    title={t.pasteTextMode}
                    data-testid="button-toggle-text-input"
                    style={{ color: textInputMode ? "#51BAB4" : undefined }}
                  >
                    <Type className="w-4 h-4" />
                  </Button>
                  {isTouchDevice && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 flex-shrink-0 touch-device-only text-white/50 hover:text-white hover:bg-white/10"
                      onClick={() => cameraInputRef.current?.click()}
                      disabled={isStreaming}
                      title={t.cameraCapture}
                      data-testid="button-camera-capture"
                    >
                      <Camera className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <Textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t.enterCommand}
                  className="min-h-[36px] max-h-24 resize-none flex-1 rounded-lg text-sm border-0 font-mono-cmd"
                  style={{ backgroundColor: "rgba(255,255,255,0.08)", color: "#ffffff" }}
                  disabled={isStreaming}
                  data-testid="input-message"
                />
                {isStreaming ? (
                  <button
                    type="button"
                    onClick={() => { if (abortControllerRef.current) abortControllerRef.current.abort(); }}
                    className="h-9 px-4 flex-shrink-0 rounded-lg text-xs font-bold text-white flex items-center gap-1.5"
                    style={{ backgroundColor: "#C62828", border: "none", cursor: "pointer", letterSpacing: "0.5px" }}
                    data-testid="button-stop-generation"
                  >
                    {t.stopButton}
                  </button>
                ) : (
                  <Button
                    type="submit"
                    className="h-9 px-4 flex-shrink-0 rounded-lg gap-1.5 text-xs font-medium text-white ripple-button"
                    style={{ backgroundColor: theme.accent }}
                    disabled={!inputValue.trim() && !selectedFile && !pastedText.trim()}
                    data-testid="button-send-message"
                  >
                    {t.executeCmd}
                    <Play className="w-3.5 h-3.5" />
                  </Button>
                )}
              </form>
              </>
              )}
            </div>
          </div>
        </div>
      </div>

      {!isMobile && (
        <button
          onClick={() => setOutputsPanelCollapsed(v => !v)}
          className="flex-shrink-0 self-center z-30 flex items-center justify-center rounded-l-md transition-colors"
          style={{ width: 14, height: 48, backgroundColor: "#F9FAFB", color: "#9CA3AF", borderTop: "1px solid #E5E7EB", borderLeft: "1px solid #E5E7EB", borderBottom: "1px solid #E5E7EB" }}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = "#EEF2FF"; e.currentTarget.style.color = theme.primary; }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = "#F9FAFB"; e.currentTarget.style.color = "#9CA3AF"; }}
          data-testid="button-toggle-outputs"
          title={outputsPanelCollapsed ? t.expandOutputs : t.collapseOutputs}
        >
          {outputsPanelCollapsed ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </button>
      )}

      {!isMobile && (
        <div
          className="flex-shrink-0 h-full overflow-hidden transition-all duration-200 ease-in-out"
          style={{ width: outputsPanelCollapsed ? 0 : 300, maxHeight: "100vh" }}
          data-testid="outputs-panel-wrapper"
        >
          <div className="w-[300px] h-full overflow-hidden border-l" style={{ borderColor: "#E5E7EB" }} data-testid="outputs-panel">
            <OutputsPanel
              t={t}
              isRtl={isRtl}
              resultRows={resultRows}
              includedAnalyses={includedAnalyses}
              latestDataModel={latestDataModel}
              latestPiiScan={latestPiiScan}
              latestDqAnalysis={latestDqAnalysis}
              latestInformaticaOutput={latestInformaticaOutput}
              insightsReports={insightsReports}
              uploadedFileName={uploadedFileName}
              onDownloadResult={handleDownloadResult}
              onPreviewResult={handlePreviewResult}
              activityLog={activityLog}
              sheetCount={sheetCount}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function OutputsPanel({
  t, isRtl, resultRows, includedAnalyses, latestDataModel, latestPiiScan, latestDqAnalysis, latestInformaticaOutput, insightsReports, uploadedFileName, onDownloadResult, onPreviewResult, activityLog, sheetCount,
}: {
  t: Translation; isRtl: boolean;
  resultRows: ResultRow[]; includedAnalyses: AnalysisType[];
  latestDataModel: DataModelJSON | null; latestPiiScan: PiiScanResult | null; latestDqAnalysis: DqAnalysisResult | null; latestInformaticaOutput: InformaticaOutput | null;
  insightsReports: { report: InsightsReport; fileName: string; timestamp: string; excelFileName: string; columns: BackendColumnProfile[] }[];
  uploadedFileName: string | null; onDownloadResult: () => void; onPreviewResult: () => void; activityLog: ActivityLogEntry[]; sheetCount: number;
}) {
  const [outputsExpanded, setOutputsExpanded] = useState({
    live: true,
    sheets: true,
    activity: true
  });

  const hasResultXlsx = resultRows.length > 0 || latestDataModel || latestPiiScan || latestDqAnalysis || latestInformaticaOutput;
  const hasOutputs = hasResultXlsx || insightsReports.length > 0;

  const sheetTags: { label: string; color: string }[] = [];
  for (const a of includedAnalyses) {
    sheetTags.push({ label: getAnalysisLabel(a), color: SHEET_TAG_COLORS[a] || "#6B7280" });
  }
  if (latestDataModel) sheetTags.push({ label: "Data Model", color: SHEET_TAG_COLORS.data_model });
  if (latestPiiScan) sheetTags.push({ label: "PII Scan", color: SHEET_TAG_COLORS.pii_scan });
  if (latestDqAnalysis) sheetTags.push({ label: "DQ Rules", color: SHEET_TAG_COLORS.data_quality });
  if (latestInformaticaOutput) sheetTags.push({ label: "Informatica", color: SHEET_TAG_COLORS.informatica });

  return (
    <div className="h-full bg-white flex flex-col font-main overflow-hidden" style={{ borderLeft: isRtl ? "none" : "1px solid #E5E7EB", borderRight: isRtl ? "1px solid #E5E7EB" : "none", maxWidth: 300 }} data-testid="outputs-panel-content">
      <div className="p-4 pb-3 flex-shrink-0">
        <h2 className="text-sm font-bold" style={{ color: "#2563EB" }}>{t.outputsActivity}</h2>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="px-4 space-y-4 pb-4 overflow-hidden">
          <div className="border-b pb-2" style={{ borderColor: "#F3F4F6" }}>
            <h3 
              className="text-[11px] font-semibold mb-2 flex items-center justify-between cursor-pointer hover:bg-gray-50 p-1 rounded transition-colors" 
              style={{ color: "#1A1A2E", borderLeft: isRtl ? "none" : "3px solid #2563EB", borderRight: isRtl ? "3px solid #2563EB" : "none", paddingLeft: isRtl ? 0 : 8, paddingRight: isRtl ? 8 : 0 }}
              onClick={() => setOutputsExpanded(prev => ({ ...prev, live: !prev.live }))}
            >
              <div className="flex items-center gap-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5" style={{ color: "#2563EB" }} />
                {t.liveOutputs}
              </div>
              {outputsExpanded.live ? <ChevronDown className="w-3 h-3 text-gray-400" /> : <ChevronRight className="w-3 h-3 text-gray-400" />}
            </h3>
            {outputsExpanded.live && (
              <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                {hasOutputs ? (
                  <div className="space-y-2 px-1">
                    {hasResultXlsx && (
                      <div
                        className="rounded-lg border p-3 cursor-pointer hover:shadow-sm transition-shadow bg-white"
                        style={{ borderColor: "#E5E7EB" }}
                        onClick={onDownloadResult}
                        data-testid="output-card-result"
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <FileSpreadsheet className="w-5 h-5 flex-shrink-0" style={{ color: "#2E7D32" }} />
                          <div className="flex-1 min-w-0 overflow-hidden">
                            <p className="text-xs font-semibold truncate" style={{ color: "#1A1A2E" }}>result.xlsx</p>
                            <p className="text-[10px] truncate" style={{ color: "#6B7280" }}>{sheetCount} {t.sheetsInResult}{uploadedFileName ? ` — ${uploadedFileName}` : ""}</p>
                          </div>
                          <Button size="sm" className="h-7 w-7 p-0 flex-shrink-0 text-white" style={{ backgroundColor: "#2563EB" }} onClick={(e) => { e.stopPropagation(); onPreviewResult(); }} data-testid="button-preview-result">
                            <Eye className="w-3 h-3" />
                          </Button>
                          <Button size="sm" className="h-7 w-7 p-0 flex-shrink-0 text-white" style={{ backgroundColor: "#2E7D32" }} onClick={(e) => { e.stopPropagation(); onDownloadResult(); }} data-testid="button-download-result">
                            <Download className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                    {insightsReports.map((rpt, i) => (
                      <div key={i} className="rounded-lg border p-2.5 bg-white" style={{ borderColor: "#E5E7EB" }}>
                        <div className="flex items-center gap-2">
                          <BarChart3 className="w-4 h-4" style={{ color: "#E65100" }} />
                          <span className="text-[10px] truncate flex-1" style={{ color: "#1A1A2E" }}>{rpt.excelFileName}</span>
                        </div>
                      </div>
                    ))}
                    {hasBiSheets() && (
                      <div
                        className="rounded-lg border p-3 cursor-pointer hover:shadow-sm transition-shadow bg-white"
                        style={{ borderColor: "#E5E7EB" }}
                        onClick={() => downloadBiReport()}
                        data-testid="output-card-bi-report"
                      >
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className="w-5 h-5" style={{ color: "#1A4B8C" }} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold" style={{ color: "#1A1A2E" }}>bi_agent_report.xlsx</p>
                            <p className="text-[10px]" style={{ color: "#6B7280" }}>{t.biSidebarDownload}</p>
                          </div>
                          <Button size="sm" className="h-7 px-2 text-[10px] text-white" style={{ backgroundColor: "#1A4B8C" }} onClick={(e) => { e.stopPropagation(); downloadBiReport(); }} data-testid="button-sidebar-bi-download">
                            <Download className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-[10px] py-3 text-center" style={{ color: "#9CA3AF" }}>{t.noOutputsYet}</p>
                )}
              </div>
            )}
          </div>

          <div className="border-b pb-2" style={{ borderColor: "#F3F4F6" }}>
            <h3 
              className="text-[11px] font-semibold mb-2 flex items-center justify-between cursor-pointer hover:bg-gray-50 p-1 rounded transition-colors" 
              style={{ color: "#1A1A2E", borderLeft: isRtl ? "none" : "3px solid #2563EB", borderRight: isRtl ? "3px solid #2563EB" : "none", paddingLeft: isRtl ? 0 : 8, paddingRight: isRtl ? 8 : 0 }}
              onClick={() => setOutputsExpanded(prev => ({ ...prev, sheets: !prev.sheets }))}
            >
              <div className="flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" style={{ color: "#2563EB" }} />
                {t.sheetTracker}
              </div>
              {outputsExpanded.sheets ? <ChevronDown className="w-3 h-3 text-gray-400" /> : <ChevronRight className="w-3 h-3 text-gray-400" />}
            </h3>
            {outputsExpanded.sheets && (
              <div className="animate-in fade-in slide-in-from-top-1 duration-200 px-1">
                {sheetTags.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {sheetTags.map((tag, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium text-white animate-pop-in"
                        style={{ backgroundColor: tag.color, animationDelay: `${i * 80}ms` }}
                        data-testid={`sheet-tag-${i}`}
                      >
                        {tag.label}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] py-2" style={{ color: "#9CA3AF" }}>—</p>
                )}
              </div>
            )}
          </div>

          <div className="pb-4">
            <h3 
              className="text-[11px] font-semibold mb-2 flex items-center justify-between cursor-pointer hover:bg-gray-50 p-1 rounded transition-colors" 
              style={{ color: "#1A1A2E", borderLeft: isRtl ? "none" : "3px solid #2563EB", borderRight: isRtl ? "3px solid #2563EB" : "none", paddingLeft: isRtl ? 0 : 8, paddingRight: isRtl ? 8 : 0 }}
              onClick={() => setOutputsExpanded(prev => ({ ...prev, activity: !prev.activity }))}
            >
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" style={{ color: "#2563EB" }} />
                {t.activityTimeline}
              </div>
              {outputsExpanded.activity ? <ChevronDown className="w-3 h-3 text-gray-400" /> : <ChevronRight className="w-3 h-3 text-gray-400" />}
            </h3>
            {outputsExpanded.activity && (
              <div className="animate-in fade-in slide-in-from-top-1 duration-200 px-1">
                {activityLog.length > 0 ? (
                  <div className="space-y-0">
                    {activityLog.slice(-20).reverse().map((entry, i) => (
                      <div key={i} className="flex items-start gap-2 py-1.5 rounded cursor-pointer hover:bg-gray-50 transition-colors" style={{ borderLeft: isRtl ? "none" : "2px solid #E5E7EB", borderRight: isRtl ? "2px solid #E5E7EB" : "none", paddingLeft: isRtl ? 0 : 10, paddingRight: isRtl ? 10 : 0 }} onClick={() => { const target = entry.messageId ? document.querySelector(`[data-message-id="${entry.messageId}"]`) : document.querySelector("[data-message-id]"); target?.scrollIntoView({ behavior: "smooth", block: "center" }); }}>
                        <span className="text-[11px] flex-shrink-0">{entry.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] truncate" style={{ color: "#1A1A2E" }}>{entry.text}</p>
                          <p className="text-[9px]" style={{ color: "#9CA3AF" }}>{entry.timestamp}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] py-2" style={{ color: "#9CA3AF" }}>{t.noActivityYet}</p>
                )}
              </div>
            )}
          </div>

        </div>
      </ScrollArea>
    </div>
  );
}

function InsightsReportCard({ report, onDownload }: { report: InsightsReport; onDownload: () => void }) {
  const [openSections, setOpenSections] = useState({ descriptive: true, diagnostic: true, analytical: true });
  const toggle = (k: keyof typeof openSections) => setOpenSections(prev => ({ ...prev, [k]: !prev[k] }));

  const s = report.descriptive.summary;
  const es = report.executive_summary;

  const nullPctColor = (pct: number) => pct === 0 ? { bg: "#DCFCE7", text: "#166534" } : pct <= 10 ? { bg: "#FEF9C3", text: "#854D0E" } : { bg: "#FEE2E2", text: "#991B1B" };
  const completenessColor = (pct: number) => pct >= 90 ? { bg: "#DCFCE7", text: "#166534" } : pct >= 70 ? { bg: "#FEF9C3", text: "#854D0E" } : { bg: "#FEE2E2", text: "#991B1B" };
  const statusColor = (status: string) => status === "Good" ? { bg: "#DCFCE7", text: "#166534" } : status === "Acceptable" ? { bg: "#FEF9C3", text: "#854D0E" } : { bg: "#FEE2E2", text: "#991B1B" };
  const strengthColor = (s: string) => s === "Strong" ? "#1E3A8A" : s === "Moderate" ? "#1D4ED8" : "#6B7280";
  const severityColor = (s: string) => s === "High" ? { bg: "#FEE2E2", text: "#991B1B" } : s === "Medium" ? { bg: "#FEF9C3", text: "#C2410C" } : { bg: "#FEFCE8", text: "#854D0E" };
  const directionIcon = (d: string) => d === "Increasing" ? "↑" : d === "Decreasing" ? "↓" : d === "Stable" ? "→" : "⚡";
  const directionColor = (d: string) => d === "Increasing" ? "#166534" : d === "Decreasing" ? "#991B1B" : d === "Volatile" ? "#C2410C" : "#6B7280";
  const riskColor = (r: string) => r === "High" ? "#991B1B" : r === "Medium" ? "#C2410C" : "#166534";
  const noiseColor = (n: string) => n === "High" ? "#991B1B" : n === "Medium" ? "#854D0E" : "#166534";

  const SectionHeader = ({ title, section }: { title: string; section: keyof typeof openSections }) => (
    <button
      onClick={() => toggle(section)}
      className="w-full flex items-center justify-between px-4 py-3 text-left font-bold text-sm text-white rounded-t-xl"
      style={{ backgroundColor: "#1A4B8C" }}
    >
      <span>{title}</span>
      <ChevronDown className={`w-4 h-4 transition-transform ${openSections[section] ? "rotate-180" : ""}`} />
    </button>
  );

  const SubHeader = ({ title }: { title: string }) => (
    <div className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider" style={{ color: "#6B7280", backgroundColor: "#F8FAFF", borderBottom: "1px solid #E5E7EB" }}>{title}</div>
  );

  const Tbl = ({ headers, rows, className }: { headers: string[]; rows: React.ReactNode[][]; className?: string }) => (
    <div className={`overflow-x-auto ${className ?? ""}`}>
      <table className="w-full text-xs">
        <thead>
          <tr style={{ backgroundColor: "#F1F5FB" }}>
            {headers.map((h, i) => <th key={i} className="px-3 py-2 text-left font-semibold text-gray-500 text-[10px] uppercase tracking-wider whitespace-nowrap">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-gray-50 hover:bg-gray-50">
              {row.map((cell, j) => <td key={j} className="px-3 py-2 text-gray-700 align-top">{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-4 mt-2" data-testid="insights-report-card">
      {/* Executive Summary Banner */}
      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "#0D2E5C", borderLeft: "4px solid #F59E0B" }} data-testid="insights-exec-banner">
        <div className="p-5 space-y-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/50 mb-1">Headline Finding</p>
            <p className="text-white font-bold text-base leading-snug">{es.headline_finding}</p>
          </div>
          {es.top_3_insights.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/50 mb-1">Top Insights</p>
              <ol className="space-y-1">
                {es.top_3_insights.map((ins, i) => (
                  <li key={i} className="text-white/90 text-xs flex gap-2"><span className="font-bold text-white/50">{i + 1}.</span>{ins}</li>
                ))}
              </ol>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {es.biggest_risk && (
              <div className="rounded-lg p-3" style={{ backgroundColor: "#991B1B33" }}>
                <p className="text-[10px] font-bold uppercase tracking-wider text-red-300 mb-0.5">Biggest Risk</p>
                <p className="text-red-200 text-xs">{es.biggest_risk}</p>
              </div>
            )}
            {es.immediate_action && (
              <div className="rounded-lg p-3" style={{ backgroundColor: "#16653420" }}>
                <p className="text-[10px] font-bold uppercase tracking-wider text-green-300 mb-0.5">Immediate Action</p>
                <p className="text-green-200 text-xs">{es.immediate_action}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Section 1 — Descriptive */}
      <div className="rounded-xl border border-gray-200 overflow-hidden shadow-sm" data-testid="insights-section-descriptive">
        <SectionHeader title="Section 1 — Descriptive: What Happened?" section="descriptive" />
        {openSections.descriptive && (
          <div className="bg-white divide-y divide-gray-100">
            {/* Stat tiles */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4">
              {[
                { label: "Total Rows", value: s.total_rows.toLocaleString(), icon: "📋" },
                { label: "Total Columns", value: s.total_columns.toLocaleString(), icon: "📊" },
                { label: "Duplicate Rows", value: s.duplicate_rows.toLocaleString(), icon: "🔁" },
                { label: "Completeness", value: `${s.overall_completeness_pct}%`, icon: "✅" },
              ].map((tile, i) => (
                <div key={i} className="rounded-lg p-3 text-center" style={{ backgroundColor: "#F8FAFF", border: "1px solid #E5E7EB" }}>
                  <div className="text-lg">{tile.icon}</div>
                  <div className="text-base font-bold" style={{ color: "#0D2E5C" }}>{tile.value}</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">{tile.label}</div>
                </div>
              ))}
            </div>

            {/* Field Profiles */}
            {report.descriptive.field_profiles.length > 0 && (
              <div>
                <SubHeader title="Field Profiles" />
                <Tbl
                  headers={["Field Name", "Data Type", "Null %", "Unique", "Min", "Max", "Average", "Top Values", "Consistent?", "Insight"]}
                  rows={report.descriptive.field_profiles.map(fp => {
                    const nc = nullPctColor(fp.null_pct);
                    return [
                      <span className="font-mono font-medium">{fp.field_name}</span>,
                      fp.data_type,
                      <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ backgroundColor: nc.bg, color: nc.text }}>{fp.null_pct}%</span>,
                      fp.unique_count,
                      fp.min ?? "—",
                      fp.max ?? "—",
                      fp.average ?? "—",
                      Array.isArray(fp.top_values) ? fp.top_values.slice(0, 3).join(", ") : "—",
                      <span className={fp.data_type_consistent ? "text-green-600 font-bold" : "text-red-600 font-bold"}>{fp.data_type_consistent ? "✅" : "❌"}</span>,
                      <span className="text-[10px] text-gray-600 italic">{fp.insight}</span>,
                    ];
                  })}
                />
              </div>
            )}

            {/* Completeness Scorecard */}
            {report.descriptive.completeness_scorecard.length > 0 && (
              <div>
                <SubHeader title="Completeness Scorecard" />
                <div className="p-4 space-y-2">
                  {[...report.descriptive.completeness_scorecard].sort((a, b) => a.completeness_pct - b.completeness_pct).map((cs, i) => {
                    const sc = completenessColor(cs.completeness_pct);
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-xs text-gray-600 w-36 truncate flex-shrink-0">{cs.field_name}</span>
                        <div className="flex-1 h-4 rounded-full overflow-hidden" style={{ backgroundColor: "#F1F5F9" }}>
                          <div className="h-full rounded-full" style={{ width: `${Math.min(cs.completeness_pct, 100)}%`, backgroundColor: sc.text }} />
                        </div>
                        <span className="text-[10px] font-bold w-8 text-right" style={{ color: sc.text }}>{cs.completeness_pct}%</span>
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: sc.bg, color: sc.text }}>{cs.status}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Date Range */}
            {report.descriptive.date_range && report.descriptive.date_range.date_field_used && (
              <div>
                <SubHeader title="Date Range" />
                <div className="p-4 flex flex-wrap gap-4">
                  {[
                    { label: "Earliest", value: report.descriptive.date_range.earliest },
                    { label: "Latest", value: report.descriptive.date_range.latest },
                    { label: "Span (days)", value: String(report.descriptive.date_range.span_days) },
                    { label: "Field Used", value: report.descriptive.date_range.date_field_used },
                  ].map((item, i) => (
                    <div key={i} className="rounded-lg px-3 py-2" style={{ backgroundColor: "#F0F9FF", border: "1px solid #BAE6FD" }}>
                      <p className="text-[9px] text-gray-500 uppercase tracking-wider">{item.label}</p>
                      <p className="text-xs font-semibold text-gray-800">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Section 2 — Diagnostic */}
      <div className="rounded-xl border border-gray-200 overflow-hidden shadow-sm" data-testid="insights-section-diagnostic">
        <SectionHeader title="Section 2 — Diagnostic: Why Did It Happen?" section="diagnostic" />
        {openSections.diagnostic && (
          <div className="bg-white divide-y divide-gray-100">
            {report.diagnostic.correlations.length > 0 && (
              <div>
                <SubHeader title="Correlations" />
                <Tbl
                  headers={["Field A", "Field B", "Relationship", "Strength", "Business Meaning"]}
                  rows={report.diagnostic.correlations.map(c => [
                    c.field_a, c.field_b, c.relationship,
                    <span className="font-bold" style={{ color: strengthColor(c.strength) }}>{c.strength}</span>,
                    c.business_meaning,
                  ])}
                />
              </div>
            )}

            {report.diagnostic.outliers.length > 0 && (
              <div>
                <SubHeader title="Outliers" />
                <Tbl
                  headers={["Field Name", "Outlier Description", "Est. Affected Rows", "Possible Cause"]}
                  rows={report.diagnostic.outliers.map(o => [
                    o.field_name, o.outlier_description,
                    <span className={o.affected_rows_estimate > 100 ? "font-bold text-red-600" : ""}>{o.affected_rows_estimate.toLocaleString()}</span>,
                    o.possible_cause,
                  ])}
                />
              </div>
            )}

            {report.diagnostic.skewness.length > 0 && (
              <div>
                <SubHeader title="Distribution Shape" />
                <Tbl
                  headers={["Field Name", "Distribution Shape", "Implication"]}
                  rows={report.diagnostic.skewness.map(sk => [
                    sk.field_name,
                    <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ backgroundColor: "#EDE9FE", color: "#6D28D9" }}>{sk.distribution_shape}</span>,
                    sk.implication,
                  ])}
                />
              </div>
            )}

            {report.diagnostic.trends.length > 0 && (
              <div>
                <SubHeader title="Trends" />
                <Tbl
                  headers={["Field Name", "Trend Type", "Direction", "Observation"]}
                  rows={report.diagnostic.trends.map(tr => [
                    tr.field_name, tr.trend_type,
                    <span className="font-bold" style={{ color: directionColor(tr.direction) }}>{directionIcon(tr.direction)} {tr.direction}</span>,
                    tr.observation,
                  ])}
                />
              </div>
            )}

            {report.diagnostic.cohort_comparison.length > 0 && (
              <div>
                <SubHeader title="Cohort Comparison" />
                <Tbl
                  headers={["Cohort Field", "Cohorts Found", "Key Difference", "Business Implication"]}
                  rows={report.diagnostic.cohort_comparison.map(c => [
                    c.cohort_field,
                    c.cohorts_identified.join(", "),
                    c.key_difference,
                    c.business_implication,
                  ])}
                />
              </div>
            )}

            {report.diagnostic.funnel_dropoff.length > 0 && (
              <div>
                <SubHeader title="Funnel Drop-off" />
                <div className="p-4 space-y-3">
                  {report.diagnostic.funnel_dropoff.map((stage, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-gray-700">{stage.stage}</span>
                        <span className={`font-bold ${stage.dropoff_pct > 20 ? "text-red-600" : "text-gray-600"}`}>{stage.dropoff_pct}% drop</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-5 rounded flex items-center justify-center text-[10px] font-bold text-white" style={{ width: "100%", backgroundColor: "#1A4B8C", opacity: Math.max(0.3, 1 - i * 0.15) }}>
                          {stage.records_in.toLocaleString()} in → {stage.records_out.toLocaleString()} out
                        </div>
                      </div>
                      {stage.likely_cause && <p className="text-[10px] text-gray-500 italic">{stage.likely_cause}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {report.diagnostic.cross_field_violations.length > 0 && (
              <div>
                <SubHeader title="Cross-field Violations" />
                <Tbl
                  headers={["Fields Involved", "Violation Description", "Est. Affected Rows", "Severity"]}
                  rows={report.diagnostic.cross_field_violations.map(v => {
                    const sc = severityColor(v.severity);
                    return [
                      v.fields_involved.join(", "),
                      v.violation_description,
                      v.affected_rows_estimate.toLocaleString(),
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ backgroundColor: sc.bg, color: sc.text }}>{v.severity}</span>,
                    ];
                  })}
                />
              </div>
            )}

            {report.diagnostic.concentration_report.length > 0 && (
              <div>
                <SubHeader title="Concentration Report" />
                <Tbl
                  headers={["Field Name", "Top 10% Contribution", "Observation"]}
                  rows={report.diagnostic.concentration_report.map(c => [
                    c.field_name,
                    <span className="font-bold" style={{ color: "#1A4B8C" }}>{c.top_10pct_contribution}</span>,
                    c.observation,
                  ])}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Section 3 — Analytical */}
      <div className="rounded-xl border border-gray-200 overflow-hidden shadow-sm" data-testid="insights-section-analytical">
        <SectionHeader title="Section 3 — Analytical: What Does It Mean?" section="analytical" />
        {openSections.analytical && (
          <div className="bg-white divide-y divide-gray-100">
            {report.analytical.segments.length > 0 && (
              <div>
                <SubHeader title="Segments" />
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {report.analytical.segments.map((seg, i) => (
                    <div key={i} className="rounded-xl border border-gray-100 p-4 space-y-2" style={{ backgroundColor: "#F8FAFF" }}>
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <p className="font-bold text-sm" style={{ color: "#0D2E5C" }}>{seg.segment_name}</p>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: "#DBEAFE", color: "#1E3A8A" }}>{seg.estimated_size_pct}%</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {seg.defining_characteristics.map((ch, j) => (
                          <span key={j} className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: "#E5E7EB", color: "#374151" }}>{ch}</span>
                        ))}
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed">{seg.business_meaning}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {report.analytical.contribution_analysis.length > 0 && (
              <div>
                <SubHeader title="Contribution Analysis" />
                <Tbl
                  headers={["Field Name", "Top Contributors", "Contribution %", "Insight"]}
                  rows={report.analytical.contribution_analysis.map(c => [
                    c.field_name,
                    c.top_contributors.join(", "),
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-3 rounded-full" style={{ backgroundColor: "#E5E7EB" }}>
                        <div className="h-full rounded-full" style={{ width: `${Math.min(c.contribution_pct, 100)}%`, backgroundColor: "#1A4B8C" }} />
                      </div>
                      <span className="text-[10px] font-bold" style={{ color: "#1A4B8C" }}>{c.contribution_pct}%</span>
                    </div>,
                    c.insight,
                  ])}
                />
              </div>
            )}

            {report.analytical.lineage_quality.length > 0 && (
              <div>
                <SubHeader title="Data Lineage Quality" />
                <Tbl
                  headers={["Field Name", "Error Propagation Risk", "Downstream Impact", "Recommendation"]}
                  rows={report.analytical.lineage_quality.map(l => [
                    l.field_name,
                    <span className="font-bold" style={{ color: riskColor(l.error_propagation_risk) }}>{l.error_propagation_risk}</span>,
                    l.downstream_impact,
                    l.recommendation,
                  ])}
                />
              </div>
            )}

            {report.analytical.time_series_decomposition.length > 0 && (
              <div>
                <SubHeader title="Time Series Decomposition" />
                <Tbl
                  headers={["Field Name", "Trend", "Seasonality", "Noise Level", "Insight"]}
                  rows={report.analytical.time_series_decomposition.map(ts => [
                    ts.field_name, ts.trend, ts.seasonality,
                    <span className="font-bold" style={{ color: noiseColor(ts.noise_level) }}>{ts.noise_level}</span>,
                    ts.insight,
                  ])}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Download */}
      <button
        onClick={onDownload}
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-all hover:opacity-90"
        style={{ backgroundColor: "#2E7D32" }}
        data-testid="button-download-insights-report"
      >
        <Download className="w-4 h-4" />
        📥 Download Insights Report
      </button>
    </div>
  );
}

function NudgeResultCard({ report, t }: { report: NudgeReport; t: Translation }) {
  const riskBadge = (level: string) => {
    const c = nudgeRiskColor(level);
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ backgroundColor: c.bg, color: c.text }}>{level}</span>;
  };
  const recBadge = (level: string) => {
    const mapped = level === "High" ? "Low" : level === "Low" ? "High" : "Medium";
    const c = nudgeRiskColor(mapped);
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ backgroundColor: c.bg, color: c.text }}>{level}</span>;
  };

  return (
    <div className="space-y-4 mt-2">
      {/* Summary Banner */}
      <div className="rounded-xl p-4 grid grid-cols-2 md:grid-cols-5 gap-3" style={{ backgroundColor: "#0D2E5C" }} data-testid="nudge-summary-banner">
        {[
          { label: t.nudgeStatRootCause as string, value: report.diagnosis.primary_root_cause.split(" ").slice(0, 4).join(" ") + "…" },
          { label: t.nudgeStatSegments as string, value: String(report.segments.length) },
          { label: t.nudgeStatLevers as string, value: String(report.levers.length) },
          { label: t.nudgeStatQuickWins as string, value: String(report.intervention_plan.quick_wins.length) },
          { label: t.nudgeStatLift as string, value: report.intervention_plan.estimated_lift },
        ].map(({ label, value }, i) => (
          <div key={i} className="text-center">
            <div className="text-white font-bold text-lg leading-tight truncate">{value}</div>
            <div className="text-white/60 text-[11px] mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Section A — Diagnosis */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden" data-testid="nudge-section-diagnosis">
        <div className="px-5 py-3 border-b border-gray-100" style={{ backgroundColor: "#F8FAFF" }}>
          <h2 className="font-bold text-gray-800 text-sm">{t.nudgeSectionDiagnosis as string}</h2>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">{t.nudgeLabelPrimary as string}</p>
            <div className="px-4 py-3 rounded-lg font-semibold text-white text-sm" style={{ backgroundColor: "#2563EB" }}>{report.diagnosis.primary_root_cause}</div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t.nudgeLabelIntentional as string}</span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold" style={report.diagnosis.is_intentional ? { backgroundColor: "#FEE2E2", color: "#991B1B" } : { backgroundColor: "#DCFCE7", color: "#166534" }}>
              {report.diagnosis.is_intentional ? t.nudgeLabelYes as string : t.nudgeLabelNo as string}
            </span>
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-2">{t.nudgeSeverity as string}</span>
            {riskBadge(report.severity)}
          </div>
          {report.diagnosis.secondary_root_causes?.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">{t.nudgeLabelSecondary as string}</p>
              <div className="flex flex-wrap gap-1.5">
                {report.diagnosis.secondary_root_causes.map((c, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-full text-xs bg-blue-50 text-blue-700 border border-blue-100">{c}</span>
                ))}
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {report.diagnosis.emotional_drivers?.length > 0 && (
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">{t.nudgeLabelEmotional as string}</p>
                <ul className="space-y-1">
                  {report.diagnosis.emotional_drivers.map((d, i) => (
                    <li key={i} className="flex gap-2 text-sm text-gray-700"><span className="text-blue-400 flex-shrink-0">•</span>{d}</li>
                  ))}
                </ul>
              </div>
            )}
            {report.diagnosis.friction_points?.length > 0 && (
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">{t.nudgeLabelFriction as string}</p>
                <ul className="space-y-1">
                  {report.diagnosis.friction_points.map((f, i) => (
                    <li key={i} className="flex gap-2 text-sm text-gray-700"><span className="text-orange-400 flex-shrink-0">•</span>{f}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          {report.diagnosis.rationale && (
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">{t.nudgeLabelRationale as string}</p>
              <p className="text-sm text-gray-600 italic">{report.diagnosis.rationale}</p>
            </div>
          )}
        </div>
      </div>

      {/* Section B — Segments */}
      {report.segments?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden" data-testid="nudge-section-segments">
          <div className="px-5 py-3 border-b border-gray-100" style={{ backgroundColor: "#F8FAFF" }}>
            <h2 className="font-bold text-gray-800 text-sm">{t.nudgeSectionSegments as string}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100" style={{ backgroundColor: "#F8FAFF" }}>
                  {[t.nudgeColSegment, t.nudgeColArchetype, t.nudgeColPop, t.nudgeColRisk, t.nudgeColBarrier, t.nudgeColRec, t.nudgeColChannel, t.nudgeColTiming].map((h, i) => (
                    <th key={i} className="px-3 py-2.5 text-left font-semibold text-gray-500 uppercase tracking-wider text-[10px]">{h as string}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.segments.map((seg, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-3 py-2.5 font-medium text-gray-800">{seg.name}</td>
                    <td className="px-3 py-2.5 text-gray-600">{seg.archetype}</td>
                    <td className="px-3 py-2.5 text-gray-600">{seg.population_pct}%</td>
                    <td className="px-3 py-2.5">{riskBadge(seg.risk_level)}</td>
                    <td className="px-3 py-2.5 text-gray-600 max-w-[160px] truncate">{seg.main_barrier}</td>
                    <td className="px-3 py-2.5">{recBadge(seg.receptiveness)}</td>
                    <td className="px-3 py-2.5 text-gray-600">{seg.best_channel}</td>
                    <td className="px-3 py-2.5 text-gray-600">{seg.best_timing}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Section C — Levers */}
      {report.levers?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden" data-testid="nudge-section-levers">
          <div className="px-5 py-3 border-b border-gray-100" style={{ backgroundColor: "#F8FAFF" }}>
            <h2 className="font-bold text-gray-800 text-sm">{t.nudgeSectionLevers as string}</h2>
          </div>
          <div className="p-5 space-y-4">
            {report.levers.map((lever, i) => {
              const prio = nudgePriorityColor(lever.priority);
              return (
                <div key={i} className="border border-gray-100 rounded-xl p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{lever.type}</span>
                      <h3 className="font-semibold text-gray-800 text-sm mt-0.5">{lever.name}</h3>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold flex-shrink-0" style={{ backgroundColor: prio.bg, color: prio.text }}>{lever.priority}</span>
                  </div>
                  <div className="px-4 py-3 rounded-lg text-sm font-medium" style={{ backgroundColor: "#FEFCE8", borderLeft: "3px solid #EAB308" }}>
                    {lever.message_text}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div><p className="text-gray-400 font-bold uppercase tracking-wider mb-1">{t.nudgeLabelChannelTiming as string}</p><p className="text-gray-600">{lever.channel} · {lever.timing}</p></div>
                    <div><p className="text-gray-400 font-bold uppercase tracking-wider mb-1">{t.nudgeLabelImpact as string}</p><p className="text-gray-600">{lever.expected_impact} · {lever.implementation_effort}</p></div>
                    <div><p className="text-gray-400 font-bold uppercase tracking-wider mb-1">{t.nudgeLabelPrimary as string}</p><div className="flex flex-wrap gap-1">{lever.target_segments.map((s, j) => <span key={j} className="px-1.5 py-0.5 rounded text-[10px] bg-blue-50 text-blue-700">{s}</span>)}</div></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Section D — Intervention Plan */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden" data-testid="nudge-section-plan">
        <div className="px-5 py-3 border-b border-gray-100" style={{ backgroundColor: "#F8FAFF" }}>
          <h2 className="font-bold text-gray-800 text-sm">{t.nudgeSectionPlan as string}</h2>
        </div>
        <div className="p-5 space-y-4">
          {report.intervention_plan.recommended_sequence?.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">{t.nudgeLabelSeq as string}</p>
              <div className="flex flex-wrap items-center gap-2">
                {report.intervention_plan.recommended_sequence.map((step, i) => (
                  <span key={i} className="flex items-center gap-1.5">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-50 text-blue-800 border border-blue-100">{step}</span>
                    {i < report.intervention_plan.recommended_sequence.length - 1 && <span className="text-gray-300 text-xs">→</span>}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {report.intervention_plan.quick_wins?.length > 0 && (
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">{t.nudgeLabelQuickWins as string}</p>
                <ul className="space-y-1.5">
                  {report.intervention_plan.quick_wins.map((w, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700"><CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />{w}</li>
                  ))}
                </ul>
              </div>
            )}
            {report.intervention_plan.kpis?.length > 0 && (
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">{t.nudgeLabelKpis as string}</p>
                <ul className="space-y-1.5">
                  {report.intervention_plan.kpis.map((kpi, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700"><Activity className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />{kpi}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div className="px-4 py-3 rounded-lg flex items-center gap-3" style={{ backgroundColor: "#0D2E5C10", borderLeft: "3px solid #0D2E5C" }}>
            <TrendingUp className="w-4 h-4 flex-shrink-0" style={{ color: "#0D2E5C" }} />
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t.nudgeLabelLift as string}</p>
              <p className="text-sm font-semibold" style={{ color: "#0D2E5C" }}>{report.intervention_plan.estimated_lift}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Download */}
      <button
        onClick={() => generateNudgeExcel(report)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-all hover:opacity-90"
        style={{ backgroundColor: "#2E7D32" }}
        data-testid="button-download-nudge-report"
      >
        <Download className="w-4 h-4" />
        {t.nudgeDownload as string}
      </button>
    </div>
  );
}

function BiResultCard({ biReport, isRtl, lang }: { biReport: BiReport; isRtl: boolean; lang: Lang }) {
  const { tab, data } = biReport;
  const t = translations[lang];
  const [biTcStatus, setBiTcStatus] = useState<Record<string, "pass" | "fail" | null>>({});
  return (
    <div className="space-y-3 mt-2" data-testid="bi-result-card">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: "#1A4B8C", color: "#ffffff" }}>BI {BI_TABS.find(tb => tb.key === tab)?.label || tab}</span>
      </div>
      {tab === "sharing" && <BiSharingResult data={data} t={t} />}
      {tab === "dashboard" && <BiDashboardResult data={data} t={t} />}
      {tab === "report" && <BiReportResult data={data} t={t} />}
      {tab === "testcases" && <BiTestCaseResult data={data} t={t} testStatus={biTcStatus} setTestStatus={setBiTcStatus} />}
      {tab === "dashtest" && <BiDashboardTestResult data={data} t={t} testStatus={biTcStatus} setTestStatus={setBiTcStatus} />}
    </div>
  );
}

function BiSharingResult({ data, t }: { data: Record<string, unknown>; t: Translation }) {
  const [expandedField, setExpandedField] = useState<string | null>(null);
  const verdict = String(data.overall_verdict || "BLOCKED");
  const vc = BI_VERDICT_COLORS[verdict] || BI_VERDICT_COLORS.BLOCKED;
  const assessments = (data.field_assessments || []) as Record<string, unknown>[];
  const checklist = (data.approval_checklist || []) as Record<string, unknown>[];
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());

  return (
    <>
      <div className="rounded-xl p-4 mb-3" style={{ backgroundColor: `${vc.bg}`, border: `2px solid ${vc.border}55`, borderLeft: `6px solid ${vc.border}` }} data-testid="bi-verdict-banner">
        <div className="text-lg font-extrabold mb-1" style={{ color: vc.fg }}>{verdict}</div>
        <div className="text-xs mb-2" style={{ color: "#6B7280" }}>{String(data.verdict_rationale || "")}</div>
        <div className="flex gap-4 flex-wrap text-xs">
          <span style={{ color: "#6B7280" }}>{t.biClassification as string} <strong style={{ color: "#1A1A2E" }}>{String(data.overall_classification || "")}</strong></span>
          <span style={{ color: "#6B7280" }}>{t.biGoverning as string} <strong style={{ color: "#E65100" }}>{String(data.governing_field || "")}</strong></span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        {[
          { label: t.biGeneralPublic as string, tier: "PUBLIC" },
          { label: t.biPrivateSector as string, tier: "PRIVATE_SECTOR" },
          { label: t.biGovEntities as string, tier: "INTERNAL_GOV" },
        ].map(rec => {
          const tierAssess = assessments.map(f => {
            const cls = String(f.classification_code || "P");
            if (cls === "P") return { field: String(f.field_name), verdict: "SEND" };
            if (cls === "TS") return { field: String(f.field_name), verdict: "BLOCK" };
            if (cls === "S") return { field: String(f.field_name), verdict: rec.tier === "INTERNAL_GOV" ? "CONDITIONAL" : "BLOCK" };
            if (rec.tier === "PUBLIC") return { field: String(f.field_name), verdict: "BLOCK" };
            if (rec.tier === "PRIVATE_SECTOR") return { field: String(f.field_name), verdict: "CONDITIONAL" };
            return { field: String(f.field_name), verdict: "CONDITIONAL" };
          });
          const blocked = tierAssess.filter(a => a.verdict === "BLOCK");
          const cond = tierAssess.filter(a => a.verdict === "CONDITIONAL");
          const recVerdict = blocked.length > 0 ? "BLOCK" : cond.length > 0 ? "CONDITIONAL" : "SEND";
          const recColor = recVerdict === "SEND" ? "#2E7D32" : recVerdict === "BLOCK" ? "#B71C1C" : "#E65100";
          return (
            <div key={rec.tier} className="rounded-lg p-3 border" style={{ borderColor: `${recColor}44`, borderTop: `3px solid ${recColor}` }} data-testid={`recipient-${rec.tier}`}>
              <div className="text-xs font-bold mb-1" style={{ color: recColor }}>{rec.label}</div>
              <div className="text-[10px] font-bold uppercase" style={{ color: recColor }}>{recVerdict}</div>
            </div>
          );
        })}
      </div>

      {checklist.length > 0 && (
        <div className="rounded-lg p-3 mb-3 border" style={{ borderColor: "#E6510044", backgroundColor: "#FFF3E0" }} data-testid="approval-checklist">
          <div className="text-xs font-bold mb-2" style={{ color: "#E65100" }}>📋 {t.biApprovalChecklist as string}</div>
          {checklist.map((item, i) => (
            <label key={i} className="flex items-start gap-2 py-1 text-[11px] cursor-pointer" style={{ color: "#374151" }}>
              <input type="checkbox" checked={checkedItems.has(i)} onChange={() => setCheckedItems(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; })} style={{ accentColor: "#2E7D32", marginTop: 2 }} />
              <span>{String(item.item || "")}</span>
            </label>
          ))}
        </div>
      )}

      {assessments.length > 0 && (
        <div className="rounded-lg overflow-hidden border" style={{ borderColor: "#E5E7EB" }} data-testid="bi-field-table">
          <table className="w-full text-[10px]">
            <thead>
              <tr style={{ backgroundColor: "#F3F4F6" }}>
                {[t.biField as string, t.biClass as string, "PII", t.biVerdict as string].map(h => (
                  <th key={h} className="px-2 py-1.5 text-left font-semibold" style={{ color: "#6B7280", borderBottom: "1px solid #E5E7EB" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {assessments.slice(0, 10).map((f, idx) => (
                <Fragment key={String(f.field_name)}>
                  <tr onClick={() => setExpandedField(expandedField === String(f.field_name) ? null : String(f.field_name))} className="cursor-pointer hover:bg-gray-50" style={{ backgroundColor: idx % 2 === 0 ? "#fff" : "#F9FAFB" }} data-testid={`row-bi-field-${f.field_name}`}>
                    <td className="px-2 py-1.5 font-medium" style={{ color: "#1A1A2E" }}>{String(f.field_name)}</td>
                    <td className="px-2 py-1.5">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold text-white" style={{ backgroundColor: f.classification_code === "TS" ? "#1A1A2E" : f.classification_code === "S" ? "#C0392B" : f.classification_code === "C" ? "#E65100" : "#1B5E20" }}>{String(f.classification_code)}</span>
                    </td>
                    <td className="px-2 py-1.5">{f.is_pii ? <span className="font-bold" style={{ color: "#DC2626" }}>YES</span> : <span style={{ color: "#9CA3AF" }}>NO</span>}</td>
                    <td className="px-2 py-1.5">
                      <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold" style={{ color: f.stakeholder_verdict === "SEND" ? "#2E7D32" : f.stakeholder_verdict === "BLOCK" ? "#B71C1C" : "#E65100", backgroundColor: f.stakeholder_verdict === "SEND" ? "#DCFCE7" : f.stakeholder_verdict === "BLOCK" ? "#FEE2E2" : "#FEF3C7" }}>{String(f.stakeholder_verdict)}</span>
                    </td>
                  </tr>
                  {expandedField === String(f.field_name) && (
                    <tr><td colSpan={4} className="px-3 py-2 text-[10px]" style={{ backgroundColor: "#F0F9FF", color: "#374151" }}>
                      <div><strong>{t.biDetail as string}</strong> {String(f.remediation_detail || "—")}</div>
                    </td></tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
          {assessments.length > 10 && <div className="text-[10px] text-center py-1.5" style={{ color: "#9CA3AF" }}>+ {assessments.length - 10} more fields</div>}
        </div>
      )}
    </>
  );
}

function BiDashboardResult({ data, t }: { data: Record<string, unknown>; t: Translation }) {
  const [activePage, setActivePage] = useState(0);
  const pages = (data.pages || []) as Record<string, unknown>[];
  const kpis = (data.kpis || []) as Record<string, unknown>[];
  const VISUAL_COLORS: Record<string, string> = { "KPI Card": "#1A4B8C", "Bar Chart": "#2E7D32", "Line Chart": "#2E7D32", "Donut Chart": "#E65100", "Slicer": "#6B7280", "Table": "#0D2E5C", "Matrix": "#0D2E5C" };

  return (
    <>
      <div className="mb-3">
        <div className="text-base font-extrabold mb-1" style={{ color: "#1A1A2E" }}>{String(data.dashboard_title || "")}</div>
        <div className="flex gap-2 text-[11px]">
          <span className="px-2 py-0.5 rounded-full" style={{ backgroundColor: "#EFF6FF", color: "#1A4B8C", border: "1px solid #BFDBFE" }}>{String(data.dashboard_type || "")}</span>
          <span className="px-2 py-0.5 rounded-full" style={{ backgroundColor: "#F0FDF4", color: "#2E7D32", border: "1px solid #BBF7D0" }}>{String(data.audience || "")}</span>
        </div>
      </div>

      {kpis.length > 0 && (
        <div className="grid gap-2 mb-3" style={{ gridTemplateColumns: `repeat(${Math.min(kpis.length, 4)}, 1fr)` }}>
          {kpis.map((k, i) => (
            <div key={i} className="rounded-lg p-3 border" style={{ borderColor: "#BFDBFE", backgroundColor: "#EFF6FF" }} data-testid={`kpi-card-${i}`}>
              <div className="text-[11px] font-bold mb-1" style={{ color: "#1A4B8C" }}>{String(k.kpi_name || "")}</div>
              <div className="text-[9px] font-mono" style={{ color: "#6B7280" }}>{String(k.dax_formula || "").substring(0, 50)}</div>
            </div>
          ))}
        </div>
      )}

      {pages.length > 1 && (
        <div className="flex gap-1 mb-3">
          {pages.map((p, i) => (
            <button key={i} onClick={() => setActivePage(i)} className="px-3 py-1 rounded-lg text-[11px]" style={{ backgroundColor: i === activePage ? "#EFF6FF" : "transparent", color: i === activePage ? "#1A4B8C" : "#9CA3AF", border: `1px solid ${i === activePage ? "#BFDBFE" : "#E5E7EB"}`, fontWeight: i === activePage ? 700 : 400 }} data-testid={`page-tab-${i}`}>
              {String(p.page_title || `Page ${i + 1}`)}
            </button>
          ))}
        </div>
      )}

      {pages[activePage] && (
        <div className="grid grid-cols-2 gap-2 mb-3">
          {((pages[activePage].visuals || []) as Record<string, unknown>[]).slice(0, 8).map((v, i) => {
            const vType = String(v.visual_type || "");
            const bc = VISUAL_COLORS[vType] || "#1A4B8C";
            return (
              <div key={i} className="rounded-lg p-3 border" style={{ borderColor: `${bc}33`, borderTop: `3px solid ${bc}`, backgroundColor: "#FAFAFA" }} data-testid={`visual-card-${v.visual_id}`}>
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-[9px] font-bold px-1.5 rounded" style={{ backgroundColor: `${bc}15`, color: bc }}>{vType}</span>
                </div>
                <div className="text-[11px] font-bold mb-1" style={{ color: "#1A1A2E" }}>{String(v.title || "")}</div>
                <div className="text-[9px]" style={{ color: "#6B7280" }}>{String(v.insight_purpose || "")}</div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function BiReportResult({ data, t }: { data: Record<string, unknown>; t: Translation }) {
  const [expandedSection, setExpandedSection] = useState<string | null>("governance");
  const verdict = String(data.governance_verdict || "BLOCKED");
  const sendRec = String(data.send_recommendation || "DO NOT SEND");
  const score = Number(data.overall_quality_score || 0);
  const grade = String(data.quality_grade || "F");
  const dims = (data.dimension_scores || {}) as Record<string, number>;
  const govIssues = (data.governance_issues || []) as Record<string, unknown>[];
  const dqIssues = (data.data_quality_issues || []) as Record<string, unknown>[];
  const blIssues = (data.business_logic_issues || []) as Record<string, unknown>[];
  const prIssues = (data.presentation_issues || []) as Record<string, unknown>[];
  const checklist = (data.pre_send_checklist || []) as string[];
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());

  const sendColor = sendRec === "SEND NOW" ? "#2E7D32" : sendRec === "SEND AFTER FIXES" ? "#E65100" : "#B71C1C";
  const vc = BI_VERDICT_COLORS[verdict] || BI_VERDICT_COLORS.BLOCKED;
  const scoreColor = (v: number) => v >= 80 ? "#2E7D32" : v >= 60 ? "#F59E0B" : "#B71C1C";

  const sections = [
    { key: "governance", label: t.biGovernance as string, issues: govIssues },
    { key: "quality", label: t.biDataQuality as string, issues: dqIssues },
    { key: "logic", label: t.biBusinessLogic as string, issues: blIssues },
    { key: "presentation", label: t.biPresentation as string, issues: prIssues },
  ];

  return (
    <>
      <div className="flex items-center gap-4 rounded-xl p-4 mb-3" style={{ backgroundColor: `${vc.bg}`, border: `2px solid ${vc.border}55` }} data-testid="report-verdict-banner">
        <div className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${sendColor}18`, border: `3px solid ${sendColor}` }}>
          <span className="text-xl font-black" style={{ color: sendColor }}>{score}</span>
        </div>
        <div>
          <div className="text-base font-extrabold" style={{ color: sendColor }}>{sendRec}</div>
          <div className="text-[11px]" style={{ color: "#6B7280" }}>{t.biGovernance as string}: <strong style={{ color: vc.fg }}>{verdict}</strong> · {t.biGrade as string}: <strong>{grade}</strong></div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-3">
        {Object.entries(dims).map(([k, v]) => (
          <div key={k} className="rounded-lg p-2 border" style={{ borderColor: "#E5E7EB" }} data-testid={`dim-${k}`}>
            <div className="text-[10px] mb-1" style={{ color: "#6B7280" }}>{k.replace(/_/g, " ")}</div>
            <div className="rounded-full h-1.5 overflow-hidden" style={{ backgroundColor: "#E5E7EB" }}>
              <div style={{ width: `${v}%`, height: "100%", backgroundColor: scoreColor(v), borderRadius: 6 }} />
            </div>
            <div className="text-[10px] font-bold mt-0.5" style={{ color: scoreColor(v) }}>{v}/100</div>
          </div>
        ))}
      </div>

      {sections.map(sec => (
        <div key={sec.key} className="mb-2">
          <div onClick={() => setExpandedSection(expandedSection === sec.key ? null : sec.key)} className="px-3 py-2 rounded-lg cursor-pointer flex justify-between items-center" style={{ backgroundColor: "#F3F4F6", border: "1px solid #E5E7EB" }} data-testid={`section-${sec.key}`}>
            <span className="text-xs font-semibold" style={{ color: "#374151" }}>{sec.label} ({sec.issues.length})</span>
            <span className="text-[10px]" style={{ color: "#9CA3AF" }}>{expandedSection === sec.key ? "▲" : "▼"}</span>
          </div>
          {expandedSection === sec.key && sec.issues.length > 0 && (
            <div className="border border-t-0 rounded-b-lg overflow-hidden" style={{ borderColor: "#E5E7EB" }}>
              {sec.issues.map((issue, i) => {
                const sev = String((issue as Record<string, unknown>).severity || "Medium");
                const sc = BI_SEVERITY_COLORS[sev] || BI_SEVERITY_COLORS.Medium;
                return (
                  <div key={i} className="px-3 py-2 text-[11px]" style={{ borderBottom: "1px solid #F3F4F6", borderLeft: sev === "Critical" ? "3px solid #B71C1C" : "3px solid transparent", backgroundColor: i % 2 === 0 ? "#fff" : "#F9FAFB" }}>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="px-1.5 py-0.5 rounded text-[8px] font-bold" style={{ backgroundColor: sc.bg, color: sc.fg }}>{sev}</span>
                      <span className="font-semibold" style={{ color: "#374151" }}>{String((issue as Record<string, unknown>).issue_id || (issue as Record<string, unknown>).field_name || "")}</span>
                    </div>
                    <div style={{ color: "#6B7280" }}>{String((issue as Record<string, unknown>).description || (issue as Record<string, unknown>).remediation || "")}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}

      {checklist.length > 0 && (
        <div className="rounded-lg p-3 mt-2 border" style={{ borderColor: "#BFDBFE", backgroundColor: "#EFF6FF" }} data-testid="pre-send-checklist">
          <div className="text-xs font-bold mb-2" style={{ color: "#1A4B8C" }}>✅ {t.biPreSendChecklist as string}</div>
          {checklist.map((item, i) => (
            <label key={i} className="flex items-center gap-2 py-0.5 text-[11px] cursor-pointer" style={{ color: "#374151" }}>
              <input type="checkbox" checked={checkedItems.has(i)} onChange={() => setCheckedItems(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; })} style={{ accentColor: "#2E7D32" }} />
              {item}
            </label>
          ))}
        </div>
      )}
    </>
  );
}

function BiTestCaseResult({ data, t, testStatus, setTestStatus }: { data: Record<string, unknown>; t: Translation; testStatus: Record<string, "pass" | "fail" | null>; setTestStatus: (fn: (prev: Record<string, "pass" | "fail" | null>) => Record<string, "pass" | "fail" | null>) => void }) {
  const cases = (data.test_cases || []) as Record<string, unknown>[];
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [expandedCase, setExpandedCase] = useState<string | null>(null);
  const totalCases = cases.length;
  const passed = cases.filter(tc => testStatus[String(tc.tc_id)] === "pass").length;
  const failed = cases.filter(tc => testStatus[String(tc.tc_id)] === "fail").length;
  const notRun = totalCases - passed - failed;

  const categories = [...new Set(cases.map(tc => String(tc.category || "")))];
  const filtered = activeCategory ? cases.filter(tc => String(tc.category) === activeCategory) : cases;

  return (
    <>
      <div className="flex gap-3 mb-3 flex-wrap">
        <div className="rounded-lg p-3 text-center border" style={{ borderColor: "#BFDBFE", backgroundColor: "#EFF6FF" }}>
          <div className="text-lg font-extrabold" style={{ color: "#1A1A2E" }}>{totalCases}</div>
          <div className="text-[10px]" style={{ color: "#6B7280" }}>{t.biTotal as string}</div>
        </div>
        <div className="rounded-lg p-3 text-center border" style={{ borderColor: "#FECACA", backgroundColor: "#FEF2F2" }}>
          <div className="text-lg font-extrabold" style={{ color: "#DC2626" }}>{Number(data.critical_test_count || 0)}</div>
          <div className="text-[10px]" style={{ color: "#6B7280" }}>{t.biCritical as string}</div>
        </div>
      </div>

      <div className="rounded-lg p-2.5 mb-3 flex items-center gap-3 border" style={{ borderColor: "#E5E7EB" }} data-testid="test-progress">
        <div className="text-[10px]" style={{ color: "#6B7280" }}>{t.biProgress as string}</div>
        <div className="flex-1 rounded-full h-2.5 overflow-hidden flex" style={{ backgroundColor: "#E5E7EB" }}>
          {passed > 0 && <div style={{ width: `${(passed / totalCases) * 100}%`, backgroundColor: "#2E7D32", height: "100%" }} />}
          {failed > 0 && <div style={{ width: `${(failed / totalCases) * 100}%`, backgroundColor: "#DC2626", height: "100%" }} />}
        </div>
        <div className="text-[10px] whitespace-nowrap" style={{ color: "#6B7280" }}>
          <span style={{ color: "#2E7D32" }}>{passed}✓</span> / <span style={{ color: "#DC2626" }}>{failed}✕</span> / {notRun}○
        </div>
      </div>

      <div className="flex gap-1 mb-3 flex-wrap">
        <button onClick={() => setActiveCategory(null)} className="px-2 py-1 rounded-lg text-[10px]" style={{ backgroundColor: activeCategory === null ? "#EFF6FF" : "transparent", color: activeCategory === null ? "#1A4B8C" : "#9CA3AF", border: `1px solid ${activeCategory === null ? "#BFDBFE" : "#E5E7EB"}` }}>{t.biAll as string}</button>
        {categories.map(cat => (
          <button key={cat} onClick={() => setActiveCategory(cat)} className="px-2 py-1 rounded-lg text-[10px]" style={{ backgroundColor: activeCategory === cat ? "#EFF6FF" : "transparent", color: activeCategory === cat ? "#1A4B8C" : "#9CA3AF", border: `1px solid ${activeCategory === cat ? "#BFDBFE" : "#E5E7EB"}` }} data-testid={`cat-filter-${cat}`}>{cat}</button>
        ))}
      </div>

      <div className="flex justify-end mb-2">
        <button onClick={() => { exportTestRunSheet(cases, testStatus); downloadBiReport(); }} className="text-[10px] font-semibold px-3 py-1 rounded-lg" style={{ background: "linear-gradient(135deg, #1B5E20, #2E7D32)", color: "#fff" }} data-testid="button-export-test-run">
          ⬇ {t.biExportTestRun as string}
        </button>
      </div>

      {filtered.slice(0, 20).map((tc, i) => {
        const tcId = String(tc.tc_id || "");
        const sev = String(tc.severity || "Medium");
        const sc = BI_SEVERITY_COLORS[sev] || BI_SEVERITY_COLORS.Medium;
        const expanded = expandedCase === tcId;
        const status = testStatus[tcId];
        return (
          <div key={i} className="mb-2 rounded-lg overflow-hidden border" style={{ borderColor: "#E5E7EB", borderLeft: sev === "Critical" ? "3px solid #B71C1C" : "3px solid transparent" }} data-testid={`tc-${tcId}`}>
            <div onClick={() => setExpandedCase(expanded ? null : tcId)} className="px-3 py-2 flex items-center gap-2 cursor-pointer" style={{ backgroundColor: "#F9FAFB" }}>
              <span className="px-1.5 py-0.5 rounded text-[8px] font-bold" style={{ backgroundColor: "#1A4B8C", color: "#fff" }}>{tcId}</span>
              <span className="px-1.5 py-0.5 rounded text-[8px] font-bold" style={{ backgroundColor: sc.bg, color: sc.fg }}>{sev}</span>
              <span className="flex-1 text-[11px] font-semibold" style={{ color: "#1A1A2E" }}>{String(tc.test_name || "")}</span>
              <span className="text-[10px]" style={{ color: "#9CA3AF" }}>{expanded ? "▲" : "▼"}</span>
            </div>
            {expanded && (
              <div className="px-3 py-2 space-y-1.5 text-[11px]" style={{ backgroundColor: "#fff", color: "#374151" }}>
                <div><strong>{t.biObjective as string}</strong> {String(tc.objective || "")}</div>
                <div><strong>{t.biSteps as string}</strong></div>
                <ol className="pl-4 list-decimal space-y-0.5">
                  {((tc.test_steps || []) as string[]).map((s, j) => <li key={j}>{s}</li>)}
                </ol>
                <div style={{ color: "#2E7D32" }}><strong>{t.biExpected as string}</strong> {String(tc.expected_result || "")}</div>
                <div className="flex gap-2 mt-2">
                  <button onClick={() => setTestStatus(prev => ({ ...prev, [tcId]: "pass" }))} className="px-3 py-1 rounded-lg text-[11px] font-semibold" style={{ border: `1px solid ${status === "pass" ? "#2E7D32" : "#D1D5DB"}`, backgroundColor: status === "pass" ? "#F0FDF4" : "transparent", color: status === "pass" ? "#2E7D32" : "#6B7280" }} data-testid={`btn-pass-${tcId}`}>{t.biPass as string}</button>
                  <button onClick={() => setTestStatus(prev => ({ ...prev, [tcId]: "fail" }))} className="px-3 py-1 rounded-lg text-[11px] font-semibold" style={{ border: `1px solid ${status === "fail" ? "#DC2626" : "#D1D5DB"}`, backgroundColor: status === "fail" ? "#FEF2F2" : "transparent", color: status === "fail" ? "#DC2626" : "#6B7280" }} data-testid={`btn-fail-${tcId}`}>{t.biFail as string}</button>
                </div>
              </div>
            )}
          </div>
        );
      })}
      {filtered.length > 20 && <div className="text-[10px] text-center py-1" style={{ color: "#9CA3AF" }}>+ {filtered.length - 20} {t.biMoreTestCases as string}</div>}
    </>
  );
}

function BiDashboardTestResult({ data, t, testStatus, setTestStatus }: { data: Record<string, unknown>; t: Translation; testStatus: Record<string, "pass" | "fail" | null>; setTestStatus: (fn: (prev: Record<string, "pass" | "fail" | null>) => Record<string, "pass" | "fail" | null>) => void }) {
  const cases = (data.test_cases || []) as Record<string, unknown>[];
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [expandedCase, setExpandedCase] = useState<string | null>(null);
  const totalCases = cases.length;
  const passed = cases.filter(tc => testStatus[String(tc.tc_id)] === "pass").length;
  const failed = cases.filter(tc => testStatus[String(tc.tc_id)] === "fail").length;
  const notRun = totalCases - passed - failed;

  const govRisk = String(data.governance_risk_level || "Low");
  const govRiskColor = govRisk === "Critical" ? "#B71C1C" : govRisk === "High" ? "#E65100" : govRisk === "Medium" ? "#F59E0B" : "#2E7D32";
  const DASHBOARD_CATEGORIES_EN = ["Visual Accuracy", "DAX Validation", "Slicer & Filter", "Drill-Through", "Governance", "Performance", "Formatting", "Refresh"];
  const filtered = activeCategory ? cases.filter(tc => String(tc.category) === activeCategory) : cases;

  return (
    <>
      <div className="flex gap-3 mb-3 flex-wrap items-center">
        <div className="rounded-lg p-3 text-center border" style={{ borderColor: "#BFDBFE", backgroundColor: "#EFF6FF" }}>
          <div className="text-lg font-extrabold" style={{ color: "#1A1A2E" }}>{totalCases}</div>
          <div className="text-[10px]" style={{ color: "#6B7280" }}>{t.biTotal as string}</div>
        </div>
        <div className="rounded-lg p-3 text-center border" style={{ borderColor: "#FECACA", backgroundColor: "#FEF2F2" }}>
          <div className="text-lg font-extrabold" style={{ color: "#DC2626" }}>{Number(data.critical_test_count || 0)}</div>
          <div className="text-[10px]" style={{ color: "#6B7280" }}>{t.biCritical as string}</div>
        </div>
        <div className="rounded-lg p-2.5 border" style={{ borderColor: `${govRiskColor}44`, backgroundColor: `${govRiskColor}08` }}>
          <div className="text-[11px] font-bold" style={{ color: govRiskColor }}>{t.biGovRisk as string}: {govRisk}</div>
        </div>
      </div>

      <div className="rounded-lg p-2.5 mb-3 flex items-center gap-3 border" style={{ borderColor: "#E5E7EB" }} data-testid="dashtest-progress">
        <div className="text-[10px]" style={{ color: "#6B7280" }}>{t.biProgress as string}</div>
        <div className="flex-1 rounded-full h-2.5 overflow-hidden flex" style={{ backgroundColor: "#E5E7EB" }}>
          {passed > 0 && <div style={{ width: `${(passed / totalCases) * 100}%`, backgroundColor: "#2E7D32", height: "100%" }} />}
          {failed > 0 && <div style={{ width: `${(failed / totalCases) * 100}%`, backgroundColor: "#DC2626", height: "100%" }} />}
        </div>
        <div className="text-[10px] whitespace-nowrap" style={{ color: "#6B7280" }}>
          <span style={{ color: "#2E7D32" }}>{passed}✓</span> / <span style={{ color: "#DC2626" }}>{failed}✕</span> / {notRun}○
        </div>
      </div>

      <div className="flex gap-1 mb-3 flex-wrap">
        <button onClick={() => setActiveCategory(null)} className="px-2 py-1 rounded-lg text-[10px]" style={{ backgroundColor: activeCategory === null ? "#EFF6FF" : "transparent", color: activeCategory === null ? "#1A4B8C" : "#9CA3AF", border: `1px solid ${activeCategory === null ? "#BFDBFE" : "#E5E7EB"}` }}>{t.biAll as string}</button>
        {DASHBOARD_CATEGORIES_EN.map(cat => (
          <button key={cat} onClick={() => setActiveCategory(cat)} className="px-2 py-1 rounded-lg text-[10px]" style={{ backgroundColor: activeCategory === cat ? "#EFF6FF" : "transparent", color: activeCategory === cat ? "#1A4B8C" : "#9CA3AF", border: `1px solid ${activeCategory === cat ? "#BFDBFE" : "#E5E7EB"}` }} data-testid={`dashcat-filter-${cat}`}>{cat}</button>
        ))}
      </div>

      <div className="flex justify-end mb-2">
        <button onClick={() => { exportDashboardTestRunSheet(cases, testStatus); downloadBiReport(); }} className="text-[10px] font-semibold px-3 py-1 rounded-lg" style={{ background: "linear-gradient(135deg, #1B5E20, #2E7D32)", color: "#fff" }} data-testid="button-export-dashtest-run">
          ⬇ {t.biExportTestRun as string}
        </button>
      </div>

      {filtered.slice(0, 20).map((tc, i) => {
        const tcId = String(tc.tc_id || "");
        const sev = String(tc.severity || "Medium");
        const sc = BI_SEVERITY_COLORS[sev] || BI_SEVERITY_COLORS.Medium;
        const expanded = expandedCase === tcId;
        const status = testStatus[tcId];
        return (
          <div key={i} className="mb-2 rounded-lg overflow-hidden border" style={{ borderColor: "#E5E7EB", borderLeft: sev === "Critical" ? "3px solid #B71C1C" : "3px solid transparent" }} data-testid={`dbt-${tcId}`}>
            <div onClick={() => setExpandedCase(expanded ? null : tcId)} className="px-3 py-2 flex items-center gap-2 cursor-pointer" style={{ backgroundColor: "#F9FAFB" }}>
              <span className="px-1.5 py-0.5 rounded text-[8px] font-bold" style={{ backgroundColor: "#0D2E5C", color: "#fff" }}>{tcId}</span>
              <span className="px-1.5 py-0.5 rounded text-[8px] font-bold" style={{ backgroundColor: sc.bg, color: sc.fg }}>{sev}</span>
              {tc.visual_tested && <span className="px-1.5 py-0.5 rounded text-[8px]" style={{ backgroundColor: "#EFF6FF", color: "#1A4B8C", border: "1px solid #BFDBFE" }}>{String(tc.visual_tested)}</span>}
              <span className="flex-1 text-[11px] font-semibold" style={{ color: "#1A1A2E" }}>{String(tc.test_name || "")}</span>
              <span className="text-[10px]" style={{ color: "#9CA3AF" }}>{expanded ? "▲" : "▼"}</span>
            </div>
            {expanded && (
              <div className="px-3 py-2 space-y-1.5 text-[11px]" style={{ backgroundColor: "#fff", color: "#374151" }}>
                <div><strong>{t.biObjective as string}</strong> {String(tc.objective || "")}</div>
                <div><strong>{t.biSteps as string}</strong></div>
                <ol className="pl-4 list-decimal space-y-0.5">
                  {((tc.test_steps || []) as string[]).map((s, j) => <li key={j}>{s}</li>)}
                </ol>
                <div style={{ color: "#2E7D32" }}><strong>{t.biExpected as string}</strong> {String(tc.expected_result || "")}</div>
                {tc.power_bi_specific_note && <div className="p-2 rounded-lg text-[10px]" style={{ backgroundColor: "#EFF6FF", color: "#1A4B8C" }}>💡 {String(tc.power_bi_specific_note)}</div>}
                <div className="flex gap-2 mt-2">
                  <button onClick={() => setTestStatus(prev => ({ ...prev, [tcId]: "pass" }))} className="px-3 py-1 rounded-lg text-[11px] font-semibold" style={{ border: `1px solid ${status === "pass" ? "#2E7D32" : "#D1D5DB"}`, backgroundColor: status === "pass" ? "#F0FDF4" : "transparent", color: status === "pass" ? "#2E7D32" : "#6B7280" }} data-testid={`btn-pass-${tcId}`}>{t.biPass as string}</button>
                  <button onClick={() => setTestStatus(prev => ({ ...prev, [tcId]: "fail" }))} className="px-3 py-1 rounded-lg text-[11px] font-semibold" style={{ border: `1px solid ${status === "fail" ? "#DC2626" : "#D1D5DB"}`, backgroundColor: status === "fail" ? "#FEF2F2" : "transparent", color: status === "fail" ? "#DC2626" : "#6B7280" }} data-testid={`btn-fail-${tcId}`}>{t.biFail as string}</button>
                </div>
              </div>
            )}
          </div>
        );
      })}
      {filtered.length > 20 && <div className="text-[10px] text-center py-1" style={{ color: "#9CA3AF" }}>+ {filtered.length - 20} {t.biMoreTestCases as string}</div>}
    </>
  );
}

function ThreadCard({
  thread, idx, isCollapsed, onToggle, tag, isRtl, t, lang,
  isActiveStreaming, liveSteps, completedSteps, streamingContent, timeTick,
  summaryOverride, onDownloadResult, dataModel, dqAnalysis, informaticaOutput, insightsReport,
  allInsightsReports, profiledColumns = [], uploadedFileName, nudgeReport, biReport, piiScan,
  onRetry, usedAiProvider, classificationItems, onClassificationChange,
}: {
  thread: ThreadPair; idx: number; isCollapsed: boolean; onToggle: () => void;
  tag: string | null; isRtl: boolean; t: Translation; lang: Lang;
  isActiveStreaming: boolean; liveSteps: ThinkingStep[]; completedSteps?: ThinkingStep[];
  streamingContent: string; timeTick?: number; summaryOverride?: string; onDownloadResult?: () => void;
  dataModel?: DataModelJSON | null; dqAnalysis?: DqAnalysisResult | null; informaticaOutput?: InformaticaOutput | null;
  insightsReport?: InsightsReport | null;
  allInsightsReports?: { report: InsightsReport; fileName: string; timestamp: string; excelFileName: string; columns: BackendColumnProfile[] }[];
  profiledColumns?: BackendColumnProfile[]; uploadedFileName?: string | null;
  nudgeReport?: NudgeReport | null;
  biReport?: BiReport | null;
  piiScan?: PiiScanResult | null;
  onRetry?: () => void;
  usedAiProvider?: "claude" | "local";
  classificationItems?: ClassificationItem[];
  onClassificationChange?: (items: ClassificationItem[]) => void;
}) {
  const { userMsg, assistantMsg } = thread;
  const { displayText, fileName: attachedFile } = stripExcelContent(userMsg.content);
  const preview = displayText.substring(0, 80) + (displayText.length > 80 ? "..." : "");
  const userTimestamp = formatTimestamp(userMsg.createdAt);
  const agentTimestamp = assistantMsg ? formatTimestamp(assistantMsg.createdAt) : null;

  const hasDataModel = dataModel != null;
  const hasDqAnalysis = dqAnalysis != null;
  const hasInformatica = informaticaOutput != null;
  const hasInsights = insightsReport != null;
  const hasSummary = !!summaryOverride;
  const hasNudge = nudgeReport != null;
  const hasBi = biReport != null;

  const [isDataExpanded, setIsDataExpanded] = useState(false);

  const isDone = !!assistantMsg && !isActiveStreaming;

  const FALLBACK_STEPS: ThinkingStep[] = [
    { label: t.stepProcessingRequest, status: "done", estimatedSeconds: 2 },
    { label: t.stepProfilingData,     status: "done", estimatedSeconds: 3 },
    { label: t.stepGenerating,        status: "done", estimatedSeconds: 20 },
    { label: t.stepSaving,            status: "done", estimatedSeconds: 5 },
  ];

  const inferredOrFallback = (() => {
    const inferred = inferStepsForCommand(userMsg.content, t);
    return inferred.length > 0 ? inferred : FALLBACK_STEPS;
  })();

  const stepsToShow = isActiveStreaming
    ? liveSteps
    : (completedSteps && completedSteps.length > 0)
      ? completedSteps
      : isDone
        ? inferredOrFallback
        : [];
  const excelName = attachedFile || uploadedFileName;

  const borderColor = isActiveStreaming ? "#E65100" : (assistantMsg ? "#2E7D32" : "#D1D5DB");

  const handleDownloadInsights = (report: InsightsReport, srcFile?: string, cols?: BackendColumnProfile[]) => {
    generateInsightsExcel(report, srcFile || "data.xlsx", cols || profiledColumns);
  };

  return (
    <div
      className="rounded-xl bg-white shadow-md overflow-hidden animate-slide-up"
      style={{
        borderLeft: isRtl ? "none" : `3px solid ${borderColor}`,
        borderRight: isRtl ? `3px solid ${borderColor}` : "none",
        animationDelay: `${idx * 30}ms`,
      }}
      data-testid={`thread-block-${idx}`}
      data-message-id={userMsg.id}
    >
      {/* Collapsed header — always visible */}
      <div
        className="flex items-center gap-3 px-4 py-2.5 cursor-pointer select-none"
        onClick={onToggle}
        data-testid={`user-command-${userMsg.id}`}
      >
        <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
          <User className="w-3.5 h-3.5" style={{ color: "#6B7280" }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-semibold" style={{ color: "#2563EB" }}>{t.commandLabel}</span>
            {tag && (
              <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "#2563EB15", color: "#2563EB" }}>{tag}</span>
            )}
          </div>
          <p className="text-xs truncate" style={{ color: "#1A1A2E" }}>{preview}</p>
          {excelName && (
            <div className="flex items-center gap-1 mt-0.5">
              <Paperclip className="w-2.5 h-2.5" style={{ color: "#9CA3AF" }} />
              <span className="text-[9px]" style={{ color: "#9CA3AF" }}>{excelName}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-[9px] tabular-nums" style={{ color: "#9CA3AF" }}>{userTimestamp}</span>
          {isActiveStreaming ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "#E65100" }} />
          ) : assistantMsg ? (
            <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "#2E7D32" }} />
          ) : (
            <Circle className="w-3.5 h-3.5" style={{ color: "#D1D5DB" }} />
          )}
          {isCollapsed
            ? <ChevronRight className="w-3.5 h-3.5" style={{ color: "#9CA3AF" }} />
            : <ChevronDown className="w-3.5 h-3.5" style={{ color: "#9CA3AF" }} />}
        </div>
      </div>

      {/* Expanded body */}
      {!isCollapsed && (
        <div className="border-t" style={{ borderColor: "#E5E7EB" }}>

          {/* Full user command */}
          <div className="px-4 py-2.5" style={{ backgroundColor: "#F8FAFC" }}>
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <User className="w-3 h-3" style={{ color: "#6B7280" }} />
              </div>
              <div className="flex-1 min-w-0">
                {(() => {
                  const rawText = displayText || userMsg.content;
                  const pastedMarker = "--- Pasted Data ---";
                  const hasPastedMarker = rawText.includes(pastedMarker);

                  if (hasPastedMarker) {
                    const [cmdPart, dataPart] = rawText.split(pastedMarker);
                    const dataLines = dataPart ? dataPart.trim().split("\n") : [];
                    return (
                      <>
                        {cmdPart.trim() && (
                          <p className="text-xs leading-relaxed whitespace-pre-wrap break-words mb-1.5" style={{ color: "#374151" }}>
                            {cmdPart.trim()}
                          </p>
                        )}
                        <div>
                          <button
                            className="text-[10px] font-medium px-2 py-0.5 rounded border"
                            style={{ color: "#2563EB", borderColor: "#BFDBFE", backgroundColor: "#EFF6FF" }}
                            onClick={(e) => { e.stopPropagation(); setIsDataExpanded(v => !v); }}
                          >
                            {isDataExpanded ? "Hide data" : `Show data (${dataLines.length} lines)`}
                          </button>
                          {isDataExpanded && (
                            <div className="relative mt-1.5">
                              <div
                                className="rounded text-[10px] overflow-x-auto overflow-y-auto"
                                style={{ backgroundColor: "#1E293B", color: "#E2E8F0", fontFamily: "'Fira Code', monospace", maxHeight: "150px", padding: "8px 10px", whiteSpace: "pre" }}
                              >
                                {dataPart.trim()}
                              </div>
                              <button
                                className="absolute top-1 right-1 text-[9px] px-1.5 py-0.5 rounded"
                                style={{ backgroundColor: "#334155", color: "#94A3B8" }}
                                onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(dataPart.trim()); }}
                              >
                                Copy
                              </button>
                            </div>
                          )}
                        </div>
                      </>
                    );
                  }

                  if (isRawData(rawText)) {
                    const lines = rawText.split("\n");
                    return (
                      <div>
                        <p className="text-xs leading-relaxed break-words mb-1.5" style={{ color: "#374151" }}>
                          {lines[0]}
                        </p>
                        <button
                          className="text-[10px] font-medium px-2 py-0.5 rounded border"
                          style={{ color: "#2563EB", borderColor: "#BFDBFE", backgroundColor: "#EFF6FF" }}
                          onClick={(e) => { e.stopPropagation(); setIsDataExpanded(v => !v); }}
                        >
                          {isDataExpanded ? "Hide data" : `Show data (${lines.length} lines)`}
                        </button>
                        {isDataExpanded && (
                          <div className="relative mt-1.5">
                            <div
                              className="rounded text-[10px] overflow-x-auto overflow-y-auto"
                              style={{ backgroundColor: "#1E293B", color: "#E2E8F0", fontFamily: "'Fira Code', monospace", maxHeight: "150px", padding: "8px 10px", whiteSpace: "pre" }}
                            >
                              {rawText}
                            </div>
                            <button
                              className="absolute top-1 right-1 text-[9px] px-1.5 py-0.5 rounded"
                              style={{ backgroundColor: "#334155", color: "#94A3B8" }}
                              onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(rawText); }}
                            >
                              Copy
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  }

                  return (
                    <p className="text-xs leading-relaxed whitespace-pre-wrap break-words" style={{ color: "#374151" }}>
                      {rawText}
                    </p>
                  );
                })()}
                {excelName && (
                  <div className="flex items-center gap-1 mt-1.5">
                    <FileSpreadsheet className="w-3 h-3" style={{ color: "#51BAB4" }} />
                    <span className="text-[10px] font-medium" style={{ color: "#51BAB4" }}>{excelName}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Agent steps */}
          {stepsToShow.length > 0 && (
            <div className="px-4 py-2.5 border-t" style={{ borderColor: "#E5E7EB" }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {isDone ? (
                    <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "#2E7D32" }} />
                  ) : (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "#E65100" }} />
                  )}
                  <span className="text-[11px] font-semibold" style={{ color: isDone ? "#2E7D32" : "#E65100" }}>
                    {isDone ? t.agentCompleted : t.agentWorking}
                  </span>
                </div>
                {isDone && (() => {
                  const totalMs = stepsToShow.reduce((sum, s) => {
                    if (s.startedAt && s.completedAt) return sum + (s.completedAt - s.startedAt);
                    return sum;
                  }, 0);
                  if (totalMs > 0) {
                    return (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ color: "#0D2E5C", backgroundColor: "#EFF6FF" }}>
                        Total: {Math.round(totalMs / 1000)}s
                      </span>
                    );
                  }
                  return null;
                })()}
              </div>
              {/* Progress bar */}
              {(() => {
                const doneCount = stepsToShow.filter(s => s.status === "done" || isDone).length;
                const pct = isDone ? 100 : Math.round((doneCount / stepsToShow.length) * 100);
                return (
                  <div style={{ height: "3px", backgroundColor: "#E5E7EB" }} className="w-full rounded-full mb-2.5 overflow-hidden">
                    <div
                      className="h-full rounded-full animate-progress-fill"
                      style={{ "--progress-target": `${pct}%`, width: `${pct}%`, backgroundColor: isDone ? "#2E7D32" : "#E65100" } as React.CSSProperties}
                    />
                  </div>
                );
              })()}
              <div className="space-y-1.5 ml-5">
                {stepsToShow.map((step, i) => {
                  const effectivelyDone = step.status === "done" || isDone;
                  const isActive = step.status === "active" && !isDone;
                  const elapsedSec = isActive && step.startedAt && timeTick
                    ? Math.max(0, Math.floor((timeTick - step.startedAt) / 1000))
                    : null;
                  const doneSec = effectivelyDone && step.startedAt && step.completedAt
                    ? Math.round((step.completedAt - step.startedAt) / 1000)
                    : null;
                  return (
                    <div key={i} className="flex items-center gap-2" style={effectivelyDone ? { animationDelay: `${i * 100}ms` } : {}}>
                      {effectivelyDone ? (
                        <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 animate-check-slide-in" style={{ color: "#2E7D32" }} />
                      ) : isActive ? (
                        <Loader2 className="w-3.5 h-3.5 flex-shrink-0 animate-spin" style={{ color: "#E65100" }} />
                      ) : (
                        <Circle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#D1D5DB" }} />
                      )}
                      <span
                        className="text-[11px] flex-1"
                        style={{
                          color: effectivelyDone ? "#2E7D32" : isActive ? "#E65100" : "#9CA3AF",
                          fontWeight: isActive ? 600 : 400,
                        }}
                      >
                        <span className="mr-1">{getStepIcon(step.label)}</span>{step.label}
                      </span>
                      {effectivelyDone && doneSec !== null && (
                        <span className="text-[10px] font-medium" style={{ color: "#6B7280" }}>
                          {doneSec === 0 ? "<1s" : `${doneSec}s`}
                        </span>
                      )}
                      {isActive && elapsedSec !== null && step.estimatedSeconds && (
                        <span className="text-[10px] font-medium tabular-nums" style={{ color: "#E65100" }}>
                          {elapsedSec}s / ~{step.estimatedSeconds}s
                        </span>
                      )}
                      {isActive && elapsedSec !== null && !step.estimatedSeconds && (
                        <span className="text-[10px] font-medium tabular-nums" style={{ color: "#E65100" }}>
                          {elapsedSec}s
                        </span>
                      )}
                      {!effectivelyDone && !isActive && step.estimatedSeconds && (
                        <span className="text-[10px]" style={{ color: "#D1D5DB" }}>
                          ~{step.estimatedSeconds}s
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Streaming content preview */}
          {isActiveStreaming && streamingContent && (
            <div className="px-4 py-2.5 border-t" style={{ borderColor: "#E5E7EB" }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: "#067647" }}>
                  <Bot className="w-3 h-3 text-white" />
                </div>
                <Loader2 className="w-3 h-3 animate-spin" style={{ color: "#E65100" }} />
              </div>
              {(/^\s*```(?:json)?\s*\{[\s\S]*"(?:analysis_summary|scan_summary|fact_tables|report_title|informatica_sql)"/.test(streamingContent) || /\|\s*Business Term/i.test(streamingContent)) ? (
                <div className="flex items-center gap-2 text-[11px]" style={{ color: "#6B7280" }}>
                  <Loader2 className="w-3 h-3 animate-spin flex-shrink-0" style={{ color: "#2563EB" }} />
                  <span>Generating analysis — results will appear in the Outputs panel when complete...</span>
                </div>
              ) : (
                <div className="prose prose-sm max-w-none break-words" style={{ color: "#1A1A2E" }}>
                  <ReactMarkdown>{streamingContent}</ReactMarkdown>
                  <span className={`inline-block w-1.5 h-3.5 bg-primary animate-pulse ${isRtl ? "mr-0.5" : "ml-0.5"} align-text-bottom`} />
                </div>
              )}
            </div>
          )}

          {/* Agent response body */}
          {assistantMsg && (
            <div className="px-4 py-2.5 border-t space-y-3" style={{ borderColor: "#E5E7EB" }}>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: "#067647" }}>
                  <Bot className="w-3 h-3 text-white" />
                </div>
                {/* Agent name badge — always shows, never shows provider name */}
                <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "#0D2E5C", color: "#ffffff" }}>
                  {tag || "Data Agent"}
                </span>
                {/* Status chip */}
                {isActiveStreaming ? (
                  <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "#FEF3C7", color: "#92400E" }}>
                    {t.agentWorking}
                  </span>
                ) : (
                  <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "#DCFCE7", color: "#2E7D32" }}>
                    {t.agentCompleted}
                  </span>
                )}
                <div className="flex-1" />
                {agentTimestamp && (
                  <span className="text-[9px] tabular-nums" style={{ color: "#9CA3AF" }}>{agentTimestamp}</span>
                )}
              </div>
              {/* Metric pills row — hidden when empty */}
              {(() => {
                const pills = extractMetricPills(piiScan ?? null, dqAnalysis ?? null);
                if (!pills.length) return null;
                return (
                  <div className="flex items-center gap-1.5 flex-wrap mt-1">
                    {pills.map((pill, pi) => (
                      <span key={pi} className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full tabular-nums"
                        style={{
                          backgroundColor: pill.color === "red" ? "#FEE2E2" : pill.color === "amber" ? "#FEF3C7" : "#DCFCE7",
                          color: pill.color === "red" ? "#C62828" : pill.color === "amber" ? "#92400E" : "#2E7D32"
                        }}>
                        {pill.count} {pill.label}
                      </span>
                    ))}
                  </div>
                );
              })()}
              {/* Risk level badge — only when piiScan has a risk level */}
              {piiScan?.scan_summary?.overall_risk_level && (() => {
                const risk = piiScan.scan_summary.overall_risk_level;
                const isHigh = risk === "High" || risk === "HIGH";
                const isMed = risk === "Medium" || risk === "MEDIUM";
                const bg = isHigh ? "#FEE2E2" : isMed ? "#FEF3C7" : risk === "None" || risk === "NONE" ? "#F3F4F6" : "#DCFCE7";
                const fg = isHigh ? "#C62828" : isMed ? "#92400E" : risk === "None" || risk === "NONE" ? "#6B7280" : "#2E7D32";
                return (
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                      style={{ backgroundColor: bg, color: fg }}>
                      {lang === "ar" ? "مستوى المخاطر:" : "Risk:"} {risk}
                    </span>
                  </div>
                );
              })()}

              {hasSummary && (
                <div className="text-xs leading-relaxed whitespace-pre-wrap break-words" style={{ color: "#1A1A2E" }}>{summaryOverride}</div>
              )}

              {hasDataModel && (
                <DataModelDiagram model={dataModel!} onDownloadExcel={onDownloadResult} lang={lang} />
              )}

              {hasDqAnalysis && dqAnalysis && (
                <div className="space-y-2" data-testid={`dq-scorecard-${assistantMsg.id}`}>
                  <DqDonutChart dqAnalysis={dqAnalysis} lang={lang} />
                  <div className="text-[11px]" style={{ color: "#6B7280" }}>
                    {lang === "ar"
                      ? `تم تحليل ${dqAnalysis.analysis_summary.total_fields_analyzed} حقل — ${dqAnalysis.analysis_summary.total_rules_generated} قاعدة جودة`
                      : `${dqAnalysis.analysis_summary.total_fields_analyzed} fields analyzed — ${dqAnalysis.analysis_summary.total_rules_generated} quality rules generated`}
                  </div>
                </div>
              )}

              {classificationItems && classificationItems.length > 0 && (
                <ClassificationResultCard
                  items={classificationItems}
                  lang={lang}
                  onItemsChange={onClassificationChange}
                />
              )}

              {hasInformatica && informaticaOutput && (
                <div className="space-y-2" data-testid={`informatica-card-${assistantMsg.id}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Cpu className="w-3.5 h-3.5" style={{ color: "#F57C00" }} />
                    <span className="text-[11px] font-semibold" style={{ color: "#F57C00" }}>
                      {lang === "ar" ? "مخرجات إنفورماتيكا" : "Informatica Output"}
                    </span>
                    <span className="text-[10px]" style={{ color: "#9CA3AF" }}>
                      — {Object.keys(informaticaOutput.descriptions).length} {lang === "ar" ? "حقل" : "fields"}
                    </span>
                  </div>
                  <div className="overflow-x-auto rounded border" style={{ borderColor: "#FED7AA" }}>
                    <table className="w-full text-[10px]">
                      <thead>
                        <tr style={{ backgroundColor: "#FFF7ED" }}>
                          <th className="px-2 py-1 text-left font-semibold" style={{ color: "#92400E", borderBottom: "1px solid #FED7AA" }}>{lang === "ar" ? "الحقل" : "Field"}</th>
                          <th className="px-2 py-1 text-left font-semibold" style={{ color: "#92400E", borderBottom: "1px solid #FED7AA" }}>{lang === "ar" ? "التصنيف" : "Classification"}</th>
                          <th className="px-2 py-1 text-left font-semibold" style={{ color: "#92400E", borderBottom: "1px solid #FED7AA" }}>{lang === "ar" ? "النوع" : "Format"}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.keys(informaticaOutput.descriptions).slice(0, 5).map((field, i) => (
                          <tr key={field} style={{ backgroundColor: i % 2 === 0 ? "#ffffff" : "#FFF7ED" }}>
                            <td className="px-2 py-1 font-mono" style={{ color: "#374151", borderBottom: "1px solid #FEE2C5" }}>{field}</td>
                            <td className="px-2 py-1" style={{ color: "#6B7280", borderBottom: "1px solid #FEE2C5" }}>
                              {informaticaOutput.data_classification[field]?.classification_level || "—"}
                            </td>
                            <td className="px-2 py-1" style={{ color: "#6B7280", borderBottom: "1px solid #FEE2C5" }}>
                              {informaticaOutput.format_types[field] || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {Object.keys(informaticaOutput.descriptions).length > 5 && (
                    <div className="text-[10px]" style={{ color: "#9CA3AF" }}>
                      {lang === "ar"
                        ? `+ ${Object.keys(informaticaOutput.descriptions).length - 5} حقل آخر في ملف النتائج`
                        : `+ ${Object.keys(informaticaOutput.descriptions).length - 5} more fields in result file`}
                    </div>
                  )}
                </div>
              )}

              {hasInsights && insightsReport && (
                <InsightsReportCard
                  report={insightsReport}
                  onDownload={() => handleDownloadInsights(insightsReport)}
                  data-testid={`insights-card-${assistantMsg.id}`}
                />
              )}

              {hasNudge && nudgeReport && (
                <NudgeResultCard report={nudgeReport} t={t} />
              )}

              {hasBi && biReport && (
                <BiResultCard biReport={biReport} isRtl={isRtl} lang={lang} />
              )}

              {!hasSummary && !hasDataModel && !hasDqAnalysis && !hasInsights && !hasNudge && !hasBi && !(classificationItems && classificationItems.length > 0) && (() => {
                const isFailedInsights = looksLikeInsightsJSON(assistantMsg.content);
                if (isFailedInsights) {
                  return (
                    <div className="flex items-start gap-2 p-3 rounded-lg" style={{ backgroundColor: "#FEF2F2", border: "1px solid #FECACA" }} data-testid="card-insights-error">
                      <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: "#DC2626" }}>
                        <span className="text-white text-[8px] font-bold">!</span>
                      </div>
                      <div>
                        <p className="text-xs font-medium" style={{ color: "#DC2626" }}>Analysis could not be completed</p>
                        <p className="text-[11px]" style={{ color: "#991B1B" }}>Please check your file and try again.</p>
                      </div>
                    </div>
                  );
                }
                const hasStructuredJson = /```(?:json)?\s*[\s\S]*?"(?:analysis_summary|scan_summary|fact_tables|informatica_sql)"/.test(assistantMsg.content);
                if (hasStructuredJson) {
                  return (
                    <div className="flex items-start gap-2 p-3 rounded-lg" style={{ backgroundColor: "#F0F9F4", border: "1px solid #BBF7D0" }}>
                      <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: "#2E7D32" }}>
                        <span className="text-white text-[8px] font-bold">✓</span>
                      </div>
                      <div>
                        <p className="text-xs font-medium" style={{ color: "#2E7D32" }}>Analysis complete</p>
                        <p className="text-[11px]" style={{ color: "#6B7280" }}>Results are displayed in the Outputs panel. Download the Excel file to view the full report.</p>
                      </div>
                    </div>
                  );
                }
                if (isOutOfScope(assistantMsg.content)) {
                  return (
                    <div
                      className="flex items-start gap-3 p-3 rounded-lg"
                      style={{ backgroundColor: "#FFFBEB", border: "1px solid #F59E0B" }}
                      data-testid="card-out-of-scope"
                    >
                      <span className="text-lg flex-shrink-0">⚠️</span>
                      <div>
                        <p className="text-xs font-semibold mb-0.5" style={{ color: "#92400E" }}>{t.outOfScopeTitle}</p>
                        <p className="text-xs leading-relaxed" style={{ color: "#78350F" }}>{t.outOfScopeBody}</p>
                      </div>
                    </div>
                  );
                }
                return (
                  <div className="prose prose-sm max-w-none break-words" style={{ color: "#1A1A2E" }}>
                    <ReactMarkdown>{assistantMsg.content}</ReactMarkdown>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Footer: timestamps + download + follow-up */}
          <div className="px-4 py-2 border-t flex items-center gap-3 flex-wrap" style={{ borderColor: "#E5E7EB", backgroundColor: "#F8FAFC" }}>
            <div className="flex items-center gap-3 flex-1 min-w-0 flex-wrap">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" style={{ color: "#9CA3AF" }} />
                <span className="text-[9px]" style={{ color: "#9CA3AF" }}>{t.sentAt}</span>
                <span className="text-[9px] font-medium tabular-nums" style={{ color: "#6B7280" }}>{userTimestamp}</span>
              </div>
              {agentTimestamp && (
                <>
                  <span className="text-[9px]" style={{ color: "#D1D5DB" }}>→</span>
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" style={{ color: "#2E7D32" }} />
                    <span className="text-[9px]" style={{ color: "#9CA3AF" }}>{t.completedAt}</span>
                    <span className="text-[9px] font-medium tabular-nums" style={{ color: "#6B7280" }}>{agentTimestamp}</span>
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              {usedAiProvider && assistantMsg && !isActiveStreaming && (
                <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full" style={{
                  backgroundColor: usedAiProvider === "claude" ? "#DBEAFE" : "#E0E7FF",
                  color: usedAiProvider === "claude" ? "#1D4ED8" : "#4338CA",
                }}>{usedAiProvider === "claude" ? "Claude" : "Local"}</span>
              )}
              {assistantMsg && !isActiveStreaming && assistantMsg.content && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { navigator.clipboard.writeText(assistantMsg.content); }}
                  className="gap-1 text-[10px] font-medium h-6 px-2 rounded-md"
                  style={{ color: "#6B7280", borderColor: "#D1D5DB" }}
                >
                  <Square className="w-2.5 h-2.5" />
                  {lang === "ar" ? "نسخ" : "Copy"}
                </Button>
              )}
              {onRetry && assistantMsg && !isActiveStreaming && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onRetry}
                  className="gap-1 text-[10px] font-medium h-6 px-2 rounded-md"
                  style={{ color: "#6B7280", borderColor: "#D1D5DB" }}
                >
                  <Play className="w-2.5 h-2.5" />
                  {lang === "ar" ? "إعادة" : "Retry"}
                </Button>
              )}
              {onDownloadResult && assistantMsg && (
                <Button
                  size="sm"
                  onClick={onDownloadResult}
                  className="gap-1 text-[10px] text-white font-medium h-6 px-2 rounded-md ripple-button"
                  style={{ backgroundColor: hasBi ? "#1A4B8C" : "#2E7D32" }}
                  data-testid={`button-download-result-${assistantMsg.id}`}
                >
                  <Download className="w-2.5 h-2.5" />
                  {hasBi ? "bi_agent_report.xlsx" : t.resultXlsx}
                </Button>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

function DqDonutChart({ dqAnalysis, lang }: { dqAnalysis: DqAnalysisResult; lang: Lang }) {
  const total = dqAnalysis.analysis_summary.total_rules_generated;
  const technical = dqAnalysis.field_rules.reduce((sum, f) => sum + f.rules.filter(r => r.rule_layer === "Technical").length, 0);
  const logical = dqAnalysis.field_rules.reduce((sum, f) => sum + f.rules.filter(r => r.rule_layer === "Logical").length, 0);
  const business = dqAnalysis.field_rules.reduce((sum, f) => sum + f.rules.filter(r => r.rule_layer === "Business").length, 0);
  const crossField = dqAnalysis.cross_field_rules.length;
  const warnings = dqAnalysis.business_logic_warnings.length;

  const data = [
    { name: "Technical", value: technical, color: "#0094D3" },
    { name: "Logical", value: logical, color: "#51BAB4" },
    { name: "Business", value: business, color: "#774896" },
    { name: "Cross-Field", value: crossField, color: "#067647" },
    { name: "Warnings", value: warnings, color: "#D97706" },
  ].filter(d => d.value > 0);

  const score = total > 0 ? Math.min(100, Math.round((total / Math.max(dqAnalysis.analysis_summary.total_fields_analyzed * 3, 1)) * 100)) : 0;
  const scoreColor = score >= 90 ? "#2E7D32" : score >= 70 ? "#F9A825" : "#C62828";

  return (
    <div className="flex items-center gap-4">
      <div className="relative w-20 h-20">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={25} outerRadius={35} paddingAngle={2} dataKey="value" strokeWidth={0}>
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold" style={{ color: scoreColor }}>{total}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        {[
          { label: lang === "ar" ? "تقنية" : "Technical", value: technical, color: "#0094D3" },
          { label: lang === "ar" ? "منطقية" : "Logical", value: logical, color: "#51BAB4" },
          { label: lang === "ar" ? "أعمال" : "Business", value: business, color: "#774896" },
          { label: lang === "ar" ? "عبر الحقول" : "Cross-Field", value: crossField, color: "#067647" },
          { label: lang === "ar" ? "تحذيرات" : "Warnings", value: warnings, color: "#D97706" },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-[10px]" style={{ color: "#6B7280" }}>{item.label}</span>
            <span className="text-[10px] font-bold" style={{ color: item.color }}>{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

