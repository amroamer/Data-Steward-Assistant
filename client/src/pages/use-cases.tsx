import { useState } from "react";
import { useLocation } from "wouter";
import {
  ShieldCheck, BookOpen, CheckCircle, Cpu, BookMarked,
  ScanEye, Lock, Globe, Database, Code2, GitBranch,
  BarChart3, AlertTriangle, FileText, X, ArrowLeft,
  ChevronRight, ExternalLink, LayoutGrid, Target, Users, TrendingUp, Bell,
} from "lucide-react";

type Lang = "en" | "ar";
type Category = "all" | "data-management" | "compliance" | "analytics" | "insights" | "nudge";
type AgentMode = "data-management" | "data-model" | "insights" | "nudge";

interface UseCase {
  id: number;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  category: Exclude<Category, "all">;
  agentMode: AgentMode;
  title: Record<Lang, string>;
  description: Record<Lang, string>;
  role: Record<Lang, string>;
  userStory: Record<Lang, string>;
  exampleInput: string[];
  prompt: string;
}

const USE_CASES: UseCase[] = [
  {
    id: 1,
    icon: ShieldCheck,
    color: "#067647",
    bgColor: "#F0FDF4",
    category: "data-management",
    agentMode: "data-management",
    title: { en: "Classify Data Fields (SDAIA NDMO)", ar: "تصنيف حقول البيانات (SDAIA NDMO)" },
    description: { en: "Assign classification levels to every field per Saudi NDMO framework", ar: "تعيين مستويات التصنيف لكل حقل وفق إطار NDMO السعودي" },
    role: { en: "Data Steward", ar: "مسؤول البيانات" },
    userStory: {
      en: "As a Data Steward, I want to classify every field in my dataset per SDAIA NDMO levels so that I meet Saudi data governance compliance requirements and can publish a formal classification register.",
      ar: "بوصفي مسؤول بيانات، أريد تصنيف كل حقل في مجموعة بياناتي وفق مستويات SDAIA NDMO حتى أستوفي متطلبات حوكمة البيانات السعودية وأتمكن من نشر سجل تصنيف رسمي.",
    },
    exampleInput: ["TaxpayerID", "InvoiceAmount", "EmailAddress", "CompanyName", "TransactionDate", "VATRate"],
    prompt: "Please classify all fields in the uploaded data according to the Saudi SDAIA NDMO data classification framework. For each field provide: classification level (Top Secret / Secret / Confidential / Restricted / Public), rationale, sensitivity category, data owner role, and any handling requirements.",
  },
  {
    id: 2,
    icon: BookOpen,
    color: "#51BAB4",
    bgColor: "#F0FDFC",
    category: "data-management",
    agentMode: "data-management",
    title: { en: "Generate Business Definitions", ar: "إنشاء التعريفات التجارية" },
    description: { en: "Full field-level definitions: description, data type, valid values, and business rules", ar: "تعريفات كاملة على مستوى الحقل: الوصف، نوع البيانات، القيم الصحيحة، وقواعد الأعمال" },
    role: { en: "Data Owner", ar: "مالك البيانات" },
    userStory: {
      en: "As a Data Owner, I want a full business definition for every column so that analysts and developers understand the data without having to ask me, and so I can maintain a compliant data catalogue.",
      ar: "بوصفي مالك بيانات، أريد تعريفًا تجاريًا كاملًا لكل عمود حتى يفهم المحللون والمطورون البيانات دون الحاجة إلى سؤالي، وحتى أتمكن من صيانة كتالوج بيانات متوافق.",
    },
    exampleInput: ["VAT_Number", "Invoice_Date", "Net_Amount", "Payment_Status", "Buyer_Name", "Tax_Category"],
    prompt: "Generate comprehensive business definitions for all fields in the uploaded data. For each field include: business description, data type recommendation, expected format, valid values/constraints, business rules, and relationship to other fields. Format as a structured table.",
  },
  {
    id: 3,
    icon: CheckCircle,
    color: "#774896",
    bgColor: "#FAF5FF",
    category: "data-management",
    agentMode: "data-management",
    title: { en: "Full 4-Layer DQ Rules", ar: "قواعد جودة البيانات الكاملة (4 طبقات)" },
    description: { en: "Technical, logical, business, and cross-field data quality rules for every field", ar: "قواعد جودة البيانات التقنية والمنطقية والتجارية ومتعددة الحقول لكل حقل" },
    role: { en: "Data Quality Lead", ar: "مسؤول جودة البيانات" },
    userStory: {
      en: "As a Data Quality Lead, I want technical, logical, business, and cross-field rules for my table so that my ETL pipeline catches all data issues before they reach production systems.",
      ar: "بوصفي مسؤول جودة البيانات، أريد قواعد تقنية ومنطقية وتجارية ومتعددة الحقول لجدولي حتى يكتشف خط ETL الخاص بي جميع مشكلات البيانات قبل وصولها إلى أنظمة الإنتاج.",
    },
    exampleInput: ["Invoice_ID", "VAT_Amount", "Net_Total", "Invoice_Status", "Issue_Date", "Due_Date", "Seller_TRN", "Buyer_TRN"],
    prompt: "Generate full data quality rules for all fields in the uploaded data. Include all 4 layers: Layer 1 - Technical rules (null checks, data type, format, length), Layer 2 - Logical rules (range, uniqueness, referential integrity), Layer 3 - Business & cross-field rules (ZATCA/FATOORAH regulatory rules, conditional logic, SLA rules), Layer 4 - Business logic warnings (suspicious patterns, missing constraints).",
  },
  {
    id: 4,
    icon: Cpu,
    color: "#F57C00",
    bgColor: "#FFF8F0",
    category: "data-management",
    agentMode: "data-management",
    title: { en: "Informatica ETL Metadata", ar: "بيانات ETL لإنفورماتيكا" },
    description: { en: "Informatica Expression Language SQL, field descriptions, DQ rules, and SDAIA classifications", ar: "تعبيرات SQL لإنفورماتيكا، أوصاف الحقول، قواعد الجودة، وتصنيفات SDAIA" },
    role: { en: "Data Engineer", ar: "مهندس البيانات" },
    userStory: {
      en: "As a Data Engineer, I want Informatica Expression Language SQL for each field so that I can configure my Informatica mappings directly without manually writing transformation logic.",
      ar: "بوصفي مهندس بيانات، أريد تعبيرات SQL بلغة Informatica Expression لكل حقل حتى أتمكن من تكوين تعيينات Informatica مباشرةً دون كتابة منطق التحويل يدويًا.",
    },
    exampleInput: ["Customer_ID", "Invoice_Total", "Tax_Code", "Payment_Method", "Entry_Date", "Source_System"],
    prompt: "Generate an Informatica output for all fields in the uploaded data. Include field descriptions, data quality rules, Informatica Expression Language SQL statements, SDAIA data classifications (with rationale and handling rules), and format types. Return as the required JSON structure.",
  },
  {
    id: 5,
    icon: BookMarked,
    color: "#0094D3",
    bgColor: "#F0F9FF",
    category: "data-management",
    agentMode: "data-management",
    title: { en: "Build a Data Dictionary", ar: "إنشاء قاموس البيانات" },
    description: { en: "Combined classification + definitions + DQ rules exported as a complete data dictionary", ar: "تصنيف + تعريفات + قواعد جودة مدمجة في قاموس بيانات كامل قابل للتصدير" },
    role: { en: "Data Governance Manager", ar: "مدير حوكمة البيانات" },
    userStory: {
      en: "As a Data Governance Manager, I want a combined classification and definition export for all fields so that I can publish a formal, audit-ready data dictionary without manual consolidation.",
      ar: "بوصفي مدير حوكمة بيانات، أريد تصديرًا مدمجًا للتصنيف والتعريفات لجميع الحقول حتى أتمكن من نشر قاموس بيانات رسمي جاهز للتدقيق دون توحيد يدوي.",
    },
    exampleInput: ["National_ID", "Invoice_Ref", "Salary", "Bank_IBAN", "Employment_Date", "Department_Code"],
    prompt: "Create a complete data dictionary for all fields in the uploaded data. Include: business definition, SDAIA NDMO classification level, data type, valid values, DQ rules summary, PII flag, and data owner role for each field. Format as a comprehensive structured table.",
  },
  {
    id: 6,
    icon: ScanEye,
    color: "#C62828",
    bgColor: "#FFF5F5",
    category: "compliance",
    agentMode: "data-management",
    title: { en: "PII Scan (PDPL)", ar: "فحص البيانات الشخصية (نظام حماية البيانات)" },
    description: { en: "Detect personal and sensitive data columns mapped to PDPL articles with risk levels", ar: "اكتشاف أعمدة البيانات الشخصية والحساسة مع ربطها بمواد نظام PDPL ومستويات المخاطر" },
    role: { en: "Privacy Officer", ar: "مسؤول الخصوصية" },
    userStory: {
      en: "As a Privacy Officer, I want to know which columns contain personal data so that I can ensure PDPL compliance before sharing the dataset with any third party or storing it in a new system.",
      ar: "بوصفي مسؤول خصوصية، أريد معرفة الأعمدة التي تحتوي على بيانات شخصية حتى أضمن الامتثال لنظام PDPL قبل مشاركة مجموعة البيانات مع أي طرف ثالث أو تخزينها في نظام جديد.",
    },
    exampleInput: ["Full_Name", "National_ID", "Email", "Phone_Number", "Bank_IBAN", "Date_of_Birth", "Medical_Record", "Salary"],
    prompt: "Scan all fields in the uploaded data for PII and sensitive information. For each field identify: PII type, risk level (High/Medium/Low), PDPL article reference, legal basis for processing, recommended handling (encrypt/pseudonymize/restrict), and data retention guidance. Provide a scan summary with total fields and PII count.",
  },
  {
    id: 7,
    icon: Lock,
    color: "#E65100",
    bgColor: "#FFF8F0",
    category: "compliance",
    agentMode: "data-management",
    title: { en: "PDPL Data Sensitivity Audit", ar: "تدقيق حساسية البيانات (PDPL)" },
    description: { en: "Sensitivity levels, legal basis, and retention policies per Saudi PDPL for every field", ar: "مستويات الحساسية والأساس القانوني وسياسات الاحتفاظ وفق نظام PDPL السعودي لكل حقل" },
    role: { en: "Data Protection Officer", ar: "مسؤول حماية البيانات" },
    userStory: {
      en: "As a Data Protection Officer, I want a sensitivity classification for each field so that I know exactly which data requires explicit consent, anonymisation, or special handling under the Saudi PDPL regulation.",
      ar: "بوصفي مسؤول حماية البيانات، أريد تصنيف الحساسية لكل حقل حتى أعرف تحديدًا أي البيانات تستلزم موافقة صريحة أو إخفاء هوية أو معالجة خاصة وفق نظام PDPL السعودي.",
    },
    exampleInput: ["FullName", "Salary", "Medical_Condition", "Bank_IBAN", "Job_Title", "GPS_Location"],
    prompt: "Perform a PDPL data sensitivity audit for all fields in the uploaded data. For each field provide: sensitivity level (Very Sensitive / Sensitive / Non-sensitive), PDPL legal basis for processing, recommended retention period, anonymisation/encryption requirements, and consent requirements per Saudi PDPL articles.",
  },
  {
    id: 8,
    icon: Globe,
    color: "#0D2E5C",
    bgColor: "#F0F4FF",
    category: "compliance",
    agentMode: "data-management",
    title: { en: "Data Residency Classification", ar: "تصنيف إقامة البيانات" },
    description: { en: "Identify which fields require Saudi data residency and cannot be stored outside the Kingdom", ar: "تحديد الحقول التي تستلزم إقامة البيانات في المملكة ولا يمكن تخزينها خارجها" },
    role: { en: "Compliance Lead", ar: "مسؤول الامتثال" },
    userStory: {
      en: "As a Compliance Lead, I want to know which fields are subject to Saudi data residency rules so that I can ensure data stays within approved cloud regions and meets NDMO and SAMA requirements.",
      ar: "بوصفي مسؤول امتثال، أريد معرفة الحقول الخاضعة لقواعد إقامة البيانات السعودية حتى أضمن بقاء البيانات ضمن مناطق السحابة المعتمدة وتلبية متطلبات NDMO وساما.",
    },
    exampleInput: ["National_ID", "Invoice_Amount", "Bank_IBAN", "Customer_Address", "Transaction_Ref", "VAT_Return"],
    prompt: "Classify all fields in the uploaded data for Saudi data residency requirements. For each field indicate: whether Saudi residency is required (Yes/No), the applicable regulation (NDMO/SAMA/ZATCA), cloud eligibility, cross-border transfer restrictions, and recommended storage region.",
  },
  {
    id: 9,
    icon: Database,
    color: "#0094D3",
    bgColor: "#F0F9FF",
    category: "analytics",
    agentMode: "data-model",
    title: { en: "Design a Star Schema", ar: "تصميم نموذج النجمة (Star Schema)" },
    description: { en: "Generate fact + dimension tables, grain definition, and an interactive SVG diagram", ar: "إنشاء جداول الحقائق والأبعاد وتعريف الحبة ومخطط SVG تفاعلي" },
    role: { en: "BI Developer", ar: "مطور ذكاء الأعمال" },
    userStory: {
      en: "As a BI Developer, I want a star schema model from my flat data so that I can build an analytical layer in my data warehouse without spending days on manual dimensional modelling.",
      ar: "بوصفي مطور ذكاء أعمال، أريد نموذج مخطط نجمي من بياناتي المسطحة حتى أتمكن من بناء طبقة تحليلية في مستودع بياناتي دون قضاء أيام في النمذجة البعدية اليدوية.",
    },
    exampleInput: ["Sale_ID", "Customer_Name", "Product_Code", "Branch_City", "Sale_Date", "Net_Amount", "VAT_Amount", "Payment_Type"],
    prompt: "Design an analytical data model (star schema) for the uploaded data. Create fact and dimension tables with: grain definition, fact table measures, dimension table attributes, surrogate keys, foreign key relationships, and an SVG diagram. Also provide the full DDL SQL scripts for all tables.",
  },
  {
    id: 10,
    icon: Code2,
    color: "#374151",
    bgColor: "#F9FAFB",
    category: "analytics",
    agentMode: "data-model",
    title: { en: "Generate DDL SQL Scripts", ar: "إنشاء نصوص DDL SQL" },
    description: { en: "Ready-to-run CREATE TABLE scripts with PKs, FKs, and constraints for your data model", ar: "نصوص CREATE TABLE جاهزة للتشغيل مع المفاتيح الأولية والأجنبية والقيود لنموذج بياناتك" },
    role: { en: "Data Engineer", ar: "مهندس البيانات" },
    userStory: {
      en: "As a Data Engineer, I want ready-to-run SQL scripts for my analytical model so that I can deploy the schema directly to my database without manually writing DDL.",
      ar: "بوصفي مهندس بيانات، أريد نصوص SQL جاهزة للتشغيل لنموذجي التحليلي حتى أتمكن من نشر المخطط مباشرةً في قاعدة بياناتي دون كتابة DDL يدويًا.",
    },
    exampleInput: ["Fact_VAT_Returns", "Dim_Taxpayer", "Dim_Period", "Dim_Filing_Type", "Dim_Region"],
    prompt: "Generate complete DDL SQL scripts for an analytical data model based on the uploaded data. Include CREATE TABLE statements for all fact and dimension tables with primary keys, foreign keys, NOT NULL constraints, data type recommendations, and index suggestions for query performance.",
  },
  {
    id: 11,
    icon: GitBranch,
    color: "#2E7D32",
    bgColor: "#F0FDF4",
    category: "analytics",
    agentMode: "data-model",
    title: { en: "Map Table Relationships", ar: "رسم علاقات الجداول" },
    description: { en: "Identify all FK relationships with cardinality between fact and dimension tables", ar: "تحديد جميع علاقات المفاتيح الأجنبية مع صحة العلاقة بين جداول الحقائق والأبعاد" },
    role: { en: "Data Architect", ar: "مهندس بنية البيانات" },
    userStory: {
      en: "As a Data Architect, I want to see all relationships between tables with cardinality so that I can validate my entity-relationship design and document the data model for the governance team.",
      ar: "بوصفي مهندس بنية بيانات، أريد رؤية جميع العلاقات بين الجداول مع نسبة الأعداد حتى أتمكن من التحقق من تصميم العلاقات وتوثيق نموذج البيانات لفريق الحوكمة.",
    },
    exampleInput: ["Orders", "Customers", "Products", "Branches", "Dates", "Payments"],
    prompt: "Analyze the uploaded data and map all table relationships. For each relationship identify: source table and column, target table and column, cardinality (One-to-One / One-to-Many / Many-to-Many), relationship type (FK/lookup/derived), and join conditions. Present as both a relationship matrix and a list.",
  },
  {
    id: 12,
    icon: BarChart3,
    color: "#1A4B8C",
    bgColor: "#EFF6FF",
    category: "insights",
    agentMode: "insights",
    title: { en: "Full Data Insights Report", ar: "تقرير رؤى البيانات الكامل" },
    description: { en: "Executive-ready report: trends, anomalies, column stats, and actionable recommendations", ar: "تقرير جاهز للإدارة: الاتجاهات والشذوذات وإحصاءات الأعمدة والتوصيات القابلة للتنفيذ" },
    role: { en: "Data Analyst", ar: "محلل البيانات" },
    userStory: {
      en: "As a Data Analyst, I want a comprehensive insights report from my dataset so that I can present findings to management without spending days on manual analysis and visualisation.",
      ar: "بوصفي محلل بيانات، أريد تقرير رؤى شاملًا من مجموعة بياناتي حتى أتمكن من تقديم النتائج للإدارة دون قضاء أيام في التحليل والتصور اليدوي.",
    },
    exampleInput: ["Monthly VAT Returns — 500 rows, 10 columns", "Period: Q1–Q3 2024", "Fields: Region, Sector, Filing_Amount, Status, Date"],
    prompt: "Generate a comprehensive data insights report for the uploaded dataset. Include: executive summary, dataset overview (rows, columns, completeness), key insights (minimum 5), statistical analysis per column, anomaly detection, trend analysis, and actionable recommendations. Format as a structured report.",
  },
  {
    id: 13,
    icon: AlertTriangle,
    color: "#B45309",
    bgColor: "#FFFBEB",
    category: "insights",
    agentMode: "insights",
    title: { en: "Anomaly & Outlier Detection", ar: "اكتشاف الشذوذات والقيم المتطرفة" },
    description: { en: "Surface suspicious values, duplicate patterns, and data integrity issues in your dataset", ar: "كشف القيم المشبوهة وأنماط التكرار ومشكلات تكامل البيانات في مجموعة بياناتك" },
    role: { en: "Data Auditor", ar: "مدقق البيانات" },
    userStory: {
      en: "As a Data Auditor, I want all suspicious values and patterns flagged so that I can prioritise my data quality investigations and focus remediation effort on the highest-risk records.",
      ar: "بوصفي مدقق بيانات، أريد الإبلاغ عن جميع القيم والأنماط المشبوهة حتى أتمكن من تحديد أولويات تحقيقات جودة البيانات وتركيز جهود المعالجة على السجلات الأكثر خطورة.",
    },
    exampleInput: ["Transaction dataset", "Fields: Invoice_ID, Amount, Date, Status, Seller_TRN"],
    prompt: "Analyze the uploaded data for anomalies, outliers, and data integrity issues. Identify: duplicate records, impossible values (negatives, future dates, zeros where not expected), statistical outliers (IQR method), inconsistent formats, referential integrity violations, and suspicious patterns. Quantify each anomaly type and flag affected records.",
  },
  {
    id: 14,
    icon: FileText,
    color: "#2563EB",
    bgColor: "#EFF6FF",
    category: "insights",
    agentMode: "insights",
    title: { en: "Executive Data Summary", ar: "ملخص البيانات التنفيذي" },
    description: { en: "Compress a full dataset into key findings and business-ready talking points", ar: "ضغط مجموعة بيانات كاملة في نتائج رئيسية ونقاط نقاش جاهزة للأعمال" },
    role: { en: "Manager", ar: "المدير" },
    userStory: {
      en: "As a Manager, I want my dataset summarised into key talking points so that I can report to leadership in minutes without reading raw data or building dashboards manually.",
      ar: "بوصفي مديرًا، أريد تلخيص مجموعة بياناتي في نقاط رئيسية حتى أتمكن من إعداد التقارير للقيادة في دقائق دون قراءة البيانات الخام أو إنشاء لوحات معلومات يدويًا.",
    },
    exampleInput: ["Quarterly Zakat filing data — 300 rows", "Fields: Entity, Sector, Amount, Quarter, Status"],
    prompt: "Summarize the uploaded dataset into an executive briefing. Include: dataset headline metrics, top 3-5 key findings, notable trends or changes, risk flags or concerns, and 3 actionable recommendations. Format for a non-technical executive audience. Keep it concise and impactful.",
  },
];

const NUDGE_USE_CASES: UseCase[] = [
  {
    id: 15,
    icon: Bell,
    color: "#7C3AED",
    bgColor: "#F5F3FF",
    category: "nudge",
    agentMode: "nudge",
    title: { en: "Late VAT Filers", ar: "متأخرو تقديم ضريبة القيمة المضافة" },
    description: { en: "Diagnose and nudge SMEs consistently filing VAT returns late every quarter", ar: "تشخيص ونج المنشآت الصغيرة والمتوسطة التي تتأخر في تقديم إقرارات ضريبة القيمة المضافة" },
    role: { en: "Compliance Officer", ar: "مسؤول الامتثال" },
    userStory: {
      en: "As a Compliance Officer, I want to understand why SMEs consistently file VAT returns late so that I can design targeted behavioural nudges to improve filing rates before penalties are issued.",
      ar: "بوصفي مسؤول امتثال، أريد فهم سبب تأخر المنشآت الصغيرة والمتوسطة في تقديم إقرارات ضريبة القيمة المضافة حتى أتمكن من تصميم تدخلات سلوكية مستهدفة لتحسين معدلات التقديم.",
    },
    exampleInput: ["SMEs filing VAT returns late every quarter"],
    prompt: "SMEs filing VAT returns late every quarter",
  },
  {
    id: 16,
    icon: Users,
    color: "#0891B2",
    bgColor: "#ECFEFF",
    category: "nudge",
    agentMode: "nudge",
    title: { en: "Zakat Non-Payers", ar: "غير مسددي الزكاة" },
    description: { en: "Segment and design interventions for family businesses not paying Zakat on time", ar: "تقسيم وتصميم تدخلات لشركات العائلة التي لا تسدد الزكاة في الوقت المحدد" },
    role: { en: "Tax Analyst", ar: "محلل ضريبي" },
    userStory: {
      en: "As a Tax Analyst, I want a behavioural profile of family businesses that miss Zakat deadlines so that I can recommend the most effective channels and messages to increase compliance.",
      ar: "بوصفي محللًا ضريبيًا، أريد ملفًا سلوكيًا لشركات العائلة التي تفوّت مواعيد الزكاة حتى أتمكن من التوصية بأكثر القنوات والرسائل فعالية لزيادة الامتثال.",
    },
    exampleInput: ["Family businesses not paying Zakat on time"],
    prompt: "Family businesses not paying Zakat on time",
  },
  {
    id: 17,
    icon: TrendingUp,
    color: "#059669",
    bgColor: "#ECFDF5",
    category: "nudge",
    agentMode: "nudge",
    title: { en: "Income Underreporters", ar: "من يُقرّون بدخل أقل من الحقيقي" },
    description: { en: "Map behavioral levers for freelancers underreporting income to ZATCA", ar: "رسم خريطة الرافعات السلوكية للمستقلين الذين يُقرّون بدخل أقل" },
    role: { en: "Risk Manager", ar: "مدير المخاطر" },
    userStory: {
      en: "As a Risk Manager, I want to identify the psychological drivers behind freelancer income underreporting so that I can design low-friction compliance pathways that feel easy rather than punitive.",
      ar: "بوصفي مدير مخاطر، أريد تحديد الدوافع النفسية وراء إقرار المستقلين بدخل أقل من الحقيقي حتى أتمكن من تصميم مسارات امتثال سهلة بدلاً من العقابية.",
    },
    exampleInput: ["Freelancers underreporting income"],
    prompt: "Freelancers underreporting income",
  },
  {
    id: 18,
    icon: Target,
    color: "#DC2626",
    bgColor: "#FEF2F2",
    category: "nudge",
    agentMode: "nudge",
    title: { en: "Reminder-Ignorers", ar: "متجاهلو رسائل التذكير" },
    description: { en: "Design effective nudges for retail businesses ignoring ZATCA reminder notices", ar: "تصميم تدخلات فعّالة للشركات التجارية التي تتجاهل رسائل تذكير ZATCA" },
    role: { en: "Communications Lead", ar: "مسؤول الاتصالات" },
    userStory: {
      en: "As a Communications Lead, I want to understand why retail businesses consistently ignore our reminder notices so that I can redesign communication timing, channels, and message framing to break through.",
      ar: "بوصفي مسؤول اتصالات، أريد فهم سبب تجاهل الشركات التجارية لرسائل التذكير حتى أتمكن من إعادة تصميم توقيت الاتصال وقنواته وأسلوب الرسائل.",
    },
    exampleInput: ["Retail businesses ignoring reminder notices"],
    prompt: "Retail businesses ignoring reminder notices",
  },
];

const CATEGORY_LABELS: Record<Category, Record<Lang, string>> = {
  all: { en: "All Use Cases", ar: "جميع حالات الاستخدام" },
  "data-management": { en: "Data Management", ar: "إدارة البيانات" },
  compliance: { en: "Compliance & Privacy", ar: "الامتثال والخصوصية" },
  analytics: { en: "Analytics", ar: "التحليلات" },
  insights: { en: "Insights", ar: "الرؤى" },
  nudge: { en: "Nudge Agent", ar: "وكيل التحفيز" },
};

const CATEGORY_COLORS: Record<Exclude<Category, "all">, string> = {
  "data-management": "#0094D3",
  compliance: "#C62828",
  analytics: "#2E7D32",
  insights: "#1A4B8C",
  nudge: "#7C3AED",
};

function OutputPreview({ id, isRtl }: { id: number; isRtl: boolean }) {
  const cell = "px-3 py-2 text-[11px] border-b border-gray-100";
  const hdr = "px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wide bg-gray-50 border-b border-gray-200";
  const badge = (color: string, bg: string, text: string) => (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ color, backgroundColor: bg }}>{text}</span>
  );

  if (id === 1) return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full text-left">
        <thead><tr><th className={hdr}>Field</th><th className={hdr}>Classification</th><th className={hdr}>Sensitivity</th></tr></thead>
        <tbody>
          <tr><td className={cell + " font-mono text-gray-700"}>TaxpayerID</td><td className={cell}>{badge("#92400E","#FEF3C7","Confidential")}</td><td className={cell}>{badge("#991B1B","#FEE2E2","High")}</td></tr>
          <tr className="bg-gray-50"><td className={cell + " font-mono text-gray-700"}>InvoiceAmount</td><td className={cell}>{badge("#1E40AF","#DBEAFE","Restricted")}</td><td className={cell}>{badge("#92400E","#FEF3C7","Medium")}</td></tr>
          <tr><td className={cell + " font-mono text-gray-700"}>CompanyName</td><td className={cell}>{badge("#065F46","#D1FAE5","Public")}</td><td className={cell}>{badge("#374151","#F3F4F6","Low")}</td></tr>
          <tr className="bg-gray-50"><td className={cell + " font-mono text-gray-700"}>EmailAddress</td><td className={cell}>{badge("#92400E","#FEF3C7","Confidential")}</td><td className={cell}>{badge("#991B1B","#FEE2E2","High")}</td></tr>
        </tbody>
      </table>
    </div>
  );

  if (id === 2) return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full text-left">
        <thead><tr><th className={hdr}>Field</th><th className={hdr}>Business Definition</th><th className={hdr}>Data Type</th></tr></thead>
        <tbody>
          <tr><td className={cell + " font-mono text-gray-700"}>VAT_Number</td><td className={cell + " max-w-[180px]"} style={{maxWidth:180}}><span className="text-gray-700">Unique 15-digit ZATCA identifier starting and ending with '3'</span></td><td className={cell}><span className="font-mono text-purple-700">VARCHAR(15)</span></td></tr>
          <tr className="bg-gray-50"><td className={cell + " font-mono text-gray-700"}>Invoice_Date</td><td className={cell}><span className="text-gray-700">Date the tax invoice was issued per FATOORAH</span></td><td className={cell}><span className="font-mono text-purple-700">DATE</span></td></tr>
          <tr><td className={cell + " font-mono text-gray-700"}>Net_Amount</td><td className={cell}><span className="text-gray-700">Invoice value before VAT in SAR, must be &gt; 0</span></td><td className={cell}><span className="font-mono text-purple-700">DECIMAL(18,2)</span></td></tr>
        </tbody>
      </table>
    </div>
  );

  if (id === 3) return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-2">
        {[["Technical","18","#1E40AF","#DBEAFE"],["Logical","12","#5B21B6","#EDE9FE"],["Business","11","#065F46","#D1FAE5"],["Cross-field","6","#92400E","#FEF3C7"]].map(([label,count,color,bg])=>(
          <div key={label} className="rounded-lg p-2.5 text-center" style={{backgroundColor:bg}}>
            <div className="text-lg font-bold" style={{color}}>{count}</div>
            <div className="text-[10px] font-medium text-gray-600">{label}</div>
          </div>
        ))}
      </div>
      <div className="space-y-1.5">
        <div className="flex gap-2 items-start text-[11px]"><span className="px-1.5 py-0.5 rounded text-[9px] font-bold text-blue-800 bg-blue-100 flex-shrink-0">Technical</span><span className="text-gray-700">VAT_Number must match pattern <code className="bg-gray-100 px-1 rounded">^3[0-9]{"{13}"}3$</code></span></div>
        <div className="flex gap-2 items-start text-[11px]"><span className="px-1.5 py-0.5 rounded text-[9px] font-bold text-green-800 bg-green-100 flex-shrink-0">Business</span><span className="text-gray-700">Invoice_Total = Net_Amount + (Net_Amount × 0.15)</span></div>
        <div className="flex gap-2 items-start text-[11px]"><span className="px-1.5 py-0.5 rounded text-[9px] font-bold text-orange-800 bg-orange-100 flex-shrink-0">Cross-field</span><span className="text-gray-700">Issue_Date must be before or equal to Due_Date</span></div>
      </div>
    </div>
  );

  if (id === 4) return (
    <div className="rounded-lg overflow-hidden border border-gray-700">
      <div className="px-3 py-1.5 flex items-center gap-1.5" style={{backgroundColor:"#1E2029"}}>
        <div className="w-2.5 h-2.5 rounded-full bg-red-500" /><div className="w-2.5 h-2.5 rounded-full bg-yellow-500" /><div className="w-2.5 h-2.5 rounded-full bg-green-500" />
        <span className="text-[10px] text-gray-400 ml-1">informatica_output.json</span>
      </div>
      <pre className="text-[10px] p-3 overflow-x-auto" style={{backgroundColor:"#282C34",color:"#ABB2BF"}}>
{`{
  `}<span style={{color:"#E06C75"}}>"Customer_ID"</span>{`: {
    `}<span style={{color:"#E06C75"}}>"description"</span>{`: `}<span style={{color:"#98C379"}}>"ZATCA taxpayer ID"</span>{`,
    `}<span style={{color:"#E06C75"}}>"format_type"</span>{`: `}<span style={{color:"#98C379"}}>"VARCHAR(15)"</span>{`,
    `}<span style={{color:"#E06C75"}}>"classification_level"</span>{`: `}<span style={{color:"#98C379"}}>"Confidential"</span>{`,
    `}<span style={{color:"#E06C75"}}>"informatica_sql"</span>{`: [
      `}<span style={{color:"#98C379"}}>"IIF(ISNULL(IN.Customer_ID),'MISSING',IN.Customer_ID)"</span>{`
    ]
  }
}`}
      </pre>
    </div>
  );

  if (id === 5) return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full text-left">
        <thead><tr><th className={hdr}>Field</th><th className={hdr}>NDMO Level</th><th className={hdr}>DQ Rules</th><th className={hdr}>PII</th></tr></thead>
        <tbody>
          <tr><td className={cell + " font-mono text-gray-700"}>National_ID</td><td className={cell}>{badge("#92400E","#FEF3C7","Confidential")}</td><td className={cell}><span className="font-semibold text-gray-700">4</span></td><td className={cell}>{badge("#065F46","#D1FAE5","✓ Yes")}</td></tr>
          <tr className="bg-gray-50"><td className={cell + " font-mono text-gray-700"}>Invoice_Ref</td><td className={cell}>{badge("#1E40AF","#DBEAFE","Restricted")}</td><td className={cell}><span className="font-semibold text-gray-700">3</span></td><td className={cell}>{badge("#374151","#F3F4F6","✗ No")}</td></tr>
          <tr><td className={cell + " font-mono text-gray-700"}>Salary</td><td className={cell}>{badge("#991B1B","#FEE2E2","Secret")}</td><td className={cell}><span className="font-semibold text-gray-700">5</span></td><td className={cell}>{badge("#065F46","#D1FAE5","✓ Yes")}</td></tr>
        </tbody>
      </table>
      <div className="px-3 py-2 bg-blue-50 border-t border-blue-100 text-[11px] text-blue-700 font-medium">15 fields exported to result.xlsx</div>
    </div>
  );

  if (id === 6) return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-2">
        {[["12 Fields","Scanned","#374151","#F3F4F6"],["5 PII","Detected","#991B1B","#FEE2E2"],["2 High","Risk","#B91C1C","#FEE2E2"],["Art. 4,6","PDPL","#1E40AF","#DBEAFE"]].map(([top,bot,color,bg])=>(
          <div key={top} className="rounded-lg p-2 text-center" style={{backgroundColor:bg}}>
            <div className="text-[13px] font-bold" style={{color}}>{top}</div>
            <div className="text-[10px] text-gray-500">{bot}</div>
          </div>
        ))}
      </div>
      <div className="space-y-1.5">
        <div className="flex gap-2 items-center text-[11px] p-2 rounded-lg bg-red-50 border border-red-100"><span className="text-red-500">🔴</span><span className="font-mono text-gray-700">National_ID</span><span className="text-gray-500">— High Risk · PDPL Art. 4 · Requires consent</span></div>
        <div className="flex gap-2 items-center text-[11px] p-2 rounded-lg bg-orange-50 border border-orange-100"><span className="text-orange-500">🟠</span><span className="font-mono text-gray-700">Email</span><span className="text-gray-500">— Medium · PDPL Art. 6 · Pseudonymize</span></div>
        <div className="flex gap-2 items-center text-[11px] p-2 rounded-lg bg-orange-50 border border-orange-100"><span className="text-orange-500">🟠</span><span className="font-mono text-gray-700">Phone_Number</span><span className="text-gray-500">— Medium · PDPL Art. 6 · Restrict access</span></div>
      </div>
    </div>
  );

  if (id === 7) return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full text-left">
        <thead><tr><th className={hdr}>Field</th><th className={hdr}>Sensitivity</th><th className={hdr}>Legal Basis</th><th className={hdr}>Retention</th></tr></thead>
        <tbody>
          <tr><td className={cell + " font-mono text-gray-700"}>Salary</td><td className={cell}>{badge("#92400E","#FEF3C7","Sensitive")}</td><td className={cell + " text-gray-600"}>Employment contract</td><td className={cell + " text-gray-600"}>5 yrs</td></tr>
          <tr className="bg-gray-50"><td className={cell + " font-mono text-gray-700"}>Medical_Condition</td><td className={cell}>{badge("#991B1B","#FEE2E2","Very Sensitive")}</td><td className={cell + " text-gray-600"}>Explicit consent</td><td className={cell + " text-gray-600"}>10 yrs</td></tr>
          <tr><td className={cell + " font-mono text-gray-700"}>Job_Title</td><td className={cell}>{badge("#374151","#F3F4F6","Non-sensitive")}</td><td className={cell + " text-gray-600"}>Legitimate interest</td><td className={cell + " text-gray-600"}>3 yrs</td></tr>
        </tbody>
      </table>
    </div>
  );

  if (id === 8) return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full text-left">
        <thead><tr><th className={hdr}>Field</th><th className={hdr}>KSA Residency</th><th className={hdr}>Regulation</th><th className={hdr}>Cloud OK</th></tr></thead>
        <tbody>
          <tr><td className={cell + " font-mono text-gray-700"}>National_ID</td><td className={cell}>{badge("#065F46","#D1FAE5","✓ Required")}</td><td className={cell + " text-gray-600"}>NDMO Residency</td><td className={cell}>{badge("#991B1B","#FEE2E2","✗ No")}</td></tr>
          <tr className="bg-gray-50"><td className={cell + " font-mono text-gray-700"}>Invoice_Amount</td><td className={cell}>{badge("#374151","#F3F4F6","Not required")}</td><td className={cell + " text-gray-600"}>—</td><td className={cell}>{badge("#065F46","#D1FAE5","✓ Yes")}</td></tr>
          <tr><td className={cell + " font-mono text-gray-700"}>Bank_IBAN</td><td className={cell}>{badge("#065F46","#D1FAE5","✓ Required")}</td><td className={cell + " text-gray-600"}>SAMA Circular</td><td className={cell}>{badge("#991B1B","#FEE2E2","✗ No")}</td></tr>
        </tbody>
      </table>
    </div>
  );

  if (id === 9) return (
    <div className="space-y-2">
      <div className="relative flex flex-col items-center gap-2">
        <div className="flex gap-4">
          {["Dim_Customer","Dim_Product"].map(d=>(
            <div key={d} className="px-3 py-2 rounded-lg border-2 text-[11px] font-semibold text-blue-700 bg-blue-50" style={{borderColor:"#93C5FD"}}>{d}</div>
          ))}
        </div>
        <div className="px-5 py-2.5 rounded-lg border-2 text-[12px] font-bold text-white" style={{backgroundColor:"#0094D3",borderColor:"#0369A1"}}>
          ⭐ Fact_Sales
          <div className="text-[9px] font-normal text-blue-100 mt-0.5">Revenue · Qty · VAT · Discount</div>
        </div>
        <div className="flex gap-4">
          {["Dim_Branch","Dim_Date"].map(d=>(
            <div key={d} className="px-3 py-2 rounded-lg border-2 text-[11px] font-semibold text-blue-700 bg-blue-50" style={{borderColor:"#93C5FD"}}>{d}</div>
          ))}
        </div>
      </div>
      <div className="text-center text-[10px] text-gray-500">1 fact table · 4 dimension tables · 4 relationships</div>
    </div>
  );

  if (id === 10) return (
    <div className="rounded-lg overflow-hidden border border-gray-700">
      <div className="px-3 py-1.5 flex items-center gap-1.5" style={{backgroundColor:"#1E2029"}}>
        <div className="w-2.5 h-2.5 rounded-full bg-red-500" /><div className="w-2.5 h-2.5 rounded-full bg-yellow-500" /><div className="w-2.5 h-2.5 rounded-full bg-green-500" />
        <span className="text-[10px] text-gray-400 ml-1">create_tables.sql</span>
      </div>
      <pre className="text-[10px] p-3 overflow-x-auto leading-relaxed" style={{backgroundColor:"#282C34",color:"#ABB2BF"}}>
<span style={{color:"#C678DD"}}>CREATE TABLE</span>{` `}<span style={{color:"#E5C07B"}}>Fact_Sales</span>{` (`}
{`  sale_id      `}<span style={{color:"#C678DD"}}>BIGINT</span>{` `}<span style={{color:"#56B6C2"}}>PRIMARY KEY</span>,
{`  customer_key `}<span style={{color:"#C678DD"}}>INT</span>{` `}<span style={{color:"#56B6C2"}}>REFERENCES</span>{` Dim_Customer,`}
{`  net_amount   `}<span style={{color:"#C678DD"}}>DECIMAL</span>{`(18,2) `}<span style={{color:"#56B6C2"}}>NOT NULL</span>,
{`  vat_amount   `}<span style={{color:"#C678DD"}}>DECIMAL</span>{`(18,2) `}<span style={{color:"#56B6C2"}}>NOT NULL</span>
{`);`}
      </pre>
    </div>
  );

  if (id === 11) return (
    <div className="space-y-2">
      {[
        ["Fact_Sales.customer_key","Dim_Customer.customer_key","Many-to-One"],
        ["Fact_Sales.product_key","Dim_Product.product_key","Many-to-One"],
        ["Fact_Sales.branch_key","Dim_Branch.branch_key","Many-to-One"],
        ["Fact_Sales.date_key","Dim_Date.date_key","Many-to-One"],
      ].map(([src,tgt,card])=>(
        <div key={src} className="flex items-center gap-2 text-[11px] p-2 rounded-lg bg-green-50 border border-green-100">
          <span className="font-mono text-gray-600 flex-shrink-0">{src}</span>
          <span className="text-green-600 font-bold flex-shrink-0">→</span>
          <span className="font-mono text-gray-600 flex-shrink-0">{tgt}</span>
          <span className="ml-auto flex-shrink-0">{badge("#065F46","#D1FAE5",card)}</span>
        </div>
      ))}
      <div className="text-[10px] text-gray-500 text-center">4 relationships · 1 fact table · 4 dimension tables</div>
    </div>
  );

  if (id === 12) return (
    <div className="space-y-3">
      <div className="grid grid-cols-5 gap-1.5">
        {[["500","Rows"],["10","Columns"],["8","Insights"],["3","Anomalies"],["5","Actions"]].map(([n,l])=>(
          <div key={l} className="rounded-lg p-2 text-center bg-blue-50 border border-blue-100">
            <div className="text-[14px] font-bold text-blue-700">{n}</div>
            <div className="text-[9px] text-blue-500">{l}</div>
          </div>
        ))}
      </div>
      <div className="space-y-1.5">
        <div className="flex gap-2 items-start text-[11px]"><span className="flex-shrink-0">📈</span><span className="text-gray-700">VAT collections <strong>+23%</strong> in Q3 vs Q2</span></div>
        <div className="flex gap-2 items-start text-[11px]"><span className="flex-shrink-0">⚠️</span><span className="text-gray-700"><strong>47 invoices</strong> with mismatched VAT calculations</span></div>
        <div className="flex gap-2 items-start text-[11px]"><span className="flex-shrink-0">💡</span><span className="text-gray-700">Riyadh region contributes <strong>38%</strong> of total revenue</span></div>
      </div>
    </div>
  );

  if (id === 13) return (
    <div className="space-y-2">
      <div className="p-2.5 rounded-lg border border-red-200 bg-red-50 flex items-start gap-2.5">
        <span className="text-red-500 flex-shrink-0 text-sm">🔴</span>
        <div><div className="text-[11px] font-semibold text-red-700">Duplicate Invoice IDs</div><div className="text-[10px] text-red-600">12 duplicate values found in Invoice_Ref column</div></div>
      </div>
      <div className="p-2.5 rounded-lg border border-orange-200 bg-orange-50 flex items-start gap-2.5">
        <span className="text-orange-500 flex-shrink-0 text-sm">🟠</span>
        <div><div className="text-[11px] font-semibold text-orange-700">Zero-Amount Transactions</div><div className="text-[10px] text-orange-600">8 rows with Net_Amount = 0.00 — verify intent</div></div>
      </div>
      <div className="p-2.5 rounded-lg border border-orange-200 bg-orange-50 flex items-start gap-2.5">
        <span className="text-orange-500 flex-shrink-0 text-sm">🟠</span>
        <div><div className="text-[11px] font-semibold text-orange-700">Future-Dated Entries</div><div className="text-[10px] text-orange-600">3 invoice dates are beyond today's date</div></div>
      </div>
      <div className="text-center text-[10px] font-medium text-gray-500">3 anomaly types · 23 affected records</div>
    </div>
  );

  if (id === 14) return (
    <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 space-y-2">
      <div className="flex items-center gap-2 text-[11px] font-semibold text-blue-700 border-b border-blue-200 pb-2">
        <span>📊</span><span>Quarterly Zakat Filing — 300 records, 8 fields</span>
      </div>
      <ul className="space-y-1.5">
        <li className="flex gap-2 text-[11px] text-gray-700"><span className="text-blue-500 flex-shrink-0">•</span>Total Zakat collected: <strong>SAR 4.2M</strong> (↑ 18% vs prior quarter)</li>
        <li className="flex gap-2 text-[11px] text-gray-700"><span className="text-blue-500 flex-shrink-0">•</span><strong>94%</strong> of filings submitted on time</li>
        <li className="flex gap-2 text-[11px] text-gray-700"><span className="text-blue-500 flex-shrink-0">•</span>Top sectors: Manufacturing, Retail, Real Estate</li>
        <li className="flex gap-2 text-[11px] text-red-600"><span className="flex-shrink-0">⚠️</span><strong>6 filings</strong> flagged for review — missing attachments</li>
      </ul>
    </div>
  );

  if (id >= 15 && id <= 18) return (
    <div className="space-y-3">
      <div className="rounded-xl p-3 grid grid-cols-3 gap-2" style={{ backgroundColor: "#0D2E5C" }}>
        {[["Root Cause","Process complexity"],["Segments","3"],["Levers","4"]].map(([l,v]) => (
          <div key={l} className="text-center">
            <div className="text-white font-bold text-sm">{v}</div>
            <div className="text-white/60 text-[10px]">{l}</div>
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
        <div className="text-[10px] font-bold text-yellow-700 uppercase tracking-wider mb-1.5">Nudge Message (example)</div>
        <div className="text-[11px] text-gray-700 italic">"94% of businesses in your sector filed on time last quarter. File now in under 5 minutes — your deadline is in 3 days."</div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg p-2.5 bg-green-50 border border-green-100">
          <div className="text-[10px] font-bold text-green-600 mb-1">Quick Wins</div>
          <div className="text-[11px] text-gray-700">• Deadline reminders via WhatsApp<br/>• Social norms messaging</div>
        </div>
        <div className="rounded-lg p-2.5 bg-blue-50 border border-blue-100">
          <div className="text-[10px] font-bold text-blue-600 mb-1">Est. Compliance Lift</div>
          <div className="text-2xl font-bold text-blue-700">+18%</div>
        </div>
      </div>
      <div className="text-center text-[10px] font-medium px-3 py-2 rounded-lg bg-purple-50 border border-purple-100 text-purple-700">
        Outputs to <span className="font-mono">nudge_report_[timestamp].xlsx</span>
      </div>
    </div>
  );

  return null;
}

const ALL_USE_CASES = [...USE_CASES, ...NUDGE_USE_CASES];

export default function UseCasesPage() {
  const [lang, setLang] = useState<Lang>("en");
  const [activeCategory, setActiveCategory] = useState<Category>("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [, navigate] = useLocation();

  const isRtl = lang === "ar";
  const selectedCase = ALL_USE_CASES.find(u => u.id === selectedId) ?? null;

  const filtered = activeCategory === "all"
    ? ALL_USE_CASES
    : ALL_USE_CASES.filter(u => u.category === activeCategory);

  const handleLaunch = (uc: UseCase) => {
    if (uc.agentMode === "nudge") {
      const params = new URLSearchParams({ scenario: uc.prompt });
      navigate(`/nudge?${params.toString()}`);
    } else {
      const params = new URLSearchParams({ prompt: uc.prompt, mode: uc.agentMode });
      navigate(`/?${params.toString()}`);
    }
  };

  const CATEGORIES: Category[] = ["all", "data-management", "compliance", "analytics", "insights", "nudge"];

  return (
    <div className="min-h-screen bg-gray-50 font-main" dir={isRtl ? "rtl" : "ltr"}>
      {/* Header */}
      <div style={{ backgroundColor: "#0D2E5C" }} className="sticky top-0 z-30 shadow-md">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 text-white/70 hover:text-white transition-colors text-sm"
              data-testid="link-back-to-agent"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{isRtl ? "العودة إلى الوكيل" : "Back to Agent"}</span>
            </button>
            <div className="w-px h-5 bg-white/20" />
            <div className="flex items-center gap-2">
              <LayoutGrid className="w-4 h-4 text-white/70" />
              <span className="text-white font-semibold text-sm">{isRtl ? "حالات الاستخدام" : "Use Cases"}</span>
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

      {/* Hero */}
      <div style={{ background: "linear-gradient(135deg, #0D2E5C 0%, #1A4B8C 50%, #0094D3 100%)" }} className="py-16 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium mb-6" style={{ backgroundColor: "rgba(255,255,255,0.15)", color: "#fff" }}>
            <span>✦</span>
            <span>{isRtl ? "مدعوم بالذكاء الاصطناعي · مبني لمتطلبات المملكة العربية السعودية" : "AI-Powered · Built for Saudi Regulatory Standards"}</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
            {isRtl ? "ماذا يمكن لوكيل البيانات والتحليلات أن يفعل؟" : "What can the Data & Analytics Agent do?"}
          </h1>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto mb-8">
            {isRtl
              ? "استكشف حالات الاستخدام الحقيقية — من تصنيف البيانات إلى اكتشاف البيانات الشخصية إلى نماذج البيانات التحليلية."
              : "Explore real tasks — from data classification and PII detection to analytical models and executive insights."}
          </p>
          <div className="flex flex-wrap justify-center gap-3 text-sm text-white/80">
            {["SDAIA NDMO", "PDPL", "FATOORAH", "ZATCA VAT / Zakat", "Star Schema", "Informatica"].map(tag => (
              <span key={tag} className="px-3 py-1 rounded-full border border-white/20 bg-white/10">{tag}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="sticky top-[52px] z-20 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center gap-1 overflow-x-auto py-1 hide-scrollbar">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex-shrink-0 px-4 py-2.5 text-sm font-medium rounded-md transition-all ${activeCategory === cat ? "text-white" : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"}`}
                style={activeCategory === cat ? { backgroundColor: cat === "all" ? "#0D2E5C" : CATEGORY_COLORS[cat as Exclude<Category,"all">] } : {}}
                data-testid={`filter-tab-${cat}`}
              >
                {CATEGORY_LABELS[cat][lang]}
                <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${activeCategory === cat ? "bg-white/25 text-white" : "bg-gray-100 text-gray-500"}`}>
                  {cat === "all" ? ALL_USE_CASES.length : ALL_USE_CASES.filter(u => u.category === cat).length}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filtered.map(uc => {
            const Icon = uc.icon;
            const catColor = CATEGORY_COLORS[uc.category];
            return (
              <button
                key={uc.id}
                onClick={() => setSelectedId(uc.id)}
                className="group text-left w-full rounded-xl border border-gray-200 bg-white hover:border-gray-300 hover:shadow-md transition-all duration-200 overflow-hidden"
                data-testid={`card-usecase-${uc.id}`}
              >
                <div className="h-1 w-full" style={{ backgroundColor: uc.color }} />
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: uc.bgColor }}>
                      <Icon className="w-5 h-5" style={{ color: uc.color }} />
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-1 rounded-full" style={{ backgroundColor: catColor + "18", color: catColor }}>
                      {CATEGORY_LABELS[uc.category][lang]}
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-1.5 text-[15px] leading-snug group-hover:text-blue-700 transition-colors">
                    {uc.title[lang]}
                  </h3>
                  <p className="text-sm text-gray-500 leading-relaxed mb-4">
                    {uc.description[lang]}
                  </p>
                  <div className="flex items-center text-sm font-medium transition-colors" style={{ color: uc.color }}>
                    <span>{isRtl ? "عرض التفاصيل" : "View details"}</span>
                    <ChevronRight className={`w-4 h-4 ml-1 group-hover:translate-x-0.5 transition-transform ${isRtl ? "rotate-180" : ""}`} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer CTA */}
      <div className="border-t border-gray-200 bg-white py-12 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            {isRtl ? "هل أنت مستعد للبدء؟" : "Ready to get started?"}
          </h2>
          <p className="text-gray-500 mb-6">
            {isRtl ? "افتح الوكيل وابدأ بتحميل بياناتك الآن." : "Open the agent and start uploading your data now."}
          </p>
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-white font-semibold text-sm hover:opacity-90 transition-opacity"
            style={{ backgroundColor: "#2563EB" }}
            data-testid="button-open-agent-footer"
          >
            <ExternalLink className="w-4 h-4" />
            {isRtl ? "فتح وكيل البيانات والتحليلات" : "Open Data & Analytics Agent"}
          </button>
        </div>
      </div>

      {/* Modal */}
      {selectedCase && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedId(null); }}
          data-testid="modal-overlay"
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto"
            dir={isRtl ? "rtl" : "ltr"}
            data-testid={`modal-usecase-${selectedCase.id}`}
          >
            {/* Modal header */}
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: selectedCase.bgColor }}>
                  <selectedCase.icon className="w-4 h-4" style={{ color: selectedCase.color }} />
                </div>
                <h2 className="font-bold text-gray-900 text-base leading-tight">{selectedCase.title[lang]}</h2>
              </div>
              <button
                onClick={() => setSelectedId(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all flex-shrink-0"
                data-testid="button-close-modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* User Story */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{isRtl ? "قصة المستخدم" : "User Story"}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold text-white" style={{ backgroundColor: selectedCase.color }}>
                    {selectedCase.role[lang]}
                  </span>
                </div>
                <blockquote className="text-sm text-gray-700 leading-relaxed border-l-4 pl-4 italic py-1" style={{ borderColor: selectedCase.color }}>
                  {selectedCase.userStory[lang]}
                </blockquote>
              </div>

              {/* Example Input */}
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">{isRtl ? "مثال على البيانات المدخلة" : "Example Input"}</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedCase.exampleInput.map((f, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-md text-[11px] font-mono bg-gray-100 text-gray-700 border border-gray-200">{f}</span>
                  ))}
                </div>
              </div>

              {/* Output Preview */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{isRtl ? "معاينة المخرجات" : "Sample Output Preview"}</p>
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded border border-gray-200 bg-gray-50">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    <span className="text-[9px] text-gray-500">{selectedCase.category === "nudge" ? "nudge_report_[timestamp].xlsx" : "result.xlsx"}</span>
                  </div>
                </div>
                <OutputPreview id={selectedCase.id} isRtl={isRtl} />
              </div>
            </div>

            {/* Modal footer */}
            <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 rounded-b-2xl flex items-center justify-between gap-3">
              <button
                onClick={() => setSelectedId(null)}
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
                data-testid="button-modal-cancel"
              >
                {isRtl ? "إغلاق" : "Close"}
              </button>
              <button
                onClick={() => handleLaunch(selectedCase)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white font-semibold text-sm hover:opacity-90 active:scale-95 transition-all shadow-sm"
                style={{ backgroundColor: "#2563EB" }}
                data-testid={`button-launch-agent-${selectedCase.id}`}
              >
                <ExternalLink className="w-4 h-4" />
                {selectedCase.category === "nudge"
                  ? (isRtl ? "تشغيل وكيل التحفيز" : "Launch Nudge Agent")
                  : (isRtl ? "تشغيل الوكيل" : "Launch Agent")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
