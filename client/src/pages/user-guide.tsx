import { useState } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft, BookOpen, Database, Layers, Brain, Target,
  FileSpreadsheet, FileText, Globe, Upload, Download,
  ShieldCheck, CheckCircle, BarChart3, ScanEye,
  ChevronDown, ChevronRight,
} from "lucide-react";

type Lang = "en" | "ar";

const t = {
  en: {
    backToAgent: "Back to Agent",
    title: "User Guide",
    subtitle: "Everything you need to know to get the most out of the ZATCA Data & Analytics Agent",
    sections: [
      {
        id: "getting-started",
        icon: BookOpen,
        color: "#0094D3",
        title: "Getting Started",
        content: [
          {
            heading: "What is the ZATCA Data & Analytics Agent?",
            body: "An AI-powered command center for ZATCA data governance professionals. It automates the most time-consuming data tasks — classification, quality rules, business definitions, PII detection, analytical modelling, and behavioural economics nudges — through a conversational interface backed by Claude Sonnet.",
          },
          {
            heading: "How to start a session",
            body: "Click 'New Data Management Agent', 'New Analytical Data Model Agent', or 'New Insight Report Agent' in the sidebar. Type a request or upload a file in the command console at the bottom. For the Nudge Agent, click the Nudge Agent tab in the top bar.",
          },
          {
            heading: "Switching between agents",
            body: "Use the agent tabs directly below the header: Data Management | Analytical Model | Insights Agent | Nudge Agent. Each agent has its own isolated session list.",
          },
        ],
      },
      {
        id: "data-management",
        icon: Database,
        color: "#0094D3",
        title: "Data Management Agent",
        content: [
          {
            heading: "Data Classification (SDAIA NDMO)",
            body: "Classify every field in your dataset according to the Saudi National Data Management Office 5-level framework: Top Secret, Secret, Confidential, Restricted, and Public. Upload an Excel file or paste field names, then ask 'classify this data'. Results include classification level, rationale, sensitivity category, and handling requirements — exported to Classifications sheet in result.xlsx.",
          },
          {
            heading: "Business Definitions",
            body: "Generate comprehensive field-level definitions: business description, data type recommendation, expected format, valid values, business rules, and relationships. Ask 'generate business definitions'. Output is a structured markdown table exportable to Excel.",
          },
          {
            heading: "4-Layer Data Quality Rules",
            body: "Full DQ rule generation across four layers: Layer 1 (Technical — nulls, data types, formats, lengths), Layer 2 (Logical — ranges, uniqueness, referential integrity), Layer 3 (Business & Cross-Field — ZATCA/FATOORAH regulatory rules, conditional logic), Layer 4 (Warnings — suspicious patterns, missing constraints). Ask 'generate data quality rules'. Output includes an interactive donut chart by DQ dimension.",
          },
          {
            heading: "PII Detection (PDPL)",
            body: "Scan your dataset for personal and sensitive information against Saudi PDPL categories and international PII patterns. Ask 'detect PII' or 'scan for sensitive data'. Each flagged column gets a risk level (High/Medium/Low), legal basis reference, PDPL article, and recommended handling. Output exports to a PII Scan sheet.",
          },
        ],
      },
      {
        id: "analytical-model",
        icon: Layers,
        color: "#774896",
        title: "Analytical Model Agent",
        content: [
          {
            heading: "Star Schema Design",
            body: "Switch to the Analytical Model tab, upload your source data, and ask 'build an analytical data model'. The agent designs a full star schema with fact tables, dimension tables, grain definition, and relationships between tables.",
          },
          {
            heading: "Interactive Diagram",
            body: "After analysis, an interactive SVG star schema diagram is rendered directly in the chat. Fact tables appear in the center, dimension tables radiate outward. The diagram is fully readable and resizable.",
          },
          {
            heading: "DDL SQL Scripts",
            body: "Full CREATE TABLE DDL scripts are generated for every fact and dimension table, including data types, primary keys, foreign key relationships, and NOT NULL constraints. Ready to run in your data warehouse.",
          },
        ],
      },
      {
        id: "insights-agent",
        icon: Brain,
        color: "#067647",
        title: "Insights Agent",
        content: [
          {
            heading: "Uploading your data",
            body: "Switch to the Insights Agent tab. Upload an Excel file (.xlsx or .xls) using the paperclip icon in the command console, then ask 'analyze this data' or 'give me insights'. The agent profiles every column automatically.",
          },
          {
            heading: "What the report includes",
            body: "Executive summary, key insights with headlines, column-level statistics (null rates, cardinality, min/max/avg), anomalies and outliers, trends over time dimensions, and actionable recommendations tailored to the dataset.",
          },
          {
            heading: "Exporting the report",
            body: "Click the 'Download Insights Report' button in the response card. The report is exported as a styled standalone Excel file with a cover page, summary sheet, and per-column detail sheets.",
          },
        ],
      },
      {
        id: "nudge-agent",
        icon: Target,
        color: "#7C3AED",
        title: "Nudge Agent",
        content: [
          {
            heading: "What is the Nudge Agent?",
            body: "A standalone behavioural economics tool for ZATCA tax compliance professionals. It takes a free-form compliance scenario (e.g. 'SMEs filing VAT returns late') and applies behavioural science to design targeted intervention strategies.",
          },
          {
            heading: "How to use it",
            body: "Click 'Nudge Agent' in the agent tabs at the top. Type your compliance scenario in the input box and click 'Analyse'. The agent runs a 6-step analysis covering diagnosis, population segmentation, behavioural levers, and an intervention plan.",
          },
          {
            heading: "Understanding the results",
            body: "Results are structured into 4 sections: (A) Diagnosis — root causes, emotional drivers, friction points; (B) Taxpayer Segments — risk level and receptiveness per group; (C) Behavioral Levers — word-for-word nudge messages in yellow boxes; (D) Intervention Plan — numbered sequence, quick wins, KPIs, and estimated compliance lift.",
          },
          {
            heading: "Follow-up questions",
            body: "After results appear, you can ask follow-up questions (e.g. 'what digital channels work best for segment 2?') in the follow-up input below the results. The agent answers using your generated report as context.",
          },
          {
            heading: "Export",
            body: "Click 'Download Nudge Report' to export results to nudge_report_[timestamp].xlsx with 5 sheets: executive_summary, diagnosis, population_segments, behavioral_levers, intervention_plan.",
          },
        ],
      },
      {
        id: "file-uploads",
        icon: Upload,
        color: "#F57C00",
        title: "File Uploads",
        content: [
          {
            heading: "Supported formats",
            body: "Excel (.xlsx, .xls) — column profiling and sample rows extracted automatically. PDF (.pdf) — text and table content extracted. Word (.docx, .doc) — full text extraction. Images (.png, .jpg, .jpeg, .webp, .gif) — analyzed via Claude Vision. Camera capture — available on mobile and touch devices via the camera icon.",
          },
          {
            heading: "How to upload",
            body: "Click the paperclip icon in the command console to select a file from your device. On mobile, a camera icon appears for direct photo capture. Files are processed server-side and attached to your message automatically.",
          },
          {
            heading: "Large images",
            body: "Images larger than 4.5 MB are automatically compressed before being sent to Claude. You will see the same analysis quality for most document and data images.",
          },
        ],
      },
      {
        id: "exporting",
        icon: Download,
        color: "#2E7D32",
        title: "Exporting Results",
        content: [
          {
            heading: "result.xlsx (main output file)",
            body: "Every analysis in Data Management and Analytical Model modes accumulates into a single result.xlsx file. Sheets are deduplicated and updated with each new analysis. Available sheets: Classifications, Business Definitions, DQ Rules (Technical, Logical, Business), PII Scan, Analytical Model.",
          },
          {
            heading: "Downloading result.xlsx",
            body: "Click the green 'Download result.xlsx' button in the right Outputs panel, or the download button inside any response card. The file always contains the latest combined results from your session.",
          },
          {
            heading: "nudge_report_[timestamp].xlsx",
            body: "The Nudge Agent exports to a separate file named with a timestamp. This file is completely isolated from result.xlsx and contains 5 dedicated sheets for the nudge analysis.",
          },
        ],
      },
      {
        id: "language",
        icon: Globe,
        color: "#51BAB4",
        title: "Language & Accessibility",
        content: [
          {
            heading: "Switching languages",
            body: "Click the EN / AR button in the top-right corner of the main agent view to switch between English and Arabic. All UI labels, placeholders, buttons, and agent response labels switch instantly.",
          },
          {
            heading: "Arabic RTL layout",
            body: "When Arabic is active, the entire layout flips to right-to-left: the sidebar moves to the right, text aligns right, and directional icons reverse. The command console and all panels fully support RTL input.",
          },
          {
            heading: "AI responses",
            body: "Claude responses are always in English regardless of the UI language. The language toggle only controls the interface labels and navigation, not the AI-generated content.",
          },
        ],
      },
      {
        id: "scope-guardrails",
        icon: ShieldCheck,
        color: "#DC2626",
        title: "Scope & Guardrails",
        content: [
          {
            heading: "What the agent will answer",
            body: "The agent is scoped exclusively to ZATCA's work areas: data classification (SDAIA NDMO), business definitions, data quality rules, analytical modelling, PII detection (PDPL), data insights, Informatica metadata, and behavioural compliance analysis (Nudge Agent). All responses apply Saudi context — PDPL 2023, VAT Law, FATOORAH, SDAIA NDMO, SAR currency, Saudi business examples.",
          },
          {
            heading: "What the agent will not answer",
            body: "The agent will decline any request outside these areas — including general coding help, personal questions, news, entertainment, or topics unrelated to ZATCA's data and compliance work. Every Claude API call carries the same ZATCA consultant persona and scope rules, so this behaviour is consistent across all features.",
          },
          {
            heading: "Out-of-scope warning card",
            body: "If you ask something outside the agent's scope, you will see a yellow ⚠️ warning card instead of a normal response. The card reads 'Out of Scope' and invites you to rephrase your question within the allowed areas. The input console remains active so you can immediately ask something else.",
          },
          {
            heading: "Consistent persona",
            body: "Every response — whether a data classification table, a DQ rules JSON, a nudge analysis, or a simple follow-up answer — comes from the same expert ZATCA consultant persona. Tone, scope rules, and Saudi regulatory context are applied uniformly to all interactions.",
          },
        ],
      },
    ],
  },
  ar: {
    backToAgent: "العودة إلى الوكيل",
    title: "دليل المستخدم",
    subtitle: "كل ما تحتاج معرفته للاستفادة القصوى من وكيل البيانات والتحليلات لزاتكا",
    sections: [
      {
        id: "getting-started",
        icon: BookOpen,
        color: "#0094D3",
        title: "البدء",
        content: [
          {
            heading: "ما هو وكيل البيانات والتحليلات لزاتكا؟",
            body: "مركز قيادة مدعوم بالذكاء الاصطناعي لمتخصصي حوكمة البيانات في زاتكا. يُؤتمت أكثر المهام استهلاكًا للوقت — التصنيف، وقواعد الجودة، والتعريفات التجارية، والكشف عن البيانات الشخصية، ونمذجة البيانات التحليلية — عبر واجهة محادثة مدعومة بـ Claude Sonnet.",
          },
          {
            heading: "كيفية بدء جلسة",
            body: "انقر على 'وكيل إدارة البيانات الجديد' أو 'وكيل نموذج البيانات التحليلية الجديد' في الشريط الجانبي. اكتب طلبك أو حمّل ملفًا في وحدة تحكم الأوامر أسفل الصفحة.",
          },
          {
            heading: "التنقل بين الوكلاء",
            body: "استخدم تبويبات الوكيل أسفل الرأس مباشرةً: إدارة البيانات | النموذج التحليلي | وكيل الرؤى | وكيل التحفيز. لكل وكيل قائمة جلسات معزولة خاصة به.",
          },
        ],
      },
      {
        id: "data-management",
        icon: Database,
        color: "#0094D3",
        title: "وكيل إدارة البيانات",
        content: [
          {
            heading: "تصنيف البيانات (SDAIA NDMO)",
            body: "صنّف كل حقل في بياناتك وفق الإطار الوطني لإدارة البيانات (NDMO) ذي المستويات الخمس: سري للغاية، سري، سري للمؤسسة، مقيد، وعام. حمّل ملف Excel أو الصق أسماء الحقول ثم اطلب 'تصنيف هذه البيانات'.",
          },
          {
            heading: "التعريفات التجارية",
            body: "أنشئ تعريفات شاملة على مستوى الحقل: الوصف التجاري، نوع البيانات الموصى به، التنسيق المتوقع، القيم الصالحة، قواعد العمل، والعلاقات. اطلب 'إنشاء التعريفات التجارية'.",
          },
          {
            heading: "قواعد جودة البيانات (4 طبقات)",
            body: "توليد قواعد جودة كاملة عبر أربع طبقات: الطبقة 1 (التقنية)، الطبقة 2 (المنطقية)، الطبقة 3 (الأعمال والحقول المتقاطعة بما فيها قواعد زاتكا/فاتورة)، الطبقة 4 (التحذيرات). اطلب 'توليد قواعد جودة البيانات'.",
          },
          {
            heading: "الكشف عن البيانات الشخصية (PDPL)",
            body: "افحص بياناتك بحثًا عن المعلومات الشخصية والحساسة وفق فئات نظام حماية البيانات الشخصية السعودي. اطلب 'الكشف عن البيانات الشخصية'. كل عمود مُبلَّغ عنه يحصل على مستوى المخاطرة وأساسه القانوني ومادة النظام المعنية.",
          },
        ],
      },
      {
        id: "analytical-model",
        icon: Layers,
        color: "#774896",
        title: "وكيل النموذج التحليلي",
        content: [
          {
            heading: "تصميم المخطط النجمي",
            body: "انتقل إلى تبويب النموذج التحليلي، حمّل بياناتك المصدر، واطلب 'بناء نموذج بيانات تحليلي'. يصمم الوكيل مخططًا نجميًا كاملًا بجداول الحقائق والأبعاد وتعريف الحبوب والعلاقات.",
          },
          {
            heading: "المخطط التفاعلي",
            body: "بعد التحليل، يُعرض مخطط SVG تفاعلي للمخطط النجمي مباشرةً في المحادثة. تظهر جداول الحقائق في المنتصف وتتوزع جداول الأبعاد حولها.",
          },
          {
            heading: "نصوص DDL SQL",
            body: "تُولَّد نصوص CREATE TABLE كاملة لكل جدول، تتضمن أنواع البيانات والمفاتيح الأساسية وعلاقات المفاتيح الخارجية وقيود NOT NULL. جاهزة للتشغيل في مستودع بياناتك.",
          },
        ],
      },
      {
        id: "insights-agent",
        icon: Brain,
        color: "#067647",
        title: "وكيل الرؤى",
        content: [
          {
            heading: "رفع بياناتك",
            body: "انتقل إلى تبويب وكيل الرؤى. حمّل ملف Excel باستخدام أيقونة المشبك في وحدة تحكم الأوامر، ثم اطلب 'تحليل هذه البيانات'. يقوم الوكيل بتحليل كل عمود تلقائيًا.",
          },
          {
            heading: "ما يتضمنه التقرير",
            body: "ملخص تنفيذي، رؤى رئيسية بعناوين واضحة، إحصاءات على مستوى الأعمدة (معدلات الفراغ، الأنماط، الحد الأدنى/الأقصى/المتوسط)، الشذوذات والقيم المتطرفة، الاتجاهات، وتوصيات قابلة للتنفيذ.",
          },
          {
            heading: "تصدير التقرير",
            body: "انقر على زر 'تنزيل تقرير الرؤى' في بطاقة الاستجابة. يُصدَّر التقرير كملف Excel منسق مستقل يحتوي على صفحة غلاف وصفحة ملخص وصفحات تفصيلية لكل عمود.",
          },
        ],
      },
      {
        id: "nudge-agent",
        icon: Target,
        color: "#7C3AED",
        title: "وكيل التحفيز",
        content: [
          {
            heading: "ما هو وكيل التحفيز؟",
            body: "أداة اقتصاد سلوكي مستقلة لمتخصصي الامتثال الضريبي في زاتكا. يأخذ سيناريو امتثال (مثل 'المنشآت الصغيرة المتأخرة في تقديم إقرارات ضريبة القيمة المضافة') ويطبق علم السلوك لتصميم استراتيجيات تدخل مستهدفة.",
          },
          {
            heading: "كيفية الاستخدام",
            body: "انقر على 'وكيل التحفيز' في تبويبات الوكيل أعلى الصفحة. اكتب سيناريو الامتثال في مربع الإدخال وانقر على 'تحليل'. يُجري الوكيل تحليلًا من 6 خطوات يشمل التشخيص والتقسيم والرافعات السلوكية وخطة التدخل.",
          },
          {
            heading: "فهم النتائج",
            body: "النتائج مُنظَّمة في 4 أقسام: (أ) التشخيص — الأسباب الجذرية والدوافع العاطفية ونقاط الاحتكاك؛ (ب) شرائح دافعي الضرائب؛ (ج) الرافعات السلوكية — رسائل التحفيز الحرفية في مربعات صفراء؛ (د) خطة التدخل.",
          },
          {
            heading: "التصدير",
            body: "انقر على 'تنزيل تقرير التحفيز' لتصدير النتائج إلى nudge_report_[timestamp].xlsx بـ 5 أوراق عمل.",
          },
        ],
      },
      {
        id: "file-uploads",
        icon: Upload,
        color: "#F57C00",
        title: "رفع الملفات",
        content: [
          {
            heading: "التنسيقات المدعومة",
            body: "Excel (.xlsx, .xls) — استخراج تلقائي لأعمدة وعينات الصفوف. PDF (.pdf) — استخراج النصوص والجداول. Word (.docx, .doc) — استخراج النص الكامل. الصور (.png, .jpg, .webp) — تحليل عبر Claude Vision. التقاط الكاميرا — متاح على الأجهزة المحمولة.",
          },
          {
            heading: "كيفية الرفع",
            body: "انقر على أيقونة المشبك في وحدة تحكم الأوامر لاختيار ملف من جهازك. على الأجهزة المحمولة تظهر أيقونة الكاميرا للتقاط صورة مباشرة.",
          },
        ],
      },
      {
        id: "exporting",
        icon: Download,
        color: "#2E7D32",
        title: "تصدير النتائج",
        content: [
          {
            heading: "result.xlsx (ملف الإخراج الرئيسي)",
            body: "كل تحليل في أوضاع إدارة البيانات والنموذج التحليلي يتراكم في ملف result.xlsx واحد. يتم تحديث الأوراق وإزالة التكرار مع كل تحليل جديد.",
          },
          {
            heading: "تنزيل result.xlsx",
            body: "انقر على زر 'تنزيل result.xlsx' الأخضر في لوحة المخرجات اليمنى، أو زر التنزيل داخل أي بطاقة استجابة.",
          },
          {
            heading: "nudge_report_[timestamp].xlsx",
            body: "يُصدر وكيل التحفيز إلى ملف منفصل بختم زمني. هذا الملف معزول تمامًا عن result.xlsx.",
          },
        ],
      },
      {
        id: "language",
        icon: Globe,
        color: "#51BAB4",
        title: "اللغة وإمكانية الوصول",
        content: [
          {
            heading: "تبديل اللغة",
            body: "انقر على زر EN / AR في الزاوية العلوية للتبديل بين الإنجليزية والعربية. تتبدل جميع تسميات الواجهة والأزرار وعناصر التنقل فورًا.",
          },
          {
            heading: "التخطيط العربي RTL",
            body: "عند تفعيل العربية، ينقلب التخطيط بالكامل من اليمين إلى اليسار: يتحرك الشريط الجانبي إلى اليمين، ويتوافق النص يمينًا، وتنعكس الأيقونات الاتجاهية.",
          },
          {
            heading: "ردود الذكاء الاصطناعي",
            body: "ردود Claude تكون دائمًا بالإنجليزية بصرف النظر عن لغة الواجهة. يتحكم زر اللغة في تسميات الواجهة والتنقل فقط، وليس في المحتوى المُولَّد بالذكاء الاصطناعي.",
          },
        ],
      },
      {
        id: "scope-guardrails",
        icon: ShieldCheck,
        color: "#DC2626",
        title: "النطاق والضوابط",
        content: [
          {
            heading: "ما يجيب عنه الوكيل",
            body: "نطاق الوكيل حصري لمجالات عمل زاتكا: تصنيف البيانات (SDAIA NDMO)، التعريفات التجارية، قواعد جودة البيانات، النمذجة التحليلية، الكشف عن البيانات الشخصية (PDPL)، الرؤى البيانية، مخرجات Informatica، وتحليل الامتثال السلوكي. تُطبَّق على جميع الردود السياق السعودي — PDPL 2023، نظام ضريبة القيمة المضافة، فاتورة، SDAIA NDMO، عملة SAR، وأمثلة الأعمال السعودية.",
          },
          {
            heading: "ما لا يجيب عنه الوكيل",
            body: "سيرفض الوكيل أي طلب خارج هذه المجالات — بما في ذلك المساعدة العامة في البرمجة، والأسئلة الشخصية، والأخبار، والترفيه، أو أي موضوع غير مرتبط بعمل زاتكا في مجال البيانات والامتثال. يحمل كل استدعاء لـ Claude نفس شخصية المستشار ونفس قواعد النطاق.",
          },
          {
            heading: "بطاقة تحذير خارج النطاق",
            body: "إذا طرحت سؤالًا خارج نطاق الوكيل، ستظهر بطاقة تحذير صفراء ⚠️ بدلًا من الاستجابة العادية. تعرض البطاقة 'خارج النطاق' وتدعوك لإعادة صياغة سؤالك ضمن المجالات المسموح بها. تبقى وحدة تحكم الإدخال نشطة حتى تتمكن من طرح سؤال آخر فورًا.",
          },
          {
            heading: "شخصية متسقة",
            body: "كل استجابة — سواء كانت جدول تصنيف بيانات، أو JSON لقواعد الجودة، أو تحليل تحفيز، أو إجابة متابعة بسيطة — تأتي من نفس شخصية مستشار زاتكا الخبير. يُطبَّق النبرة وقواعد النطاق والسياق التنظيمي السعودي بشكل موحد على جميع التفاعلات.",
          },
        ],
      },
    ],
  },
};

export default function UserGuidePage() {
  const [lang, setLang] = useState<Lang>("en");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["getting-started"]));
  const [, navigate] = useLocation();

  const isRtl = lang === "ar";
  const tr = t[lang];

  const toggleSection = (id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 font-main" dir={isRtl ? "rtl" : "ltr"}>
      <div style={{ backgroundColor: "#0D2E5C" }} className="sticky top-0 z-30 shadow-md">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 text-white/70 hover:text-white transition-colors text-sm"
              data-testid="link-back-to-agent"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{tr.backToAgent}</span>
            </button>
            <div className="w-px h-5 bg-white/20" />
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-white/70" />
              <span className="text-white font-semibold text-sm">{tr.title}</span>
            </div>
          </div>
          <button
            onClick={() => setLang(l => l === "en" ? "ar" : "en")}
            className="text-white/70 hover:text-white text-sm border border-white/20 hover:border-white/40 rounded-md px-3 py-1.5 transition-all"
            data-testid="button-toggle-language"
          >
            {lang === "en" ? "عربي" : "English"}
          </button>
        </div>
      </div>

      <div style={{ background: "linear-gradient(135deg, #0D2E5C 0%, #1A4B8C 50%, #0094D3 100%)" }} className="py-12 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/10 mb-4">
            <BookOpen className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">{tr.title}</h1>
          <p className="text-white/70 text-sm max-w-xl mx-auto">{tr.subtitle}</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10 space-y-3">
        {tr.sections.map((section) => {
          const Icon = section.icon;
          const isOpen = expandedSections.has(section.id);
          return (
            <div
              key={section.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
              data-testid={`section-${section.id}`}
            >
              <button
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
                onClick={() => toggleSection(section.id)}
                data-testid={`toggle-section-${section.id}`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0"
                    style={{ backgroundColor: section.color + "18" }}
                  >
                    <Icon className="w-4 h-4" style={{ color: section.color }} />
                  </div>
                  <span className="font-semibold text-gray-900 text-sm">{section.title}</span>
                </div>
                {isOpen
                  ? <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                }
              </button>

              {isOpen && (
                <div className="border-t border-gray-100 px-5 py-4 space-y-5">
                  {section.content.map((item, idx) => (
                    <div key={idx}>
                      <h3 className="text-sm font-semibold text-gray-800 mb-1.5">{item.heading}</h3>
                      <p className="text-sm text-gray-600 leading-relaxed">{item.body}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="pb-10 text-center">
        <p className="text-xs text-gray-400">
          {lang === "en"
            ? "ZATCA Data & Analytics Agent — Powered by Claude Sonnet"
            : "وكيل البيانات والتحليلات لزاتكا — مدعوم بـ Claude Sonnet"}
        </p>
      </div>
    </div>
  );
}
