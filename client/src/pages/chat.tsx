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
  ChevronsUpDown,
  Minimize2,
  Maximize2,
} from "lucide-react";
import type { Conversation, Message } from "@shared/schema";
import ReactMarkdown from "react-markdown";
import {
  type AnalysisType,
  type ResultRow,
  detectAndExtractAllAnalyses,
  mergeResults,
  mergeDqResults,
  generateResultExcel,
  generateAnalysisSummary,
  getIncludedAnalysisLabels,
  getAnalysisLabel,
} from "@/lib/result-store";

const FEATURE_CARDS = [
  {
    icon: ShieldCheck,
    title: "Data Classification",
    description: "Classify data fields per Saudi SDAIA NDMO standards",
    prompt: "I'd like to classify some data fields according to the Saudi SDAIA NDMO data classification framework. Please help me understand the classification levels and what I need to provide.",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/30",
  },
  {
    icon: BookOpen,
    title: "Business Definitions",
    description: "Generate comprehensive business definitions for data fields",
    prompt: "I need help generating business definitions for my data fields. Can you explain what a good business definition includes and guide me through the process?",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
  },
  {
    icon: CheckCircle,
    title: "Data Quality Rules",
    description: "Suggest quality rules and dimensions for data elements",
    prompt: "I want to define data quality rules for my data elements. Can you help me understand the key data quality dimensions and what rules I should apply?",
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-50 dark:bg-purple-950/30",
  },
];

interface ThreadPair {
  userMsg: Message;
  assistantMsg?: Message;
}

function detectAnalysisTag(userContent: string, assistantContent?: string): string | null {
  const combined = `${userContent} ${assistantContent || ""}`.toLowerCase();
  if (combined.includes("business definition") || combined.includes("business def")) return "Business Definitions";
  if (combined.includes("classification") || combined.includes("classify")) return "Data Classification";
  if (combined.includes("quality") || combined.includes("dq rule")) return "Data Quality Rules";
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

export default function ChatPage() {
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [resultRows, setResultRows] = useState<ResultRow[]>([]);
  const [includedAnalyses, setIncludedAnalyses] = useState<AnalysisType[]>([]);
  const [sessionFieldNames, setSessionFieldNames] = useState<string[] | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [summaryOverrides, setSummaryOverrides] = useState<Record<number, string>>({});

  const [collapsedThreads, setCollapsedThreads] = useState<Set<number>>(new Set());

  const [deletingConvId, setDeletingConvId] = useState<number | null>(null);
  const [fadingOutConvId, setFadingOutConvId] = useState<number | null>(null);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);
  const [fadingOutAll, setFadingOutAll] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
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
    for (const msg of activeConversation.messages) {
      if (msg.role !== "assistant") continue;
      const results = detectAndExtractAllAnalyses(msg.content);
      if (results.length === 0) continue;
      const totalFields = new Set(
        results.flatMap(r => [
          ...Object.keys(r.fieldData),
          ...(r.dqMultiRows?.map(dr => dr.fieldName) || [])
        ])
      ).size;
      overrides[msg.id] = generateAnalysisSummary(results, totalFields);
    }
    if (Object.keys(overrides).length > 0) {
      setSummaryOverrides(prev => ({ ...prev, ...overrides }));
    }
  }, [activeConversation?.messages]);

  const resetResultState = () => {
    setResultRows([]);
    setIncludedAnalyses([]);
    setSessionFieldNames(null);
    setUploadedFileName(null);
    setSummaryOverrides({});
  };

  const processAIResponse = (content: string, messageId?: number) => {
    const analysisResults = detectAndExtractAllAnalyses(content);
    if (analysisResults.length === 0) return;

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
      for (const t of newTypes) {
        if (!updated.includes(t)) updated.push(t);
      }
      return updated;
    });

    const totalFields = new Set(
      analysisResults.flatMap(r => [
        ...Object.keys(r.fieldData),
        ...(r.dqMultiRows?.map(dr => dr.fieldName) || [])
      ])
    ).size;

    const summary = generateAnalysisSummary(analysisResults, totalFields);

    if (messageId) {
      setSummaryOverrides(prev => ({ ...prev, [messageId]: summary }));
    }

    const labels = newTypes.map((t) => getAnalysisLabel(t)).join(", ");
    toast({
      title: "result.xlsx updated",
      description: `Added ${labels} analysis results`,
    });
  };

  const sendMessage = async (content: string, file?: File | null) => {
    if (!content.trim() && !file) return;

    let conversationId = activeConversationId;
    if (!conversationId) {
      const title = content.substring(0, 50) || "New Analysis";
      const newConv = await createConversation.mutateAsync(title);
      conversationId = newConv.id;
    }

    setIsStreaming(true);
    setStreamingContent("");
    setInputValue("");
    setSelectedFile(null);

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
          : { id: conversationId, title: "New Chat", messages: [newMessage] };
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
                if (data.fieldNames) {
                  setSessionFieldNames(data.fieldNames);
                  if (file) setUploadedFileName(file.name);
                }
                if (data.content) {
                  accumulated += data.content;
                  setStreamingContent(accumulated);
                }
                if (data.done) {
                  setIsStreaming(false);
                  setStreamingContent("");

                  const analysisResults = detectAndExtractAllAnalyses(accumulated);
                  if (analysisResults.length > 0) {
                    processAIResponse(accumulated);

                    await queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId] });
                    await queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });

                    const convData = queryClient.getQueryData<any>(["/api/conversations", conversationId]);
                    if (convData?.messages) {
                      const lastMsg = convData.messages[convData.messages.length - 1];
                      if (lastMsg?.role === "assistant") {
                        const totalFields = new Set(
                          analysisResults.flatMap((r: any) => [
                            ...Object.keys(r.fieldData),
                            ...(r.dqMultiRows?.map((dr: any) => dr.fieldName) || [])
                          ])
                        ).size;
                        const summary = generateAnalysisSummary(analysisResults, totalFields);
                        setSummaryOverrides(prev => ({ ...prev, [lastMsg.id]: summary }));
                      }
                    }
                  } else {
                    queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId] });
                    queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
                  }
                }
                if (data.error) {
                  toast({ title: "Error", description: data.error, variant: "destructive" });
                }
              } catch {}
            }
          }
        }
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to send message. Please try again.", variant: "destructive" });
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
    ];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast({ title: "Invalid file", description: "Please upload an Excel (.xlsx, .xls) or CSV file.", variant: "destructive" });
      return;
    }

    if (sessionFieldNames && sessionFieldNames.length > 0 && resultRows.length > 0) {
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
    sendMessage(prompt);
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
    if (resultRows.length > 0) {
      generateResultExcel(resultRows, includedAnalyses);
    }
  };

  const handleDeleteConversation = (id: number) => {
    setFadingOutConvId(id);
    setTimeout(() => {
      deleteConversation.mutate(id);
      setFadingOutConvId(null);
      setDeletingConvId(null);
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
    const allIndices = new Set(threads.map((_, i) => i));
    setCollapsedThreads(allIndices);
  };

  const expandAll = () => {
    setCollapsedThreads(new Set());
  };

  const messages = activeConversation?.messages || [];
  const threads = groupMessagesIntoThreads(messages);

  return (
    <div className="flex h-screen bg-background" data-testid="chat-page">
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset result.xlsx?</AlertDialogTitle>
            <AlertDialogDescription>
              You already have analysis results from "{uploadedFileName}". Uploading a new file will reset result.xlsx and start fresh with the new file. Your current results ({getIncludedAnalysisLabels(includedAnalyses)}) will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleResetCancel} data-testid="button-reset-cancel">Keep Current</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetConfirm} data-testid="button-reset-confirm">Reset & Upload New</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Sidebar */}
      <div
        className={`${sidebarCollapsed ? "w-0 overflow-hidden" : "w-72"} border-r border-border bg-sidebar flex flex-col transition-all duration-300`}
        data-testid="sidebar"
      >
        <div className="p-4 flex items-center gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center flex-shrink-0">
              <Bot className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-semibold truncate">Data Owner Agent</h1>
              <p className="text-xs text-muted-foreground truncate">KPMG Data Governance</p>
            </div>
          </div>
        </div>
        <div className="px-3 pb-3">
          <Button
            onClick={handleNewChat}
            className="w-full justify-start gap-2"
            variant="default"
            size="sm"
            data-testid="button-new-chat"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </Button>
        </div>
        <Separator />
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {conversationsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : conversations.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8 px-4">
                No conversations yet. Start a new chat to begin.
              </p>
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
                    <div className="px-3 py-2 rounded-md bg-destructive/10 border border-destructive/20">
                      <p className="text-xs text-destructive font-medium mb-2">Delete this session?</p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-6 text-xs px-2"
                          onClick={() => handleDeleteConversation(conv.id)}
                          data-testid={`button-confirm-delete-${conv.id}`}
                        >
                          Yes, Delete
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 text-xs px-2"
                          onClick={() => setDeletingConvId(null)}
                          data-testid={`button-cancel-delete-${conv.id}`}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`group flex items-center gap-2 rounded-md px-3 py-2 cursor-pointer text-sm transition-colors ${
                        activeConversationId === conv.id
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:bg-accent/50"
                      }`}
                      onClick={() => setActiveConversationId(conv.id)}
                    >
                      <MessageSquare className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate flex-1">{conv.title}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="opacity-0 group-hover:opacity-100 h-6 w-6 flex-shrink-0"
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
        <Separator />
        <div className="p-3 space-y-2">
          {conversations.length > 0 && (
            <>
              {showClearAllConfirm ? (
                <div className="px-2 py-2 rounded-md bg-destructive/10 border border-destructive/20">
                  <p className="text-xs text-destructive font-medium mb-2">This will delete all sessions. Are you sure?</p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-6 text-xs px-2"
                      onClick={handleDeleteAllConversations}
                      data-testid="button-confirm-clear-all"
                    >
                      Yes, Delete All
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 text-xs px-2"
                      onClick={() => setShowClearAllConfirm(false)}
                      data-testid="button-cancel-clear-all"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-center gap-1.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setShowClearAllConfirm(true)}
                  data-testid="button-clear-all-sessions"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear All Sessions
                </Button>
              )}
            </>
          )}
          <p className="text-[10px] text-muted-foreground text-center">
            Powered by Claude AI
          </p>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="h-14 border-b border-border flex items-center gap-3 px-4 bg-background flex-shrink-0">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            data-testid="button-toggle-sidebar"
          >
            <MessageSquare className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-medium truncate">
              {activeConversation?.title || "Data Owner Agent"}
            </h2>
          </div>
          {threads.length > 1 && (
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs gap-1 px-2"
                onClick={() => collapseAll(threads)}
                data-testid="button-collapse-all"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                Collapse All
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs gap-1 px-2"
                onClick={expandAll}
                data-testid="button-expand-all"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                Expand All
              </Button>
            </div>
          )}
          {resultRows.length > 0 && (
            <Button
              size="sm"
              onClick={handleDownloadResult}
              className="gap-1.5 text-xs flex-shrink-0 text-white"
              style={{ backgroundColor: "#00A3A1" }}
              data-testid="button-header-download-result"
            >
              <Download className="w-3.5 h-3.5" />
              result.xlsx
            </Button>
          )}
          {activeConversationId && (
            <Badge variant="secondary" className="text-xs flex-shrink-0">
              {messages.length} messages
            </Badge>
          )}
        </div>

        {/* Messages Area */}
        <ScrollArea className="flex-1">
          <div className="max-w-3xl mx-auto w-full px-4 py-6">
            {!activeConversationId && messages.length === 0 && !isStreaming ? (
              <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mb-6">
                  <Bot className="w-9 h-9 text-primary-foreground" />
                </div>
                <h2 className="text-2xl font-semibold mb-2">Data Owner Agent</h2>
                <p className="text-muted-foreground text-center mb-8 max-w-md text-sm">
                  Your AI assistant for data governance. Upload Excel files to classify data, generate definitions, or define quality rules.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-xl">
                  {FEATURE_CARDS.map((card) => (
                    <button
                      key={card.title}
                      onClick={() => handleFeatureCard(card.prompt)}
                      className={`${card.bg} rounded-lg p-4 text-left transition-all border border-transparent hover:border-border group`}
                      data-testid={`card-feature-${card.title.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      <card.icon className={`w-5 h-5 ${card.color} mb-2`} />
                      <h3 className="text-sm font-medium mb-1">{card.title}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {card.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {threads.map((thread, idx) => {
                  const isCollapsed = collapsedThreads.has(idx);
                  const tag = detectAnalysisTag(
                    thread.userMsg.content,
                    thread.assistantMsg?.content
                  );
                  const preview = thread.userMsg.content.substring(0, 60) + (thread.userMsg.content.length > 60 ? "..." : "");
                  const timestamp = formatTimestamp(thread.userMsg.createdAt);

                  return (
                    <div
                      key={thread.userMsg.id}
                      className="rounded-lg border border-border overflow-hidden"
                      data-testid={`thread-block-${idx}`}
                    >
                      <button
                        onClick={() => toggleThread(idx)}
                        className="w-full flex items-center gap-3 px-3 py-2 text-left bg-muted/50 hover:bg-muted/80 transition-colors"
                        style={{ borderLeft: "3px solid #00338D" }}
                        data-testid={`thread-header-${idx}`}
                      >
                        {isCollapsed ? (
                          <ChevronRight className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                        )}
                        <span className="text-xs text-foreground truncate flex-1">{preview}</span>
                        {tag && (
                          <Badge variant="secondary" className="text-[10px] h-5 px-1.5 flex-shrink-0">
                            {tag}
                          </Badge>
                        )}
                        <span className="text-[10px] text-muted-foreground flex-shrink-0">{timestamp}</span>
                      </button>
                      {!isCollapsed && (
                        <div className="p-4 space-y-4" data-testid={`thread-content-${idx}`}>
                          <MessageBubble
                            message={thread.userMsg}
                          />
                          {thread.assistantMsg && (
                            <MessageBubble
                              message={thread.assistantMsg}
                              summaryOverride={summaryOverrides[thread.assistantMsg.id]}
                              onDownloadResult={resultRows.length > 0 ? handleDownloadResult : undefined}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                {isStreaming && (
                  <div className="rounded-lg border border-border overflow-hidden" data-testid="thread-streaming">
                    <div
                      className="flex items-center gap-3 px-3 py-2 bg-muted/50"
                      style={{ borderLeft: "3px solid #00338D" }}
                    >
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground flex-shrink-0" />
                      <span className="text-xs text-foreground truncate flex-1">Processing...</span>
                    </div>
                    <div className="p-4 space-y-4">
                      {streamingContent ? (
                        <div className="flex gap-3">
                          <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center flex-shrink-0">
                            <Bot className="w-4 h-4 text-primary-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="inline-block text-left rounded-lg px-4 py-3 text-sm max-w-full bg-card border border-card-border">
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Analyzing your data...</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-3">
                          <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center flex-shrink-0">
                            <Bot className="w-4 h-4 text-primary-foreground" />
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Analyzing...
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Result Banner */}
        {resultRows.length > 0 && (
          <div className="border-t border-border bg-muted/30 px-4 py-2 flex-shrink-0" data-testid="result-banner">
            <div className="max-w-3xl mx-auto flex items-center gap-3">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium">
                  result.xlsx updated
                  {uploadedFileName && (
                    <span className="text-muted-foreground font-normal"> — source: {uploadedFileName}</span>
                  )}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  Includes: {getIncludedAnalysisLabels(includedAnalyses)} ({resultRows.length} fields)
                </p>
              </div>
              <Button
                size="sm"
                onClick={handleDownloadResult}
                className="gap-1.5 text-xs flex-shrink-0 text-white"
                style={{ backgroundColor: "#00A3A1" }}
                data-testid="button-download-result"
              >
                <Download className="w-3.5 h-3.5" />
                Download result.xlsx
              </Button>
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="border-t border-border bg-background p-4 flex-shrink-0">
          <div className="max-w-3xl mx-auto">
            {selectedFile && (
              <div className="flex items-center gap-2 mb-3 bg-accent/50 rounded-md px-3 py-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                <span className="text-sm truncate flex-1">{selectedFile.name}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 flex-shrink-0"
                  onClick={() => {
                    setSelectedFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  data-testid="button-remove-file"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            )}
            {sessionFieldNames && sessionFieldNames.length > 0 && !selectedFile && (
              <div className="flex items-center gap-2 mb-2 text-[10px] text-muted-foreground">
                <FileSpreadsheet className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">Session fields: {sessionFieldNames.slice(0, 6).join(", ")}{sessionFieldNames.length > 6 ? `, +${sessionFieldNames.length - 6} more` : ""}</span>
              </div>
            )}
            <form onSubmit={handleSubmit} className="flex items-end gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
                data-testid="input-file"
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => fileInputRef.current?.click()}
                disabled={isStreaming}
                data-testid="button-upload-file"
              >
                <Upload className="w-5 h-5" />
              </Button>
              <Textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  sessionFieldNames
                    ? "Ask for business definitions, data classification, or data quality rules..."
                    : "Upload an Excel file and ask about data classification, quality rules, or business definitions..."
                }
                className="min-h-[44px] max-h-32 resize-none flex-1"
                disabled={isStreaming}
                data-testid="input-message"
              />
              <Button
                type="submit"
                size="icon"
                disabled={isStreaming || (!inputValue.trim() && !selectedFile)}
                data-testid="button-send-message"
              >
                {isStreaming ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            </form>
            <p className="text-[10px] text-muted-foreground text-center mt-2">
              Upload Excel files (.xlsx, .xls, .csv) with data fields for analysis
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  isStreaming = false,
  summaryOverride,
  onDownloadResult,
}: {
  message: Message;
  isStreaming?: boolean;
  summaryOverride?: string;
  onDownloadResult?: () => void;
}) {
  const isUser = message.role === "user";
  const shouldShowSummary = !isUser && !isStreaming && summaryOverride;

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`} data-testid={`message-${message.id}`}>
      <div
        className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 ${
          isUser ? "bg-secondary" : "bg-primary"
        }`}
      >
        {isUser ? (
          <User className="w-4 h-4 text-secondary-foreground" />
        ) : (
          <Bot className="w-4 h-4 text-primary-foreground" />
        )}
      </div>
      <div
        className={`flex-1 min-w-0 ${isUser ? "text-right" : ""}`}
      >
        <div
          className={`inline-block text-left rounded-lg px-4 py-3 text-sm max-w-full ${
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-card border border-card-border"
          }`}
        >
          {isUser ? (
            <div className="whitespace-pre-wrap break-words">{message.content}</div>
          ) : shouldShowSummary ? (
            <div className="whitespace-pre-wrap break-words">{summaryOverride}</div>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none break-words">
              <ReactMarkdown>{message.content}</ReactMarkdown>
              {isStreaming && (
                <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-0.5 align-text-bottom" />
              )}
            </div>
          )}
        </div>
        {shouldShowSummary && onDownloadResult && (
          <div className="mt-2">
            <Button
              size="sm"
              onClick={onDownloadResult}
              className="gap-1.5 text-xs text-white"
              style={{ backgroundColor: "#00A3A1" }}
              data-testid={`button-download-result-${message.id}`}
            >
              <Download className="w-3.5 h-3.5" />
              Download result.xlsx
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
