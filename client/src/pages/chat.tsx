import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
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
  Brain,
  Loader2,
  Download,
} from "lucide-react";
import type { Conversation, Message } from "@shared/schema";
import ReactMarkdown from "react-markdown";
import {
  DownloadableTable,
  TableHead,
  TableBody,
  TableRow,
  TableHeader,
  TableCell,
} from "@/components/markdown-table";
import {
  extractTablesFromMarkdown,
  downloadAllTablesAsExcel,
  hasMarkdownTables,
} from "@/lib/table-utils";

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
  {
    icon: Brain,
    title: "Nudge & Sludge Analysis",
    description: "Identify data elements for behavioural use cases",
    prompt: "I'm interested in nudge and sludge (behavioural analysis) use cases. Can you explain how data elements support behavioural interventions and what I need to get started?",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/30",
  },
];

export default function ChatPage() {
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  const { data: conversations = [], isLoading: conversationsLoading } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
  });

  const { data: activeConversation, isLoading: messagesLoading } = useQuery<Conversation & { messages: Message[] }>({
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
      }
    },
  });

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [activeConversation?.messages, streamingContent, scrollToBottom]);

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
          content: file ? `${content}\n\n📎 Uploaded: ${file.name}` : content,
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
                if (data.content) {
                  accumulated += data.content;
                  setStreamingContent(accumulated);
                }
                if (data.done) {
                  setIsStreaming(false);
                  setStreamingContent("");
                  queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId] });
                  queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
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
    if (file) {
      const validTypes = [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
        "text/csv",
      ];
      if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
        toast({ title: "Invalid file", description: "Please upload an Excel (.xlsx, .xls) or CSV file.", variant: "destructive" });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleFeatureCard = (prompt: string) => {
    sendMessage(prompt);
  };

  const handleNewChat = () => {
    setActiveConversationId(null);
    setInputValue("");
    setSelectedFile(null);
    setStreamingContent("");
  };

  const messages = activeConversation?.messages || [];

  return (
    <div className="flex h-screen bg-background" data-testid="chat-page">
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
                  className={`group flex items-center gap-2 rounded-md px-3 py-2 cursor-pointer text-sm transition-colors ${
                    activeConversationId === conv.id
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground"
                  }`}
                  onClick={() => setActiveConversationId(conv.id)}
                  data-testid={`conversation-item-${conv.id}`}
                >
                  <MessageSquare className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate flex-1">{conv.title}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="opacity-0 group-hover:opacity-100 h-6 w-6 flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConversation.mutate(conv.id);
                    }}
                    data-testid={`button-delete-conversation-${conv.id}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
        <Separator />
        <div className="p-3">
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
                  Your AI assistant for data governance. Upload Excel files to classify data, generate definitions, define quality rules, or analyze behavioural use cases.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl">
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
              <div className="space-y-6">
                {messages.map((msg) => (
                  <MessageBubble key={msg.id} message={msg} />
                ))}
                {isStreaming && streamingContent && (
                  <MessageBubble
                    message={{
                      id: -1,
                      conversationId: activeConversationId || 0,
                      role: "assistant",
                      content: streamingContent,
                      createdAt: new Date(),
                    }}
                    isStreaming
                  />
                )}
                {isStreaming && !streamingContent && (
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
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </ScrollArea>

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
                placeholder="Ask about data classification, quality rules, business definitions, or nudge & sludge analysis..."
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

const markdownComponents = {
  table: ({ children }: { children?: React.ReactNode }) => (
    <DownloadableTable>{children}</DownloadableTable>
  ),
  thead: ({ children }: { children?: React.ReactNode }) => (
    <TableHead>{children}</TableHead>
  ),
  tbody: ({ children }: { children?: React.ReactNode }) => (
    <TableBody>{children}</TableBody>
  ),
  tr: ({ children }: { children?: React.ReactNode }) => (
    <TableRow>{children}</TableRow>
  ),
  th: ({ children }: { children?: React.ReactNode }) => (
    <TableHeader>{children}</TableHeader>
  ),
  td: ({ children }: { children?: React.ReactNode }) => (
    <TableCell>{children}</TableCell>
  ),
};

function MessageBubble({
  message,
  isStreaming = false,
}: {
  message: Message;
  isStreaming?: boolean;
}) {
  const isUser = message.role === "user";
  const showDownloadAll = !isUser && !isStreaming && hasMarkdownTables(message.content);

  const handleDownloadAll = () => {
    const tables = extractTablesFromMarkdown(message.content);
    if (tables.length > 0) {
      const timestamp = new Date().toISOString().slice(0, 10);
      downloadAllTablesAsExcel(tables, `data-owner-agent-export-${timestamp}`);
    }
  };

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
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none break-words">
              <ReactMarkdown components={markdownComponents}>{message.content}</ReactMarkdown>
              {isStreaming && (
                <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-0.5 align-text-bottom" />
              )}
            </div>
          )}
        </div>
        {showDownloadAll && (
          <div className="mt-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={handleDownloadAll}
              className="gap-1.5 text-xs"
              data-testid="button-download-all-tables"
            >
              <Download className="w-3.5 h-3.5" />
              Download All Tables as Excel
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
