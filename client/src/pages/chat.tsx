import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
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
  Minimize2,
  Maximize2,
  Paperclip,
  Database,
  PanelLeftClose,
  PanelLeftOpen,
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
  detectAndExtractAllAnalyses,
  mergeResults,
  mergeDqResults,
  generateResultExcel,
  generateAnalysisSummary,
  getIncludedAnalysisLabels,
  getAnalysisLabel,
  detectPiiScanJSON,
  generatePiiScanSummary,
  detectDqAnalysisJSON,
  generateDqAnalysisSummary,
} from "@/lib/result-store";
import DataModelDiagram from "@/components/DataModelDiagram";
import {
  type InsightsReport,
  type BackendColumnProfile,
  detectInsightsJSON,
  looksLikeInsightsJSON,
  generateInsightsExcel,
} from "@/lib/insights-store";
import zatcaLogoPath from "@assets/zatca-logo.svg";
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from "react-resizable-panels";

type Lang = "en" | "ar";

const translations = {
  en: {
    newChat: "New Data Owner Agent",
    noConversations: "No conversations yet",
    deleteSession: "Delete this session?",
    yesDelete: "Yes, Delete",
    cancel: "Cancel",
    deleteAllSessions: "Delete all sessions?",
    yesDeleteAll: "Yes, Delete All",
    clearAllSessions: "Clear All Sessions",
    appTitle: "ZATCA Data Owner Agent",
    heroTitle: "Data Owner Agent",
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
    invalidFile: "Invalid file",
    invalidFileDesc: "Please upload an Excel, CSV, PDF, Word, or image file.",
    cardDataClassification: "Data Classification",
    cardDataClassificationDesc: "Classify data fields per Saudi SDAIA NDMO standards",
    cardBusinessDefs: "Business Definitions",
    cardBusinessDefsDesc: "Generate comprehensive business definitions for data fields",
    cardDataQuality: "Full DQ Rules (Technical + Logical + Business)",
    cardDataQualityDesc: "Generate technical, logical & business data quality rules",
    cardDataModel: "Analytical Data Model",
    cardDataModelDesc: "Design a star schema with fact & dimension tables",
    cardPiiDetection: "PII Detection",
    cardPiiDetectionDesc: "Scan data for personal & sensitive information per PDPL",
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
    cardInsights: "Data Insights Report",
    cardInsightsDesc: "Analyze data and generate comprehensive insights report",
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
    stepProfilingData: "Profiling data structure",
    stepGenerating: "Generating analysis",
    stepExecuting: "Executing checks",
    stepSaving: "Saving to result.xlsx",
    askFollowUp: "Ask Follow-up",
    quickActions: "Quick Actions",
    sheetsInResult: "sheets",
    fileUploaded: "File uploaded",
    noOutputsYet: "No outputs generated yet",
    noActivityYet: "No activity yet",
  },
  ar: {
    newChat: "وكيل مالك بيانات جديد",
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
    invalidFile: "ملف غير صالح",
    invalidFileDesc: "يرجى تحميل ملف Excel أو CSV أو PDF أو Word أو صورة.",
    cardDataClassification: "تصنيف البيانات",
    cardDataClassificationDesc: "تصنيف حقول البيانات وفقاً لمعايير SDAIA NDMO السعودية",
    cardBusinessDefs: "تعريفات الأعمال",
    cardBusinessDefsDesc: "إنشاء تعريفات أعمال شاملة لحقول البيانات",
    cardDataQuality: "توليد قواعد جودة البيانات الكاملة",
    cardDataQualityDesc: "توليد القواعد التقنية والمنطقية وقواعد الأعمال لجودة البيانات",
    cardDataModel: "نموذج البيانات التحليلي",
    cardDataModelDesc: "تصميم مخطط نجمي مع جداول الحقائق والأبعاد",
    cardPiiDetection: "كشف البيانات الشخصية",
    cardPiiDetectionDesc: "فحص البيانات للمعلومات الشخصية والحساسة وفقاً لنظام حماية البيانات",
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
    cardInsights: "تقرير رؤى البيانات",
    cardInsightsDesc: "تحليل البيانات وإنشاء تقرير رؤى شامل",
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
    stepProfilingData: "تحليل هيكل البيانات",
    stepGenerating: "إنشاء التحليل",
    stepExecuting: "تنفيذ الفحوصات",
    stepSaving: "حفظ في result.xlsx",
    askFollowUp: "اطرح سؤال متابعة",
    quickActions: "إجراءات سريعة",
    sheetsInResult: "أوراق",
    fileUploaded: "تم تحميل الملف",
    noOutputsYet: "لم يتم إنشاء مخرجات بعد",
    noActivityYet: "لا يوجد نشاط بعد",
  },
} as const;

type Translation = (typeof translations)[Lang];
type TranslationKey = keyof Translation;

const featureCardKeys: { titleKey: TranslationKey; descKey: TranslationKey }[] = [
  { titleKey: "cardDataClassification", descKey: "cardDataClassificationDesc" },
  { titleKey: "cardBusinessDefs", descKey: "cardBusinessDefsDesc" },
  { titleKey: "cardDataQuality", descKey: "cardDataQualityDesc" },
  { titleKey: "cardDataModel", descKey: "cardDataModelDesc" },
  { titleKey: "cardPiiDetection", descKey: "cardPiiDetectionDesc" },
  { titleKey: "cardInsights", descKey: "cardInsightsDesc" },
];

const FEATURE_CARDS = [
  {
    icon: ShieldCheck,
    title: "Data Classification",
    description: "Classify data fields per Saudi SDAIA NDMO standards",
    prompt: "I'd like to classify some data fields according to the Saudi SDAIA NDMO data classification framework. Please help me understand the classification levels and what I need to provide.",
    color: "text-[#067647]",
    bg: "bg-[#067647]/5",
    iconBg: "bg-[#067647]/10",
  },
  {
    icon: BookOpen,
    title: "Business Definitions",
    description: "Generate comprehensive business definitions for data fields",
    prompt: "I need help generating business definitions for my data fields. Can you explain what a good business definition includes and guide me through the process?",
    color: "text-[#51BAB4]",
    bg: "bg-[#51BAB4]/5",
    iconBg: "bg-[#51BAB4]/10",
  },
  {
    icon: CheckCircle,
    title: "Full DQ Rules",
    description: "Generate technical, logical & business data quality rules",
    prompt: "Generate full data quality rules for all fields in the uploaded data. Include all layers: technical rules, logical rules, business rules, cross-field rules, and business logic warnings.",
    color: "text-[#774896]",
    bg: "bg-[#774896]/5",
    iconBg: "bg-[#774896]/10",
  },
  {
    icon: Database,
    title: "Analytical Data Model",
    description: "Design a star schema with fact & dimension tables",
    prompt: "I want to build an analytical data model (star schema) for my data. Please help me understand what I need to provide and how the model will be structured.",
    color: "text-[#0094D3]",
    bg: "bg-[#0094D3]/5",
    iconBg: "bg-[#0094D3]/10",
  },
  {
    icon: ScanEye,
    title: "PII Detection",
    description: "Scan data for personal & sensitive information per PDPL",
    prompt: "I want to scan my data for PII and sensitive information. Please help me understand what you can detect and how the privacy scan works.",
    color: "text-red-600",
    bg: "bg-red-50",
    iconBg: "bg-red-100",
  },
  {
    icon: BarChart3,
    title: "Data Insights Report",
    description: "Analyze data and generate comprehensive insights report",
    prompt: "I'd like to generate a data insights report. Upload an Excel file with your data and I'll analyze it to find key trends, anomalies, patterns, and provide actionable recommendations.",
    color: "text-[#1A4B8C]",
    bg: "bg-[#1A4B8C]/5",
    iconBg: "bg-[#1A4B8C]/10",
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
}

type AgentStatus = "idle" | "thinking" | "executing" | "done";

interface ThinkingStep {
  label: string;
  status: "done" | "active" | "pending";
}

const SHEET_TAG_COLORS: Record<string, string> = {
  business_definitions: "#2563EB",
  data_classification: "#774896",
  data_quality: "#2E7D32",
  pii_scan: "#C62828",
  data_model: "#0D2E5C",
  insights: "#E65100",
};

const STATUS_COLORS: Record<AgentStatus, { bg: string; text: string; pulse: boolean }> = {
  idle: { bg: "#6B7280", text: "#ffffff", pulse: false },
  thinking: { bg: "#2563EB", text: "#ffffff", pulse: true },
  executing: { bg: "#E65100", text: "#ffffff", pulse: true },
  done: { bg: "#2E7D32", text: "#ffffff", pulse: false },
};

function detectAnalysisTag(userContent: string, assistantContent?: string, t?: Translation): string | null {
  const tr = t || translations.en;
  const combined = `${userContent} ${assistantContent || ""}`.toLowerCase();
  if (combined.includes("report_title") && combined.includes("key_insights")) return tr.tagInsights;
  if (combined.includes("insights report") || combined.includes("give me insights") || combined.includes("analyze this data") || combined.includes("explore this dataset") || combined.includes("key findings")) return tr.tagInsights;
  if (combined.includes("pii") || combined.includes("personal data") || combined.includes("sensitive data") || combined.includes("privacy scan") || combined.includes("pdpl") || combined.includes("scan_summary")) return tr.tagPiiScan;
  if (combined.includes("data model") || combined.includes("star schema") || combined.includes("dimensional model") || combined.includes("analytical model") || combined.includes("fact_tables")) return tr.tagDataModel;
  if (combined.includes("business definition") || combined.includes("business def")) return tr.tagBusinessDefs;
  if (combined.includes("classification") || combined.includes("classify")) return tr.tagDataClassification;
  if (combined.includes("quality") || combined.includes("dq rule")) return tr.tagDataQuality;
  return null;
}

function detectDataModelJSON(content: string): DataModelJSON | null {
  const fencedMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fencedMatch ? fencedMatch[1].trim() : null;
  if (!candidate) return null;
  try {
    const parsed = JSON.parse(candidate);
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
}) {
  const statusConfig = STATUS_COLORS[agentStatus];
  const statusLabel = agentStatus === "idle" ? t.agentIdle : agentStatus === "thinking" ? t.agentThinking : agentStatus === "executing" ? t.agentExecuting : t.agentDone;

  return (
    <div
      className="h-full flex flex-col font-main"
      style={{ backgroundColor: "#0D2E5C" }}
      data-testid="sidebar"
    >
      <div className="p-4 pb-3">
        <div className="flex items-center gap-3 mb-2">
          <img src={zatcaLogoPath} alt="ZATCA" className="h-7 flex-shrink-0 brightness-0 invert" />
          <Button
            size="icon"
            variant="ghost"
            onClick={onCollapse}
            className="h-7 w-7 flex-shrink-0 text-white/60 hover:text-white hover:bg-white/10"
            data-testid="button-collapse-sidebar"
          >
            <PanelLeftClose className="w-4 h-4" />
          </Button>
        </div>
        <div className="mb-3">
          <h1 className="text-white font-bold text-sm" data-testid="text-app-title">Data Owner Agent</h1>
        </div>
        <div
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium ${statusConfig.pulse ? "animate-pulse-status" : ""}`}
          style={{ backgroundColor: statusConfig.bg + "30", color: statusConfig.text }}
          data-testid="status-agent"
        >
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusConfig.bg }} />
          {statusLabel}
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
                    className="group flex items-center gap-2 rounded-md px-3 py-2 cursor-pointer text-sm transition-colors"
                    style={{
                      backgroundColor: activeConversationId === conv.id ? "#1A4B8C" : "transparent",
                      color: activeConversationId === conv.id ? "#ffffff" : "rgba(255,255,255,0.6)",
                    }}
                    onClick={() => setActiveConversationId(conv.id)}
                    onMouseEnter={(e) => { if (activeConversationId !== conv.id) e.currentTarget.style.backgroundColor = "#1A4B8C50"; }}
                    onMouseLeave={(e) => { if (activeConversationId !== conv.id) e.currentTarget.style.backgroundColor = "transparent"; }}
                  >
                    <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 opacity-60" />
                    <div className="truncate flex-1">
                      <span className="text-[13px] block truncate">{conv.title}</span>
                      <span className="text-[10px] opacity-50">{new Date(conv.createdAt).toLocaleDateString()}</span>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="opacity-0 group-hover:opacity-100 h-6 w-6 flex-shrink-0 text-white/40 hover:text-red-400 hover:bg-white/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingConvId(conv.id);
                      }}
                      data-testid={`button-delete-conversation-${conv.id}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
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
          style={{ backgroundColor: "#2563EB" }}
          data-testid="button-new-chat"
        >
          <Plus className="w-4 h-4" />
          {t.newChat}
        </Button>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const isMobile = useIsMobile();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [lang, setLang] = useState<Lang>("en");

  const t = translations[lang];
  const isRtl = lang === "ar";

  const [resultRows, setResultRows] = useState<ResultRow[]>([]);
  const [includedAnalyses, setIncludedAnalyses] = useState<AnalysisType[]>([]);
  const [sessionFieldNames, setSessionFieldNames] = useState<string[] | null>(null);
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

  const [insightsReports, setInsightsReports] = useState<{ report: InsightsReport; fileName: string; timestamp: string; excelFileName: string; columns: BackendColumnProfile[] }[]>([]);
  const [insightsForMessage, setInsightsForMessage] = useState<Record<number, InsightsReport>>({});
  const [isInsightsMode, setIsInsightsMode] = useState(false);
  const [profiledColumns, setProfiledColumns] = useState<BackendColumnProfile[]>([]);
  const profiledColumnsRef = useRef<BackendColumnProfile[]>([]);

  const [collapsedThreads, setCollapsedThreads] = useState<Set<number>>(new Set());

  const [agentStatus, setAgentStatus] = useState<AgentStatus>("idle");
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
  const [thinkingSteps, setThinkingSteps] = useState<ThinkingStep[]>([]);
  const [mobileOutputsOpen, setMobileOutputsOpen] = useState(false);

  const [deletingConvId, setDeletingConvId] = useState<number | null>(null);
  const [fadingOutConvId, setFadingOutConvId] = useState<number | null>(null);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);
  const [fadingOutAll, setFadingOutAll] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isTouchDevice = useTouchDevice();
  const { toast } = useToast();

  const { data: conversations = [], isLoading: conversationsLoading } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
  });

  const { data: activeConversation } = useQuery<Conversation & { messages: Message[] }>({
    queryKey: ["/api/conversations", activeConversationId],
    enabled: !!activeConversationId,
  });

  const createConversation = useMutation({
    mutationFn: async (title: string) => {
      const res = await apiRequest("POST", "/api/conversations", { title });
      return res.json();
    },
    onSuccess: (data: Conversation) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setActiveConversationId(data.id);
    },
  });

  const deleteConversation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/conversations/${id}`);
    },
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
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
      await apiRequest("DELETE", "/api/conversations/all");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
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
    resetResultState();
    setCollapsedThreads(new Set());
  }, [activeConversationId]);

  useEffect(() => {
    if (!activeConversation?.messages) return;
    const overrides: Record<number, string> = {};
    const modelMap: Record<number, DataModelJSON> = {};
    const piiMap: Record<number, PiiScanResult> = {};
    const insightsMap: Record<number, InsightsReport> = {};
    const dqMap: Record<number, DqAnalysisResult> = {};
    let lastModel: DataModelJSON | null = null;
    let lastPii: PiiScanResult | null = null;
    let lastDq: DqAnalysisResult | null = null;
    for (const msg of activeConversation.messages) {
      if (msg.role !== "assistant") continue;
      const insights = detectInsightsJSON(msg.content);
      const msgParts: string[] = [];
      if (insights) {
        insightsMap[msg.id] = insights;
        msgParts.push(t.insightsReportGenerated);
      } else if (looksLikeInsightsJSON(msg.content)) {
        const fallbackReport: InsightsReport = {
          report_title: "Data Insights Report",
          dataset_summary: { total_rows: 0, total_columns: 0 },
          key_insights: [],
          recommendations: [],
        };
        insightsMap[msg.id] = fallbackReport;
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
      const rawResults = detectAndExtractAllAnalyses(msg.content);
      const results = dqResult
        ? rawResults.filter(r => r.analysisType !== "data_quality")
        : rawResults;
      if (results.length > 0) {
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
  }, [activeConversation?.messages]);

  const addActivityEntry = useCallback((icon: string, text: string) => {
    const now = new Date();
    const ts = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    setActivityLog(prev => [...prev, { icon, text, timestamp: ts }]);
  }, []);

  const getThinkingStepsForCommand = useCallback((content: string): ThinkingStep[] => {
    const lower = content.toLowerCase();
    const steps: string[] = [t.stepReadingFile, t.stepProfilingData];
    if (lower.includes("quality") || lower.includes("dq") || lower.includes("جودة")) {
      steps.push(t.stepGenerating, t.stepExecuting, t.stepSaving);
    } else if (lower.includes("classification") || lower.includes("تصنيف")) {
      steps.push(t.stepGenerating, t.stepSaving);
    } else if (lower.includes("definition") || lower.includes("تعريف")) {
      steps.push(t.stepGenerating, t.stepSaving);
    } else if (lower.includes("model") || lower.includes("نموذج") || lower.includes("star schema")) {
      steps.push(t.stepGenerating, t.stepSaving);
    } else if (lower.includes("pii") || lower.includes("بيانات شخصية") || lower.includes("privacy")) {
      steps.push(t.stepGenerating, t.stepSaving);
    } else if (lower.includes("insight") || lower.includes("رؤى")) {
      steps.push(t.stepGenerating, t.stepSaving);
    } else {
      steps.push(t.stepGenerating);
    }
    return steps.map((label, i) => ({ label, status: i === 0 ? "active" as const : "pending" as const }));
  }, [t]);

  const resetResultState = () => {
    setResultRows([]);
    setIncludedAnalyses([]);
    setSessionFieldNames(null);
    setUploadedFileName(null);
    setSummaryOverrides({});
    setDataModels({});
    setLatestDataModel(null);
    setPiiScans({});
    setLatestPiiScan(null);
    setDqAnalyses({});
    setLatestDqAnalysis(null);
    setInsightsReports([]);
    setInsightsForMessage({});
    setIsInsightsMode(false);
    setProfiledColumns([]);
    profiledColumnsRef.current = [];
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

    const rawAnalysisResults = detectAndExtractAllAnalyses(content);
    const analysisResults = dqResult
      ? rawAnalysisResults.filter(r => r.analysisType !== "data_quality")
      : rawAnalysisResults;
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

  const sendMessage = async (content: string, file?: File | null) => {
    if (!content.trim() && !file) return;

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
    setAgentStatus("thinking");
    setThinkingSteps(getThinkingStepsForCommand(content));
    addActivityEntry("📤", `${t.commandLabel} ${content.substring(0, 40)}...`);

    queryClient.setQueryData(
      ["/api/conversations", conversationId],
      (old: any) => {
        const newMessage = {
          id: Date.now(),
          conversationId,
          role: "user",
          content: file ? `${content}\n\nUploaded: ${file.name}` : content,
          createdAt: new Date().toISOString(),
        };
        return old
          ? { ...old, messages: [...(old.messages || []), newMessage] }
          : { id: conversationId, title: t.newChat, messages: [newMessage] };
      }
    );

    try {
      const formData = new FormData();
      formData.append("content", content);
      if (file) {
        formData.append("file", file);
      }

      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
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
                if (data.insightsMode) {
                  setIsInsightsMode(true);
                }
                if (data.profiledColumns) {
                  setProfiledColumns(data.profiledColumns);
                  profiledColumnsRef.current = data.profiledColumns;
                }
                if (data.fieldNames) {
                  setSessionFieldNames(data.fieldNames);
                  if (file) setUploadedFileName(file.name);
                }
                if (data.type === "error") {
                  setIsStreaming(false);
                  setStreamingContent("");
                  await queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId] });
                  await queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
                  toast({
                    title: lang === "ar" ? "خطأ" : "Error",
                    description: data.content || (lang === "ar" ? "حدث خطأ أثناء معالجة الصورة" : "An error occurred while processing the image"),
                    variant: "destructive",
                  });
                  return;
                }
                if (data.content) {
                  accumulated += data.content;
                  setStreamingContent(accumulated);
                  setAgentStatus("executing");
                  setThinkingSteps(prev => {
                    const activeIdx = prev.findIndex(s => s.status === "active");
                    if (activeIdx >= 0 && activeIdx < prev.length - 1 && accumulated.length > (activeIdx + 1) * 500) {
                      return prev.map((s, i) => ({
                        ...s,
                        status: i <= activeIdx ? "done" as const : i === activeIdx + 1 ? "active" as const : s.status,
                      }));
                    }
                    return prev;
                  });
                }
                if (data.done) {
                  setIsStreaming(false);
                  setStreamingContent("");
                  setIsInsightsMode(false);
                  setThinkingSteps(prev => prev.map(s => ({ ...s, status: "done" as const })));
                  setAgentStatus("done");

                  const detectedInsights = detectInsightsJSON(accumulated);
                  const detectedPii = detectPiiScanJSON(accumulated);
                  const detectedDq = detectDqAnalysisJSON(accumulated);
                  const detectedModel = detectDataModelJSON(accumulated);
                  const analysisResults = detectAndExtractAllAnalyses(accumulated);
                  const hasAnyDetection = detectedInsights || detectedPii || detectedDq || detectedModel || analysisResults.length > 0;
                  if (hasAnyDetection) {
                    processAIResponse(accumulated);
                    if (detectedInsights) addActivityEntry("📊", t.tagInsights);
                    if (detectedPii) addActivityEntry("🛡️", t.tagPiiScan);
                    if (detectedDq) addActivityEntry("🔬", t.tagDataQuality);
                    if (detectedModel) addActivityEntry("🏗️", t.tagDataModel);
                    if (analysisResults.length > 0) {
                      for (const r of analysisResults) {
                        if (r.analysisType === "data_classification") addActivityEntry("📋", t.tagDataClassification);
                        else if (r.analysisType === "business_definitions") addActivityEntry("📖", t.tagBusinessDefs);
                      }
                    }

                    await queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId] });
                    await queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });

                    const convData = queryClient.getQueryData<any>(["/api/conversations", conversationId]);
                    if (convData?.messages) {
                      const lastMsg = convData.messages[convData.messages.length - 1];
                      if (lastMsg?.role === "assistant") {
                        const msgSummaryParts: string[] = [];
                        if (detectedInsights) {
                          setInsightsForMessage(prev => ({ ...prev, [lastMsg.id]: detectedInsights }));
                          msgSummaryParts.push(t.insightsReportGenerated);
                        }
                        if (detectedPii) {
                          setPiiScans(prev => ({ ...prev, [lastMsg.id]: detectedPii }));
                          msgSummaryParts.push(generatePiiScanSummary(detectedPii));
                        }
                        if (detectedDq) {
                          setDqAnalyses(prev => ({ ...prev, [lastMsg.id]: detectedDq }));
                          msgSummaryParts.push(generateDqAnalysisSummary(detectedDq));
                        }
                        if (detectedModel) {
                          setDataModels(prev => ({ ...prev, [lastMsg.id]: detectedModel }));
                        }
                        if (analysisResults.length > 0) {
                          const totalFields = new Set(
                            analysisResults.flatMap((r: any) => [
                              ...Object.keys(r.fieldData),
                              ...(r.dqMultiRows?.map((dr: any) => dr.fieldName) || [])
                            ])
                          ).size;
                          msgSummaryParts.push(generateAnalysisSummary(analysisResults, totalFields));
                        }
                        if (msgSummaryParts.length > 0) {
                          const combined = msgSummaryParts.join("\n\n");
                          setSummaryOverrides(prev => ({ ...prev, [lastMsg.id]: combined }));
                        }
                      }
                    }
                  } else {
                    queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId] });
                    queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
                  }
                }
                if (data.error) {
                  toast({ title: t.toastError, description: data.error, variant: "destructive" });
                }
              } catch {}
            }
          }
        }
      }
    } catch (error) {
      toast({ title: t.toastError, description: t.toastErrorDesc, variant: "destructive" });
      setAgentStatus("idle");
    } finally {
      setIsStreaming(false);
      setStreamingContent("");
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (isStreaming) return;
    sendMessage(inputValue, selectedFile);
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

  const handleNewChat = () => {
    setActiveConversationId(null);
    setInputValue("");
    setSelectedFile(null);
    setStreamingContent("");
    resetResultState();
    setCollapsedThreads(new Set());
  };

  const handleDownloadResult = () => {
    if (resultRows.length > 0 || latestDataModel || latestPiiScan || latestDqAnalysis) {
      generateResultExcel(resultRows, includedAnalyses, latestDataModel || undefined, latestPiiScan || undefined, latestDqAnalysis || undefined);
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

  const sheetCount = includedAnalyses.length + (latestDataModel ? 3 : 0) + (latestPiiScan ? 1 : 0) + (latestDqAnalysis ? 3 : 0);

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
  };

  return (
    <div className="flex h-screen font-main" dir={isRtl ? "rtl" : "ltr"} data-testid="chat-page">
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
              insightsReports={insightsReports}
              uploadedFileName={uploadedFileName}
              onDownloadResult={handleDownloadResult}
              activityLog={activityLog}
              sheetCount={sheetCount}
            />
          </div>
        </>
      )}

      {!isMobile && !sidebarCollapsed && (
        <div className="w-[240px] flex-shrink-0" data-testid="sidebar-panel">
          <SidebarContent
            {...sidebarProps}
            setActiveConversationId={setActiveConversationId}
            onCollapse={() => setSidebarCollapsed(true)}
          />
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col command-center-bg">
        <div className="h-12 flex items-center gap-3 px-4 flex-shrink-0 border-b" style={{ borderColor: "#E5E7EB", backgroundColor: "#FFFFFF" }}>
          {(isMobile || sidebarCollapsed) && (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => { if (isMobile) setMobileSidebarOpen(true); else setSidebarCollapsed(false); }}
              className="h-8 w-8"
              data-testid="button-expand-sidebar"
            >
              {isMobile ? <Menu className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
            </Button>
          )}
          <div className="flex items-center gap-2 text-xs flex-1 min-w-0" style={{ color: "#1A1A2E" }}>
            <Folder className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#2563EB" }} />
            <span className="truncate font-medium">
              {uploadedFileName ? `📁 ${uploadedFileName}` : t.noFileLoaded}
            </span>
            {sessionFieldNames && (
              <span className="text-[10px]" style={{ color: "#6B7280" }}> — {sessionFieldNames.length} columns</span>
            )}
          </div>
          {sheetCount > 0 && (
            <div className="flex items-center gap-1.5 text-xs" style={{ color: "#2E7D32" }}>
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
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2.5 gap-1.5 text-[11px] font-medium flex-shrink-0"
            onClick={() => setLang(lang === "en" ? "ar" : "en")}
            data-testid="button-lang-toggle"
          >
            <Globe className="w-3.5 h-3.5" />
            {lang === "en" ? "EN" : "AR"}
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

        <div className="flex-1 min-h-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="max-w-4xl mx-auto w-full px-4 py-6">
              {!activeConversationId && messages.length === 0 && !isStreaming ? (
                <div className="flex flex-col items-center justify-center pt-8">
                  <h2 className="text-2xl font-bold mb-2 tracking-tight font-main" style={{ color: "#2563EB" }} data-testid="text-hero-title">{t.whatToDo}</h2>
                  <p className="text-center mb-8 max-w-md text-sm leading-relaxed" style={{ color: "#6B7280" }}>
                    {t.heroDescription}
                  </p>
                  <div className={`grid grid-cols-2 ${isMobile ? "" : "lg:grid-cols-3"} gap-4 w-full max-w-4xl`}>
                    {FEATURE_CARDS.map((card, cardIdx) => (
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
                        <h3 className="text-sm font-semibold mb-1" style={{ color: "#1A1A2E" }}>{t[featureCardKeys[cardIdx].titleKey] as string}</h3>
                        <p className="text-xs leading-relaxed mb-3" style={{ color: "#6B7280" }}>
                          {t[featureCardKeys[cardIdx].descKey] as string}
                        </p>
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium ripple-button rounded-md px-2.5 py-1" style={{ color: "#2563EB", backgroundColor: "#2563EB10" }}>
                          <Play className="w-3 h-3" />
                          {t.startBtn}
                        </span>
                      </button>
                    ))}
                  </div>
                  <div
                    className="mt-8 w-full max-w-xl border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 transition-colors"
                    style={{ borderColor: "#E5E7EB" }}
                    onClick={() => fileInputRef.current?.click()}
                    data-testid="dropzone-upload"
                  >
                    <Upload className="w-8 h-8 mx-auto mb-2" style={{ color: "#6B7280" }} />
                    <p className="text-sm font-medium" style={{ color: "#6B7280" }}>{t.dragDropUpload}</p>
                    <p className="text-[10px] mt-1" style={{ color: "#9CA3AF" }}>{t.uploadFooter}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {threads.map((thread, idx) => {
                    const isCollapsed = collapsedThreads.has(idx);
                    const tag = detectAnalysisTag(
                      thread.userMsg.content,
                      thread.assistantMsg?.content,
                      t
                    );
                    const { displayText: previewText } = stripExcelContent(thread.userMsg.content);
                    const timestamp = formatTimestamp(thread.userMsg.createdAt);

                    return (
                      <div
                        key={thread.userMsg.id}
                        className="animate-slide-up"
                        style={{ animationDelay: `${idx * 30}ms` }}
                        data-testid={`thread-block-${idx}`}
                      >
                        <UserCommandCard
                          message={thread.userMsg}
                          displayText={previewText}
                          timestamp={timestamp}
                          isCollapsed={isCollapsed}
                          onToggle={() => toggleThread(idx)}
                          tag={tag}
                          isRtl={isRtl}
                          t={t}
                        />
                        {!isCollapsed && thread.assistantMsg && (
                          <AgentResponseCard
                            message={thread.assistantMsg}
                            summaryOverride={summaryOverrides[thread.assistantMsg.id]}
                            onDownloadResult={(resultRows.length > 0 || latestDataModel || latestPiiScan || latestDqAnalysis) ? handleDownloadResult : undefined}
                            dataModel={dataModels[thread.assistantMsg.id] || undefined}
                            dqAnalysis={dqAnalyses[thread.assistantMsg.id] || undefined}
                            insightsReport={insightsForMessage[thread.assistantMsg.id] || undefined}
                            allInsightsReports={insightsReports}
                            profiledColumns={profiledColumns}
                            lang={lang}
                            t={t}
                            tag={tag}
                            onAskFollowUp={(text) => { setInputValue(text); textareaRef.current?.focus(); }}
                          />
                        )}
                      </div>
                    );
                  })}
                  {thinkingSteps.length > 0 && (
                    <>
                      <ThinkingProgressCard steps={thinkingSteps} t={t} isRtl={isRtl} isDone={agentStatus === "done"} />
                      {streamingContent && (
                        <div
                          className="rounded-xl bg-white shadow-sm p-4 animate-slide-up"
                          style={{ borderLeft: isRtl ? "none" : "3px solid #E65100", borderRight: isRtl ? "3px solid #E65100" : "none" }}
                          data-testid="streaming-content"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: "#067647" }}>
                              <Bot className="w-3.5 h-3.5 text-white" />
                            </div>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "#E65100" }} />
                          </div>
                          <div className="prose prose-sm max-w-none break-words" style={{ color: "#1A1A2E" }}>
                            <ReactMarkdown>{streamingContent}</ReactMarkdown>
                            <span className={`inline-block w-2 h-4 bg-primary animate-pulse ${isRtl ? "mr-0.5" : "ml-0.5"} align-text-bottom`} />
                          </div>
                        </div>
                      )}
                    </>
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
                {FEATURE_CARDS.map((card, cardIdx) => (
                  <button
                    key={card.title}
                    onClick={() => {
                      setInputValue(card.prompt);
                      textareaRef.current?.focus();
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all hover:opacity-90"
                    style={{ backgroundColor: "#0D2E5C", color: "rgba(255,255,255,0.85)" }}
                    data-testid={`pill-feature-${cardIdx}`}
                  >
                    <card.icon className="w-3 h-3" />
                    {t[featureCardKeys[cardIdx].titleKey] as string}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="p-3 flex-shrink-0" style={{ backgroundColor: "#0D2E5C" }}>
            <div className="max-w-4xl mx-auto">
              {selectedFile && (
                <div className="flex items-center gap-2 mb-2 rounded-lg px-3 py-1.5" style={{ backgroundColor: "rgba(255,255,255,0.1)" }}>
                  {selectedFile.type.startsWith("image/") ? (
                    <ImagePreview file={selectedFile} />
                  ) : (
                    <FileSpreadsheet className="w-4 h-4 text-white/60 flex-shrink-0" />
                  )}
                  <span className="text-xs truncate flex-1 text-white/80 font-medium">{selectedFile.name}</span>
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
                <Button
                  type="submit"
                  className="h-9 px-4 flex-shrink-0 rounded-lg gap-1.5 text-xs font-medium text-white ripple-button"
                  style={{ backgroundColor: "#2E7D32" }}
                  disabled={isStreaming || (!inputValue.trim() && !selectedFile)}
                  data-testid="button-send-message"
                >
                  {isStreaming ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      {t.executeCmd}
                      <Play className="w-3.5 h-3.5" />
                    </>
                  )}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {!isMobile && (
        <div className="w-[300px] flex-shrink-0" data-testid="outputs-panel">
          <OutputsPanel
            t={t}
            isRtl={isRtl}
            resultRows={resultRows}
            includedAnalyses={includedAnalyses}
            latestDataModel={latestDataModel}
            latestPiiScan={latestPiiScan}
            latestDqAnalysis={latestDqAnalysis}
            insightsReports={insightsReports}
            uploadedFileName={uploadedFileName}
            onDownloadResult={handleDownloadResult}
            activityLog={activityLog}
            sheetCount={sheetCount}
          />
        </div>
      )}
    </div>
  );
}

function OutputsPanel({
  t, isRtl, resultRows, includedAnalyses, latestDataModel, latestPiiScan, latestDqAnalysis, insightsReports, uploadedFileName, onDownloadResult, activityLog, sheetCount,
}: {
  t: Translation; isRtl: boolean;
  resultRows: ResultRow[]; includedAnalyses: AnalysisType[];
  latestDataModel: DataModelJSON | null; latestPiiScan: PiiScanResult | null; latestDqAnalysis: DqAnalysisResult | null;
  insightsReports: { report: InsightsReport; fileName: string; timestamp: string; excelFileName: string; columns: BackendColumnProfile[] }[];
  uploadedFileName: string | null; onDownloadResult: () => void; activityLog: ActivityLogEntry[]; sheetCount: number;
}) {
  const hasResultXlsx = resultRows.length > 0 || latestDataModel || latestPiiScan || latestDqAnalysis;
  const hasOutputs = hasResultXlsx || insightsReports.length > 0;

  const sheetTags: { label: string; color: string }[] = [];
  for (const a of includedAnalyses) {
    sheetTags.push({ label: getAnalysisLabel(a), color: SHEET_TAG_COLORS[a] || "#6B7280" });
  }
  if (latestDataModel) sheetTags.push({ label: "Data Model", color: SHEET_TAG_COLORS.data_model });
  if (latestPiiScan) sheetTags.push({ label: "PII Scan", color: SHEET_TAG_COLORS.pii_scan });
  if (latestDqAnalysis) sheetTags.push({ label: "DQ Rules", color: SHEET_TAG_COLORS.data_quality });

  return (
    <div className="h-full bg-white flex flex-col font-main" style={{ borderLeft: isRtl ? "none" : "1px solid #E5E7EB", borderRight: isRtl ? "1px solid #E5E7EB" : "none" }} data-testid="outputs-panel-content">
      <div className="p-4 pb-3">
        <h2 className="text-sm font-bold" style={{ color: "#2563EB" }}>{t.outputsActivity}</h2>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-4 space-y-4">
          <div>
            <h3 className="text-[11px] font-semibold mb-2 flex items-center gap-1.5" style={{ color: "#1A1A2E", borderLeft: isRtl ? "none" : "3px solid #2563EB", borderRight: isRtl ? "3px solid #2563EB" : "none", paddingLeft: isRtl ? 0 : 8, paddingRight: isRtl ? 8 : 0 }}>
              <FileSpreadsheet className="w-3.5 h-3.5" style={{ color: "#2563EB" }} />
              {t.liveOutputs}
            </h3>
            {hasOutputs ? (
              <div className="space-y-2">
                {hasResultXlsx && (
                  <div
                    className="rounded-lg border p-3 cursor-pointer hover:shadow-sm transition-shadow"
                    style={{ borderColor: "#E5E7EB" }}
                    onClick={onDownloadResult}
                    data-testid="output-card-result"
                  >
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-5 h-5" style={{ color: "#2E7D32" }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold" style={{ color: "#1A1A2E" }}>result.xlsx</p>
                        <p className="text-[10px]" style={{ color: "#6B7280" }}>{sheetCount} {t.sheetsInResult}{uploadedFileName ? ` — ${uploadedFileName}` : ""}</p>
                      </div>
                      <Button size="sm" className="h-7 px-2 text-[10px] text-white" style={{ backgroundColor: "#2E7D32" }} onClick={(e) => { e.stopPropagation(); onDownloadResult(); }} data-testid="button-download-result">
                        <Download className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                )}
                {insightsReports.map((rpt, i) => (
                  <div key={i} className="rounded-lg border p-2.5" style={{ borderColor: "#E5E7EB" }}>
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" style={{ color: "#E65100" }} />
                      <span className="text-[10px] truncate flex-1" style={{ color: "#1A1A2E" }}>{rpt.excelFileName}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] py-3 text-center" style={{ color: "#9CA3AF" }}>{t.noOutputsYet}</p>
            )}
          </div>

          <div>
            <h3 className="text-[11px] font-semibold mb-2 flex items-center gap-1.5" style={{ color: "#1A1A2E", borderLeft: isRtl ? "none" : "3px solid #2563EB", borderRight: isRtl ? "3px solid #2563EB" : "none", paddingLeft: isRtl ? 0 : 8, paddingRight: isRtl ? 8 : 0 }}>
              <Tag className="w-3.5 h-3.5" style={{ color: "#2563EB" }} />
              {t.sheetTracker}
            </h3>
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

          <div>
            <h3 className="text-[11px] font-semibold mb-2 flex items-center gap-1.5" style={{ color: "#1A1A2E", borderLeft: isRtl ? "none" : "3px solid #2563EB", borderRight: isRtl ? "3px solid #2563EB" : "none", paddingLeft: isRtl ? 0 : 8, paddingRight: isRtl ? 8 : 0 }}>
              <Clock className="w-3.5 h-3.5" style={{ color: "#2563EB" }} />
              {t.activityTimeline}
            </h3>
            {activityLog.length > 0 ? (
              <div className="space-y-0">
                {activityLog.slice(-20).reverse().map((entry, i) => (
                  <div key={i} className="flex items-start gap-2 py-1.5" style={{ borderLeft: isRtl ? "none" : "2px solid #E5E7EB", borderRight: isRtl ? "2px solid #E5E7EB" : "none", paddingLeft: isRtl ? 0 : 10, paddingRight: isRtl ? 10 : 0 }}>
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
        </div>
      </ScrollArea>
    </div>
  );
}

function UserCommandCard({
  message, displayText, timestamp, isCollapsed, onToggle, tag, isRtl, t,
}: {
  message: Message; displayText: string; timestamp: string; isCollapsed: boolean; onToggle: () => void; tag: string | null; isRtl: boolean; t: Translation;
}) {
  const { fileName } = stripExcelContent(message.content);
  const preview = displayText.substring(0, 80) + (displayText.length > 80 ? "..." : "");

  return (
    <div
      className="rounded-t-xl bg-white/80 cursor-pointer"
      style={{ borderLeft: isRtl ? "none" : "3px solid #2563EB", borderRight: isRtl ? "3px solid #2563EB" : "none" }}
      onClick={onToggle}
      data-testid={`user-command-${message.id}`}
    >
      <div className="flex items-center gap-3 px-4 py-2.5">
        <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
          <User className="w-3.5 h-3.5" style={{ color: "#6B7280" }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold" style={{ color: "#2563EB" }}>{t.commandLabel}</span>
            {tag && (
              <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "#2563EB15", color: "#2563EB" }}>{tag}</span>
            )}
          </div>
          <p className="text-xs truncate" style={{ color: "#1A1A2E" }}>{preview}</p>
          {fileName && (
            <div className="flex items-center gap-1 mt-0.5">
              <Paperclip className="w-2.5 h-2.5" style={{ color: "#9CA3AF" }} />
              <span className="text-[9px]" style={{ color: "#9CA3AF" }}>{fileName}</span>
            </div>
          )}
        </div>
        <span className="text-[9px] flex-shrink-0 tabular-nums" style={{ color: "#9CA3AF" }}>{timestamp}</span>
        {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" style={{ color: "#9CA3AF" }} /> : <ChevronDown className="w-3.5 h-3.5" style={{ color: "#9CA3AF" }} />}
      </div>
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

function AgentResponseCard({
  message, summaryOverride, onDownloadResult, dataModel, dqAnalysis, insightsReport, allInsightsReports, profiledColumns = [], lang = "en", t, tag, onAskFollowUp,
}: {
  message: Message; summaryOverride?: string; onDownloadResult?: () => void;
  dataModel?: DataModelJSON | null; dqAnalysis?: DqAnalysisResult | null;
  insightsReport?: InsightsReport | null;
  allInsightsReports?: { report: InsightsReport; fileName: string; timestamp: string; excelFileName: string; columns: BackendColumnProfile[] }[];
  profiledColumns?: BackendColumnProfile[]; lang?: Lang; t?: Translation; tag?: string | null;
  onAskFollowUp?: (text: string) => void;
}) {
  const tr = t || translations[lang];
  const isRtl = lang === "ar";
  const hasDataModel = dataModel != null;
  const hasDqAnalysis = dqAnalysis != null;
  const hasInsights = insightsReport != null;
  const hasSummary = !!summaryOverride;
  const [expanded, setExpanded] = useState(true);
  const timestamp = formatTimestamp(message.createdAt);

  const borderColor = "#2E7D32";
  const statusText = "✅ Complete";
  const statusColor = "#2E7D32";

  const handleDownloadInsights = (report: InsightsReport, srcFile?: string, cols?: BackendColumnProfile[]) => {
    generateInsightsExcel(report, srcFile || "data.xlsx", cols || profiledColumns);
  };

  return (
    <div
      className="rounded-b-xl bg-white shadow-sm mb-3 animate-slide-up"
      style={{ borderLeft: isRtl ? "none" : `3px solid ${borderColor}`, borderRight: isRtl ? `3px solid ${borderColor}` : "none" }}
      data-testid={`agent-response-${message.id}`}
    >
      <div className="flex items-center gap-2 px-4 py-2 border-b" style={{ borderColor: "#E5E7EB" }}>
        <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: "#067647" }}>
          <Bot className="w-3.5 h-3.5 text-white" />
        </div>
        {tag && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: "#0D2E5C", color: "#ffffff" }}>{tag}</span>
        )}
        <span className="text-[10px] font-medium" style={{ color: statusColor }}>{statusText}</span>
        <div className="flex-1" />
        <span className="text-[9px] tabular-nums" style={{ color: "#9CA3AF" }}>{timestamp}</span>
        <button onClick={() => setExpanded(!expanded)} className="p-0.5" data-testid={`button-toggle-response-${message.id}`}>
          {expanded ? <ChevronDown className="w-3.5 h-3.5" style={{ color: "#9CA3AF" }} /> : <ChevronRight className="w-3.5 h-3.5" style={{ color: "#9CA3AF" }} />}
        </button>
      </div>

      {expanded && (
        <div className="px-4 py-3 space-y-3">
          {hasSummary && (
            <div className="text-sm leading-relaxed whitespace-pre-wrap break-words" style={{ color: "#1A1A2E" }}>{summaryOverride}</div>
          )}

          {hasDataModel && (
            <DataModelDiagram model={dataModel!} onDownloadExcel={onDownloadResult} lang={lang} />
          )}

          {hasDqAnalysis && dqAnalysis && (
            <div className="space-y-3" data-testid={`dq-scorecard-${message.id}`}>
              <DqDonutChart dqAnalysis={dqAnalysis} lang={lang} />
              <div className="text-[11px]" style={{ color: "#6B7280" }}>
                {lang === "ar"
                  ? `تم تحليل ${dqAnalysis.analysis_summary.total_fields_analyzed} حقل — ${dqAnalysis.analysis_summary.total_rules_generated} قاعدة جودة`
                  : `${dqAnalysis.analysis_summary.total_fields_analyzed} fields analyzed — ${dqAnalysis.analysis_summary.total_rules_generated} quality rules generated`}
              </div>
            </div>
          )}

          {hasInsights && (
            <div className="space-y-2" data-testid={`insights-card-${message.id}`}>
              <Button
                size="sm"
                onClick={() => handleDownloadInsights(insightsReport!)}
                className="gap-1.5 text-[11px] text-white font-medium h-8 px-3 rounded-md ripple-button"
                style={{ backgroundColor: "#1A4B8C" }}
                data-testid={`button-download-insights-${message.id}`}
              >
                <Download className="w-3.5 h-3.5" />
                {tr.downloadInsightsReport}
              </Button>
              {allInsightsReports && allInsightsReports.length > 1 && (
                <div className="space-y-1">
                  <p className="text-[10px] font-medium" style={{ color: "#6B7280" }}>{tr.previousReports}</p>
                  {allInsightsReports.map((rpt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <FileSpreadsheet className="w-3 h-3 flex-shrink-0" style={{ color: "#6B7280" }} />
                      <span className="text-[10px] truncate flex-1" style={{ color: "#6B7280" }}>{rpt.excelFileName}</span>
                      <Button size="sm" variant="ghost" className="h-5 px-1.5 text-[9px]" onClick={() => handleDownloadInsights(rpt.report, rpt.fileName, rpt.columns)} data-testid={`button-download-prev-insights-${i}`}>
                        <Download className="w-2.5 h-2.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {!hasSummary && !hasDataModel && !hasDqAnalysis && !hasInsights && (
            <div className="prose prose-sm max-w-none break-words" style={{ color: "#1A1A2E" }}>
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}

          <div className="flex items-center gap-2 pt-2 border-t" style={{ borderColor: "#E5E7EB" }}>
            {onDownloadResult && (
              <Button
                size="sm"
                onClick={onDownloadResult}
                className="gap-1.5 text-[10px] text-white font-medium h-7 px-2.5 rounded-md ripple-button"
                style={{ backgroundColor: "#2E7D32" }}
                data-testid={`button-download-result-${message.id}`}
              >
                <Download className="w-3 h-3" />
                {tr.downloadResultXlsx}
              </Button>
            )}
            {onAskFollowUp && (
              <Button
                size="sm"
                variant="ghost"
                className="gap-1.5 text-[10px] h-7 px-2.5"
                style={{ color: "#6B7280" }}
                onClick={() => onAskFollowUp("")}
                data-testid={`button-followup-${message.id}`}
              >
                <MessageSquare className="w-3 h-3" />
                {tr.askFollowUp}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ThinkingProgressCard({ steps, t, isRtl, isDone }: { steps: ThinkingStep[]; t: Translation; isRtl: boolean; isDone?: boolean }) {
  return (
    <div className="rounded-xl bg-white shadow-sm p-4 animate-slide-up" style={{ borderLeft: isRtl ? "none" : `3px solid ${isDone ? "#2E7D32" : "#E65100"}`, borderRight: isRtl ? `3px solid ${isDone ? "#2E7D32" : "#E65100"}` : "none" }} data-testid="thinking-progress">
      <div className="flex items-center gap-2 mb-3">
        {isDone ? (
          <CheckCircle2 className="w-4 h-4" style={{ color: "#2E7D32" }} />
        ) : (
          <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#E65100" }} />
        )}
        <span className="text-sm font-semibold" style={{ color: "#1A1A2E" }}>{isDone ? t.agentCompleted : t.agentWorking}</span>
      </div>
      <div className="border-t" style={{ borderColor: "#E5E7EB" }} />
      <div className="mt-3 space-y-2">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-2.5">
            {step.status === "done" ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: "#2E7D32" }} />
            ) : step.status === "active" ? (
              <Loader2 className="w-4 h-4 flex-shrink-0 animate-spin" style={{ color: "#E65100" }} />
            ) : (
              <Circle className="w-4 h-4 flex-shrink-0" style={{ color: "#D1D5DB" }} />
            )}
            <span
              className="text-xs"
              style={{ color: step.status === "done" ? "#2E7D32" : step.status === "active" ? "#E65100" : "#9CA3AF", fontWeight: step.status === "active" ? 600 : 400 }}
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
