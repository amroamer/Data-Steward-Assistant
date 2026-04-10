import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Plus, Save, RotateCcw, Download, Upload, Trash2,
  AlertCircle, Building2, FileText, Eye, EyeOff, Settings2, Palette,
  ShieldCheck, BookOpen, CheckCircle, ScanEye, Cpu, Layers, Brain, Target, BarChart3,
  ImageIcon, Type, X, Users, Pencil, Mail, Lock,
} from "lucide-react";
import { useEntity, type Entity } from "@/context/entity-context";
import { apiUrl } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

interface EntityPrompt {
  key: string;
  title: string;
  description: string;
  content: string;
  isOverridden: boolean;
}

type Section = "entities" | "users" | "general";
type Tab = "prompts" | "pages" | "branding";

interface UserRecord {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
  entityIds: number[];
  entityNames: string[];
  createdAt: string;
}

const PAGE_CONFIGS = [
  { id: "data-classification", icon: ShieldCheck, label: "Data Classification", color: "#067647" },
  { id: "business-definitions", icon: BookOpen, label: "Business Definitions", color: "#51BAB4" },
  { id: "dq-rules", icon: CheckCircle, label: "DQ Rules", color: "#774896" },
  { id: "pii-detection", icon: ScanEye, label: "PII Detection", color: "#E53935" },
  { id: "informatica", icon: Cpu, label: "Informatica Output", color: "#F57C00" },
  { id: "data-model", icon: Layers, label: "Analytical Model", color: "#1565C0" },
  { id: "insights", icon: Brain, label: "Data Insights", color: "#6A1B9A" },
  { id: "nudge", icon: Target, label: "Nudge Agent", color: "#00838F" },
  { id: "bi", icon: BarChart3, label: "BI Agent", color: "#2E7D32" },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function EntitySettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentEntity, setCurrentEntity } = useEntity();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [section, setSection] = useState<Section>("entities");
  const [selectedEntityId, setSelectedEntityId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("prompts");
  const [selectedPromptKey, setSelectedPromptKey] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const [isDirty, setIsDirty] = useState(false);

  // New entity form
  const [showNewEntity, setShowNewEntity] = useState(false);
  const [newSlug, setNewSlug] = useState("");
  const [newName, setNewName] = useState("");

  // Branding state
  const [brandLogo, setBrandLogo] = useState<string | null>(null);
  const [brandAppTitle, setBrandAppTitle] = useState("");
  const [brandColorSidebar, setBrandColorSidebar] = useState("#0D2E5C");
  const [brandColorPrimary, setBrandColorPrimary] = useState("#2563EB");
  const [brandColorSecondary, setBrandColorSecondary] = useState("#1A4B8C");
  const [brandColorAccent, setBrandColorAccent] = useState("#2E7D32");
  const [brandLogoInvert, setBrandLogoInvert] = useState(true);
  const logoUploadRef = useRef<HTMLInputElement>(null);

  // User management state
  const [showNewUser, setShowNewUser] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [userFormName, setUserFormName] = useState("");
  const [userFormEmail, setUserFormEmail] = useState("");
  const [userFormPassword, setUserFormPassword] = useState("");
  const [userFormEntityIds, setUserFormEntityIds] = useState<number[]>([]);

  // ── Queries ───────────────────────────────────────────────────────────────

  const { data: entities = [], isLoading: entitiesLoading } = useQuery<Entity[]>({
    queryKey: ["/api/entities"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/entities"));
      if (!res.ok) throw new Error("Failed to load entities");
      return res.json();
    },
  });

  const selectedEntity = entities.find((e) => e.id === selectedEntityId) ?? null;

  // Auto-select first entity
  useEffect(() => {
    if (!selectedEntityId && entities.length > 0) {
      setSelectedEntityId(entities[0].id);
    }
  }, [entities, selectedEntityId]);

  const { data: prompts = [], isLoading: promptsLoading } = useQuery<EntityPrompt[]>({
    queryKey: ["/api/entities", selectedEntityId, "prompts"],
    queryFn: async () => {
      const res = await fetch(apiUrl(`/api/entities/${selectedEntityId}/prompts`));
      if (!res.ok) throw new Error("Failed to load prompts");
      return res.json();
    },
    enabled: !!selectedEntityId,
  });

  const { data: pageVisibility = {}, isLoading: visibilityLoading } = useQuery<Record<string, boolean>>({
    queryKey: ["/api/entities", selectedEntityId, "page-visibility"],
    queryFn: async () => {
      const res = await fetch(apiUrl(`/api/entities/${selectedEntityId}/page-visibility`));
      if (!res.ok) throw new Error("Failed to load page visibility");
      return res.json();
    },
    enabled: !!selectedEntityId,
  });

  const { data: usersData = [], isLoading: usersLoading } = useQuery<UserRecord[]>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/users"));
      if (!res.ok) throw new Error("Failed to load users");
      return res.json();
    },
  });

  const selectedPrompt = selectedPromptKey ? prompts.find((p) => p.key === selectedPromptKey) ?? null : null;

  useEffect(() => {
    if (selectedPrompt && !isDirty) {
      setEditedContent(selectedPrompt.content ?? "");
    }
  }, [selectedPrompt?.content, selectedPromptKey]);

  // Sync branding state when entity selection changes
  useEffect(() => {
    if (selectedEntity) {
      setBrandLogo(selectedEntity.logoBase64 ?? null);
      setBrandAppTitle(selectedEntity.appTitle ?? "");
      setBrandColorSidebar(selectedEntity.colorSidebar ?? "#0D2E5C");
      setBrandColorPrimary(selectedEntity.colorPrimary ?? "#2563EB");
      setBrandColorSecondary(selectedEntity.colorSecondary ?? "#1A4B8C");
      setBrandColorAccent(selectedEntity.colorAccent ?? "#2E7D32");
      setBrandLogoInvert(selectedEntity.logoInvert ?? true);
    }
  }, [selectedEntityId, selectedEntity?.logoBase64, selectedEntity?.appTitle, selectedEntity?.colorSidebar, selectedEntity?.colorPrimary, selectedEntity?.colorSecondary, selectedEntity?.colorAccent, selectedEntity?.logoInvert]);

  // ── Mutations ─────────────────────────────────────────────────────────────

  const saveBrandingMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(apiUrl(`/api/entities/${selectedEntityId}/branding`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          logoBase64: brandLogo,
          appTitle: brandAppTitle || null,
          colorSidebar: brandColorSidebar || null,
          colorPrimary: brandColorPrimary || null,
          colorSecondary: brandColorSecondary || null,
          colorAccent: brandColorAccent || null,
          logoInvert: brandLogoInvert,
        }),
      });
      if (!res.ok) throw new Error("Failed to save branding");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/entities"] });
      toast({ title: "Saved", description: "Branding updated." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save branding.", variant: "destructive" });
    },
  });

  // ── User Mutations ───────────────────────────────────────────────────────

  function resetUserForm() {
    setUserFormName("");
    setUserFormEmail("");
    setUserFormPassword("");
    setUserFormEntityIds([]);
    setEditingUserId(null);
    setShowNewUser(false);
  }

  const saveUserMutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = { name: userFormName, email: userFormEmail, entityIds: userFormEntityIds };
      if (editingUserId) {
        if (userFormPassword) body.password = userFormPassword;
        const res = await fetch(apiUrl(`/api/users/${editingUserId}`), {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed"); }
        // Update entity assignments
        await fetch(apiUrl(`/api/users/${editingUserId}/entities`), {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entityIds: userFormEntityIds }),
        });
      } else {
        body.password = userFormPassword;
        const res = await fetch(apiUrl("/api/users"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed"); }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      resetUserForm();
      toast({ title: "Saved", description: editingUserId ? "User updated." : "User created." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(apiUrl(`/api/users/${id}`), { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete user");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Deleted", description: "User deleted." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete user.", variant: "destructive" });
    },
  });

  const toggleUserActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const res = await fetch(apiUrl(`/api/users/${id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
  });

  // ── Entity Mutations ──────────────────────────────────────────────────────

  const createEntityMutation = useMutation({
    mutationFn: async ({ slug, name }: { slug: string; name: string }) => {
      const res = await fetch(apiUrl("/api/entities"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, name }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create entity");
      }
      return res.json();
    },
    onSuccess: (entity: Entity) => {
      queryClient.invalidateQueries({ queryKey: ["/api/entities"] });
      setSelectedEntityId(entity.id);
      setShowNewEntity(false);
      setNewSlug("");
      setNewName("");
      toast({ title: "Created", description: `Entity "${entity.name}" created.` });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteEntityMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(apiUrl(`/api/entities/${id}`), { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete entity");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/entities"] });
      setSelectedEntityId(null);
      toast({ title: "Deleted", description: "Entity deleted." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete entity.", variant: "destructive" });
    },
  });

  const savePromptMutation = useMutation({
    mutationFn: async ({ key, content }: { key: string; content: string }) => {
      const res = await fetch(apiUrl(`/api/entities/${selectedEntityId}/prompts/${encodeURIComponent(key)}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("Failed to save");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/entities", selectedEntityId, "prompts"] });
      setIsDirty(false);
      toast({ title: "Saved", description: "Prompt updated for this entity." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save prompt.", variant: "destructive" });
    },
  });

  const resetPromptMutation = useMutation({
    mutationFn: async (key: string) => {
      const res = await fetch(apiUrl(`/api/entities/${selectedEntityId}/prompts/${encodeURIComponent(key)}/reset`), {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to reset");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/entities", selectedEntityId, "prompts"] });
      setIsDirty(false);
      toast({ title: "Reset", description: "Prompt reverted to global default." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to reset prompt.", variant: "destructive" });
    },
  });

  const toggleVisibilityMutation = useMutation({
    mutationFn: async ({ pageKey, visible }: { pageKey: string; visible: boolean }) => {
      const res = await fetch(apiUrl(`/api/entities/${selectedEntityId}/page-visibility/${pageKey}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visible }),
      });
      if (!res.ok) throw new Error("Failed to update visibility");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/entities", selectedEntityId, "page-visibility"] });
    },
  });

  // ── Import / Export ───────────────────────────────────────────────────────

  async function handleExport() {
    try {
      const res = await fetch(apiUrl(`/api/entities/${selectedEntityId}/prompts/export`), { method: "POST" });
      if (!res.ok) throw new Error("Export failed");
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selectedEntity?.slug || "entity"}-prompts-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Exported", description: "Entity data downloaded." });
    } catch {
      toast({ title: "Error", description: "Export failed.", variant: "destructive" });
    }
  }

  async function handleImport(file: File) {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const res = await fetch(apiUrl(`/api/entities/${selectedEntityId}/prompts/import`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Import failed");
      const result = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/entities", selectedEntityId, "prompts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/entities", selectedEntityId, "page-visibility"] });
      toast({ title: "Imported", description: `${result.promptsImported} prompts, ${result.visibilityImported} page settings imported.` });
    } catch {
      toast({ title: "Error", description: "Import failed. Check the JSON file format.", variant: "destructive" });
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="h-screen flex flex-col bg-gray-50 font-main">
      {/* Header */}
      <div className="h-14 flex items-center gap-3 px-6 bg-white border-b border-gray-200 flex-shrink-0">
        <Link href="/">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-sm font-semibold text-gray-900">Settings</h1>
          <p className="text-xs text-gray-500">Manage entities, users, prompts, and branding</p>
        </div>
        {/* Section tabs in header */}
        <div className="flex items-center gap-1 mr-4">
          <button
            onClick={() => setSection("entities")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              section === "entities" ? "bg-blue-50 text-blue-700" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            <Building2 className="w-3.5 h-3.5 inline mr-1" /> Entities
          </button>
          <button
            onClick={() => setSection("users")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              section === "users" ? "bg-blue-50 text-blue-700" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            <Users className="w-3.5 h-3.5 inline mr-1" /> Users
          </button>
          <button
            onClick={() => setSection("general")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              section === "general" ? "bg-blue-50 text-blue-700" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            <Settings2 className="w-3.5 h-3.5 inline mr-1" /> General
          </button>
        </div>
        {section === "entities" && selectedEntity && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleExport}>
              <Download className="w-3 h-3" /> Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-3 h-3" /> Import
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImport(file);
                e.target.value = "";
              }}
            />
          </div>
        )}
      </div>

      <div className="flex-1 flex min-h-0">
        {section === "entities" && <>
        {/* Entity sidebar */}
        <div className="w-56 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-3 border-b border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Entities</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setShowNewEntity(!showNewEntity)}
              >
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>
            {showNewEntity && (
              <div className="space-y-2 p-2 bg-gray-50 rounded border border-gray-200">
                <Input
                  placeholder="Slug (e.g. kpmg)"
                  value={newSlug}
                  onChange={(e) => setNewSlug(e.target.value)}
                  className="h-7 text-xs"
                />
                <Input
                  placeholder="Name (e.g. KPMG)"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="h-7 text-xs"
                />
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    className="h-7 text-xs flex-1"
                    disabled={!newSlug.trim() || !newName.trim() || createEntityMutation.isPending}
                    onClick={() => createEntityMutation.mutate({ slug: newSlug.trim(), name: newName.trim() })}
                  >
                    Add
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowNewEntity(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {entitiesLoading ? (
              <div className="p-4 text-sm text-gray-400">Loading...</div>
            ) : (
              <ul className="py-1">
                {entities.map((entity) => (
                  <li key={entity.id}>
                    <button
                      onClick={() => {
                        setSelectedEntityId(entity.id);
                        setSelectedPromptKey(null);
                        setIsDirty(false);
                      }}
                      className={`w-full text-left px-4 py-3 transition-colors flex items-center gap-2 ${
                        selectedEntityId === entity.id
                          ? "bg-blue-50 border-r-2 border-blue-600"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      <Building2 className="w-4 h-4 flex-shrink-0 text-gray-400" />
                      <div className="flex-1 min-w-0">
                        <span className="text-[13px] font-medium text-gray-800 block truncate">{entity.name}</span>
                        <span className="text-[11px] text-gray-400 block">{entity.slug}</span>
                      </div>
                      {currentEntity?.id === entity.id ? (
                        <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">Active</span>
                      ) : !entity.isActive ? (
                        <span className="text-[10px] bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded">inactive</span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {selectedEntity && (
            <div className="p-3 border-t border-gray-100 space-y-1.5">
              {currentEntity?.id !== selectedEntity.id && (
                <Button
                  size="sm"
                  className="w-full gap-1.5 text-xs"
                  onClick={() => {
                    setCurrentEntity(selectedEntity);
                    toast({ title: "Active entity changed", description: `"${selectedEntity.name}" is now the active entity.` });
                  }}
                >
                  <CheckCircle className="w-3 h-3" /> Set as Active
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="w-full gap-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => {
                  if (confirm(`Delete entity "${selectedEntity.name}"? This removes all its prompt overrides and page visibility settings.`)) {
                    deleteEntityMutation.mutate(selectedEntity.id);
                  }
                }}
              >
                <Trash2 className="w-3 h-3" /> Delete Entity
              </Button>
            </div>
          )}
        </div>

        {/* Main content */}
        {!selectedEntity ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <p className="text-sm">Select an entity from the sidebar.</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-w-0">
            {/* Tabs */}
            <div className="flex items-center gap-0 px-6 pt-3 border-b border-gray-200 bg-white">
              <button
                onClick={() => setActiveTab("prompts")}
                className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                  activeTab === "prompts"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <FileText className="w-3.5 h-3.5 inline mr-1.5" />
                Prompts
              </button>
              <button
                onClick={() => setActiveTab("pages")}
                className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                  activeTab === "pages"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <Settings2 className="w-3.5 h-3.5 inline mr-1.5" />
                Page Visibility
              </button>
              <button
                onClick={() => setActiveTab("branding")}
                className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                  activeTab === "branding"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <Palette className="w-3.5 h-3.5 inline mr-1.5" />
                Branding
              </button>
            </div>

            {activeTab === "prompts" && (
              <div className="flex-1 flex min-h-0">
                {/* Prompt list */}
                <div className="w-64 flex-shrink-0 border-r border-gray-200 overflow-y-auto bg-white">
                  {promptsLoading ? (
                    <div className="p-4 text-sm text-gray-400">Loading...</div>
                  ) : (
                    <ul className="py-2">
                      {prompts.map((p) => (
                        <li key={p.key}>
                          <button
                            onClick={() => {
                              setSelectedPromptKey(p.key);
                              setEditedContent(p.content ?? "");
                              setIsDirty(false);
                            }}
                            className={`w-full text-left px-4 py-3 transition-colors ${
                              selectedPromptKey === p.key
                                ? "bg-blue-50 border-r-2 border-blue-600"
                                : "hover:bg-gray-50"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-[13px] font-medium text-gray-800 truncate flex-1">
                                {p.title ?? p.key}
                              </span>
                              {p.isOverridden && (
                                <span title="Overridden from default"><AlertCircle className="w-3 h-3 flex-shrink-0 text-amber-500" /></span>
                              )}
                            </div>
                            {p.description && (
                              <p className="text-[11px] text-gray-400 truncate mt-0.5">{p.description}</p>
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Prompt editor */}
                <div className="flex-1 flex flex-col min-w-0 p-6">
                  {!selectedPrompt ? (
                    <div className="flex-1 flex items-center justify-center text-gray-400">
                      <p className="text-sm">Select a prompt to edit it for {selectedEntity.name}.</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h2 className="text-base font-semibold text-gray-900">{selectedPrompt.title}</h2>
                          <p className="text-xs text-gray-500 mt-0.5">{selectedPrompt.description}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[11px] font-mono text-gray-400">key: {selectedPrompt.key}</span>
                            {selectedPrompt.isOverridden && (
                              <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">
                                Overridden
                              </span>
                            )}
                            {!selectedPrompt.isOverridden && (
                              <span className="text-[10px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded font-medium">
                                Using Default
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5 text-xs"
                            disabled={!selectedPrompt.isOverridden || resetPromptMutation.isPending}
                            onClick={() => resetPromptMutation.mutate(selectedPromptKey!)}
                          >
                            <RotateCcw className="w-3 h-3" /> Reset to Default
                          </Button>
                          <Button
                            size="sm"
                            className="gap-1.5 text-xs"
                            disabled={!isDirty || savePromptMutation.isPending}
                            onClick={() => savePromptMutation.mutate({ key: selectedPromptKey!, content: editedContent })}
                          >
                            <Save className="w-3 h-3" /> Save
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
                          setEditedContent(e.target.value);
                          setIsDirty(e.target.value !== (selectedPrompt?.content ?? ""));
                        }}
                      />
                    </>
                  )}
                </div>
              </div>
            )}

            {activeTab === "pages" && (
              <div className="flex-1 overflow-y-auto p-6">
                <p className="text-sm text-gray-600 mb-6">
                  Control which pages are visible for <strong>{selectedEntity.name}</strong>. Hidden pages will not appear in the sidebar.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl">
                  {PAGE_CONFIGS.map(({ id, icon: Icon, label, color }) => {
                    const visible = pageVisibility[id] !== false;
                    return (
                      <button
                        key={id}
                        onClick={() => toggleVisibilityMutation.mutate({ pageKey: id, visible: !visible })}
                        className={`flex items-center gap-3 p-4 rounded-lg border transition-all ${
                          visible
                            ? "bg-white border-gray-200 hover:border-gray-300"
                            : "bg-gray-50 border-gray-100 opacity-60"
                        }`}
                      >
                        <div
                          className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: visible ? color + "18" : "#f3f4f6" }}
                        >
                          <Icon className="w-4 h-4" style={{ color: visible ? color : "#9ca3af" }} />
                        </div>
                        <span className="text-sm font-medium text-gray-800 flex-1 text-left">{label}</span>
                        {visible ? (
                          <Eye className="w-4 h-4 text-green-600" />
                        ) : (
                          <EyeOff className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === "branding" && (
              <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-4xl flex gap-8">
                  {/* Branding form */}
                  <div className="flex-1 space-y-6">
                    {/* Logo */}
                    <div>
                      <label className="text-xs font-semibold text-gray-700 block mb-2">
                        <ImageIcon className="w-3.5 h-3.5 inline mr-1" /> Logo
                      </label>
                      <div className="flex items-center gap-4">
                        {brandLogo ? (
                          <div className="relative">
                            <div className="w-16 h-16 rounded-lg border border-gray-200 flex items-center justify-center bg-gray-50 overflow-hidden">
                              <img src={brandLogo} alt="Logo" className="max-w-full max-h-full object-contain" />
                            </div>
                            <button
                              onClick={() => setBrandLogo(null)}
                              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400">
                            <ImageIcon className="w-6 h-6" />
                          </div>
                        )}
                        <div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            onClick={() => logoUploadRef.current?.click()}
                          >
                            <Upload className="w-3 h-3 mr-1" /> Upload Logo
                          </Button>
                          <p className="text-[10px] text-gray-400 mt-1">SVG, PNG, or JPG. Max 375KB.</p>
                          <input
                            ref={logoUploadRef}
                            type="file"
                            accept="image/svg+xml,image/png,image/jpeg"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              if (file.size > 375000) {
                                toast({ title: "Too large", description: "Logo must be under 375KB.", variant: "destructive" });
                                return;
                              }
                              const reader = new FileReader();
                              reader.onload = () => setBrandLogo(reader.result as string);
                              reader.readAsDataURL(file);
                              e.target.value = "";
                            }}
                          />
                        </div>
                      </div>
                      <label className="flex items-center gap-2 mt-3 text-xs text-gray-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={brandLogoInvert}
                          onChange={(e) => setBrandLogoInvert(e.target.checked)}
                          className="rounded border-gray-300"
                        />
                        Invert logo for dark sidebar (white appearance)
                      </label>
                    </div>

                    {/* App Title */}
                    <div>
                      <label className="text-xs font-semibold text-gray-700 block mb-2">
                        <Type className="w-3.5 h-3.5 inline mr-1" /> App Title
                      </label>
                      <Input
                        value={brandAppTitle}
                        onChange={(e) => setBrandAppTitle(e.target.value)}
                        placeholder="Data & Analytics Agent"
                        className="h-8 text-sm"
                      />
                    </div>

                    {/* Colors */}
                    <div>
                      <label className="text-xs font-semibold text-gray-700 block mb-3">
                        <Palette className="w-3.5 h-3.5 inline mr-1" /> Brand Colors
                      </label>
                      <div className="grid grid-cols-2 gap-4">
                        {[
                          { label: "Sidebar Background", value: brandColorSidebar, set: setBrandColorSidebar, defaultVal: "#0D2E5C" },
                          { label: "Primary (Buttons)", value: brandColorPrimary, set: setBrandColorPrimary, defaultVal: "#2563EB" },
                          { label: "Secondary (Links)", value: brandColorSecondary, set: setBrandColorSecondary, defaultVal: "#1A4B8C" },
                          { label: "Accent (Success)", value: brandColorAccent, set: setBrandColorAccent, defaultVal: "#2E7D32" },
                        ].map(({ label, value, set, defaultVal }) => (
                          <div key={label} className="space-y-1.5">
                            <span className="text-[11px] text-gray-500">{label}</span>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={value}
                                onChange={(e) => set(e.target.value)}
                                className="w-8 h-8 rounded cursor-pointer border border-gray-200"
                              />
                              <Input
                                value={value}
                                onChange={(e) => set(e.target.value)}
                                className="h-8 text-xs font-mono flex-1"
                                maxLength={7}
                              />
                              <button
                                onClick={() => set(defaultVal)}
                                className="text-[10px] text-gray-400 hover:text-gray-600 px-1"
                                title="Reset to default"
                              >
                                <RotateCcw className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Save */}
                    <Button
                      size="sm"
                      className="gap-1.5 text-xs"
                      disabled={saveBrandingMutation.isPending}
                      onClick={() => saveBrandingMutation.mutate()}
                    >
                      <Save className="w-3 h-3" /> Save Branding
                    </Button>
                  </div>

                  {/* Live Preview */}
                  <div className="w-64 flex-shrink-0">
                    <span className="text-xs font-semibold text-gray-500 block mb-3">Preview</span>
                    <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                      {/* Sidebar preview */}
                      <div className="p-4" style={{ backgroundColor: brandColorSidebar }}>
                        <div className="flex items-center gap-2 mb-3">
                          {brandLogo ? (
                            <img
                              src={brandLogo}
                              alt=""
                              className={`h-6 ${brandLogoInvert ? "brightness-0 invert" : ""}`}
                            />
                          ) : (
                            <div className="w-6 h-6 rounded bg-white/20" />
                          )}
                          <span className="text-white text-xs font-semibold truncate">
                            {brandAppTitle || "Data & Analytics Agent"}
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          <div className="h-5 rounded px-2 flex items-center" style={{ backgroundColor: brandColorSecondary }}>
                            <span className="text-white text-[9px]">Active Item</span>
                          </div>
                          <div className="h-5 rounded px-2 flex items-center opacity-60">
                            <span className="text-white text-[9px]">Other Item</span>
                          </div>
                        </div>
                      </div>
                      {/* Content preview */}
                      <div className="p-4 bg-white space-y-3">
                        <button
                          className="w-full h-7 rounded text-white text-[10px] font-semibold"
                          style={{ backgroundColor: brandColorPrimary }}
                        >
                          Primary Button
                        </button>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-medium" style={{ color: brandColorSecondary }}>
                            Secondary Link
                          </span>
                          <span className="text-[10px] font-medium" style={{ color: brandColorAccent }}>
                            Success
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        </>}

        {section === "users" && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-4xl">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">Users</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Manage users and assign them to entities</p>
                </div>
                <Button
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => { resetUserForm(); setShowNewUser(true); }}
                >
                  <Plus className="w-3 h-3" /> Add User
                </Button>
              </div>

              {/* New / Edit User Form */}
              {(showNewUser || editingUserId) && (
                <div className="mb-6 p-4 bg-white rounded-lg border border-gray-200 space-y-3">
                  <h3 className="text-sm font-semibold text-gray-800">
                    {editingUserId ? "Edit User" : "New User"}
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-gray-500 block mb-1">Name</label>
                      <Input
                        value={userFormName}
                        onChange={(e) => setUserFormName(e.target.value)}
                        placeholder="Full name"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-gray-500 block mb-1">Email</label>
                      <Input
                        value={userFormEmail}
                        onChange={(e) => setUserFormEmail(e.target.value)}
                        placeholder="email@example.com"
                        className="h-8 text-sm"
                        type="email"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-500 block mb-1">
                      {editingUserId ? "New Password (leave empty to keep current)" : "Password"}
                    </label>
                    <Input
                      value={userFormPassword}
                      onChange={(e) => setUserFormPassword(e.target.value)}
                      placeholder={editingUserId ? "Leave empty to keep current" : "Password"}
                      className="h-8 text-sm"
                      type="password"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-500 block mb-1">Assigned Entities</label>
                    <div className="flex flex-wrap gap-2">
                      {entities.map((ent) => {
                        const assigned = userFormEntityIds.includes(ent.id);
                        return (
                          <button
                            key={ent.id}
                            onClick={() =>
                              setUserFormEntityIds((prev) =>
                                assigned ? prev.filter((id) => id !== ent.id) : [...prev, ent.id]
                              )
                            }
                            className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                              assigned
                                ? "bg-blue-50 border-blue-300 text-blue-700"
                                : "bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300"
                            }`}
                          >
                            {ent.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      className="gap-1.5 text-xs"
                      disabled={!userFormName.trim() || !userFormEmail.trim() || (!editingUserId && !userFormPassword) || saveUserMutation.isPending}
                      onClick={() => saveUserMutation.mutate()}
                    >
                      <Save className="w-3 h-3" /> {editingUserId ? "Update" : "Create"}
                    </Button>
                    <Button variant="ghost" size="sm" className="text-xs" onClick={resetUserForm}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Users Table */}
              {usersLoading ? (
                <p className="text-sm text-gray-400">Loading...</p>
              ) : usersData.length === 0 ? (
                <p className="text-sm text-gray-400">No users yet.</p>
              ) : (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                        <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Email</th>
                        <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Entities</th>
                        <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                        <th className="text-right px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usersData.map((u) => (
                        <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                          <td className="px-4 py-3 text-[13px] font-medium text-gray-800">{u.name}</td>
                          <td className="px-4 py-3 text-[13px] text-gray-500">{u.email}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {u.entityNames.length > 0 ? u.entityNames.map((name) => (
                                <span key={name} className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-medium">
                                  {name}
                                </span>
                              )) : (
                                <span className="text-[10px] text-gray-400">None</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => toggleUserActiveMutation.mutate({ id: u.id, isActive: !u.isActive })}
                              className={`text-[10px] px-1.5 py-0.5 rounded font-medium cursor-pointer ${
                                u.isActive ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-500"
                              }`}
                            >
                              {u.isActive ? "Active" : "Inactive"}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => {
                                  setEditingUserId(u.id);
                                  setUserFormName(u.name);
                                  setUserFormEmail(u.email);
                                  setUserFormPassword("");
                                  setUserFormEntityIds(u.entityIds);
                                  setShowNewUser(false);
                                }}
                                className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50 transition-colors"
                                title="Edit"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Delete user "${u.name}"?`)) deleteUserMutation.mutate(u.id);
                                }}
                                className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {section === "general" && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-2xl space-y-8">
              <div>
                <h2 className="text-base font-semibold text-gray-900 mb-1">General Settings</h2>
                <p className="text-xs text-gray-500">Configure AI provider and language preferences</p>
              </div>

              {/* AI Provider */}
              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <h3 className="text-sm font-semibold text-gray-800 mb-3">AI Provider</h3>
                <p className="text-xs text-gray-500 mb-4">Choose which AI backend to use for processing requests.</p>
                <div className="flex gap-3">
                  {[
                    { value: "local", label: "Local (RAGFlow)", desc: "Uses the local RAGFlow agents" },
                    { value: "claude", label: "Claude (Anthropic)", desc: "Uses Anthropic Claude API" },
                  ].map((opt) => {
                    const selected = (sessionStorage.getItem("ai-provider") || "local") === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => {
                          sessionStorage.setItem("ai-provider", opt.value);
                          window.location.reload();
                        }}
                        className={`flex-1 p-4 rounded-lg border-2 text-left transition-all ${
                          selected
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <span className={`text-sm font-semibold ${selected ? "text-blue-700" : "text-gray-700"}`}>
                          {opt.label}
                        </span>
                        <p className="text-[11px] text-gray-500 mt-1">{opt.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Language */}
              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <h3 className="text-sm font-semibold text-gray-800 mb-3">Language</h3>
                <p className="text-xs text-gray-500 mb-4">Choose the interface language.</p>
                <div className="flex gap-3">
                  {[
                    { value: "en", label: "English", flag: "EN" },
                    { value: "ar", label: "Arabic", flag: "AR" },
                  ].map((opt) => {
                    const selected = (localStorage.getItem("zatca-lang") || "en") === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => {
                          localStorage.setItem("zatca-lang", opt.value);
                          window.location.reload();
                        }}
                        className={`flex-1 p-4 rounded-lg border-2 text-left transition-all ${
                          selected
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <span className={`text-sm font-semibold ${selected ? "text-blue-700" : "text-gray-700"}`}>
                          {opt.flag} — {opt.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
