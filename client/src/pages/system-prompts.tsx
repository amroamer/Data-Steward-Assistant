import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, RotateCcw, Save, AlertCircle } from "lucide-react";

interface SystemPrompt {
  key: string;
  title: string;
  description: string;
  content: string;
  isModified: boolean;
}

export default function SystemPromptsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState<string>("");
  const [isDirty, setIsDirty] = useState(false);

  const { data, isLoading } = useQuery<SystemPrompt[]>({
    queryKey: ["/api/system-prompts"],
    queryFn: async () => {
      const res = await fetch("/api/system-prompts");
      if (!res.ok) throw new Error("Failed to load prompts");
      const json = await res.json();
      return Array.isArray(json) ? json : [];
    },
  });

  const prompts: SystemPrompt[] = Array.isArray(data) ? data : [];
  const selectedPrompt: SystemPrompt | null = selectedKey
    ? (prompts.find((p) => p.key === selectedKey) ?? null)
    : null;

  // When the server-side content for the selected prompt changes (e.g. after a reset),
  // sync editedContent — but only if the user has no unsaved edits.
  useEffect(() => {
    if (selectedPrompt && !isDirty) {
      setEditedContent(selectedPrompt.content ?? "");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPrompt?.content, selectedKey]);

  function selectPrompt(prompt: SystemPrompt) {
    setSelectedKey(prompt.key);
    setEditedContent(prompt.content ?? "");
    setIsDirty(false);
  }

  const saveMutation = useMutation({
    mutationFn: async ({ key, content }: { key: string; content: string }) => {
      const res = await fetch(`/api/system-prompts/${encodeURIComponent(key)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("Failed to save");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/system-prompts"] });
      setIsDirty(false);
      toast({ title: "Saved", description: "System prompt updated successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save prompt.", variant: "destructive" });
    },
  });

  const resetMutation = useMutation({
    mutationFn: async (key: string) => {
      const res = await fetch(`/api/system-prompts/${encodeURIComponent(key)}/reset`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to reset");
    },
    onSuccess: () => {
      setIsDirty(false);
      queryClient.invalidateQueries({ queryKey: ["/api/system-prompts"] });
      toast({ title: "Reset", description: "Prompt restored to default." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to reset prompt.", variant: "destructive" });
    },
  });

  const baseContent = selectedPrompt?.content ?? "";

  return (
    <div className="h-screen flex flex-col bg-gray-50 font-main">
      {/* Header */}
      <div className="h-14 flex items-center gap-3 px-6 bg-white border-b border-gray-200 flex-shrink-0">
        <Link href="/">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-sm font-semibold text-gray-900">System Prompts</h1>
          <p className="text-xs text-gray-500">View and edit AI agent instructions</p>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Sidebar list */}
        <div className="w-64 flex-shrink-0 bg-white border-r border-gray-200 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-sm text-gray-400">Loading…</div>
          ) : prompts.length === 0 ? (
            <div className="p-4 text-sm text-gray-400">No prompts found.</div>
          ) : (
            <ul className="py-2">
              {prompts.map((p) => (
                <li key={p.key}>
                  <button
                    onClick={() => selectPrompt(p)}
                    className={`w-full text-left px-4 py-3 transition-colors ${
                      selectedKey === p.key
                        ? "bg-blue-50 border-r-2 border-blue-600"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-medium text-gray-800 truncate flex-1">
                        {p.title ?? p.key}
                      </span>
                      {p.isModified && (
                        <AlertCircle className="w-3 h-3 flex-shrink-0 text-amber-500" title="Modified from default" />
                      )}
                    </div>
                    {p.description ? (
                      <p className="text-[11px] text-gray-400 truncate mt-0.5">{p.description}</p>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Editor */}
        <div className="flex-1 flex flex-col min-w-0 p-6">
          {!selectedPrompt ? (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <p className="text-sm">Select a prompt from the list to edit it.</p>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">{selectedPrompt.title}</h2>
                  <p className="text-xs text-gray-500 mt-0.5">{selectedPrompt.description}</p>
                  <p className="text-[11px] font-mono text-gray-400 mt-1">key: {selectedPrompt.key}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                    disabled={!selectedPrompt.isModified || resetMutation.isPending}
                    onClick={() => resetMutation.mutate(selectedKey!)}
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset to default
                  </Button>
                  <Button
                    size="sm"
                    className="gap-1.5 text-xs"
                    disabled={!isDirty || saveMutation.isPending}
                    onClick={() =>
                      saveMutation.mutate({ key: selectedKey!, content: editedContent })
                    }
                  >
                    <Save className="w-3 h-3" />
                    Save
                  </Button>
                </div>
              </div>
              {isDirty && (
                <p className="text-[11px] text-amber-600 mb-2">You have unsaved changes.</p>
              )}
              <Textarea
                className="flex-1 resize-none font-mono text-xs leading-relaxed"
                value={editedContent}
                onChange={(e) => {
                  const val = e.target.value;
                  setEditedContent(val);
                  setIsDirty(val !== baseContent);
                }}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
