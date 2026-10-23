"use client";

import React, { useState, useMemo } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  Plus,
  CheckCircle2,
  Clock,
  Sparkles,
  GitMerge,
  Search,
  ChevronsUpDown,
  BookOpen,
  FolderTree,
  AlertCircle,
  Save,
  Check,
  X,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";
import type { TopicTree, TopicUnit, TopicChapter, TopicConcept, TopicStatus } from "@/types";
import { TreeUnit } from "./tree-unit";
import { TreeChapter } from "./tree-chapter";
import { TreeConcept } from "./tree-concept";
import { StatusChip } from "./status-chip";
import { useTopicTree } from "@/hooks/useTopicTree";
import { cn } from "@/lib/utils";

export interface TopicTreeEditorProps {
  subjectId: string;
  treeHook?: ReturnType<typeof useTopicTree>;
  initialData?: TopicTree;
  onConfirmSuccess?: () => void;
  className?: string;
}

interface ActiveDragData {
  id: string;
  level: "unit" | "chapter" | "concept";
  item: TopicUnit | TopicChapter | TopicConcept;
  unitId?: string;
  chapterId?: string;
}

export function TopicTreeEditor({
  subjectId,
  treeHook,
  onConfirmSuccess,
  className,
}: TopicTreeEditorProps) {
  const internalHook = useTopicTree(subjectId);
  const {
    tree,
    isLoading,
    isDirty,
    isSaving,
    isConfirming,
    isConfirmed,
    lastSavedAt,
    reorderUnits,
    reorderChapters,
    reorderConcepts,
    renameItem,
    deleteItem,
    addItem,
    mergeChapters,
    updateStatus,
    confirmTree,
    saveTreeNow,
  } = treeHook || internalHook;

  // Drag and drop state
  const [activeDragItem, setActiveDragItem] = useState<ActiveDragData | null>(null);

  // Chapter selection for merge
  const [selectedChapterIds, setSelectedChapterIds] = useState<Set<string>>(new Set());

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");

  // Expand / collapse all state
  const [expandedUnitIds, setExpandedUnitIds] = useState<Set<string>>(new Set());
  const [expandedChapterIds, setExpandedChapterIds] = useState<Set<string>>(new Set());
  const [allExpanded, setAllExpanded] = useState<boolean | null>(null);

  // Initialize/track expand states
  const units = useMemo(() => tree?.units || [], [tree?.units]);
  const unitIds = useMemo(() => units.map((u) => u.id), [units]);

  // Configure DnD Sensors with a small distance constraint to prevent accidental drags
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle Drag Start
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const data = active.data.current as ActiveDragData | undefined;
    if (data) {
      setActiveDragItem(data);
    }
  };

  // Handle Drag End
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragItem(null);

    if (!over || active.id === over.id) return;

    const activeData = active.data.current as ActiveDragData | undefined;
    if (!activeData) return;

    const { level, unitId, chapterId } = activeData;

    if (level === "unit") {
      reorderUnits(String(active.id), String(over.id));
    } else if (level === "chapter" && unitId) {
      reorderChapters(unitId, String(active.id), String(over.id));
    } else if (level === "concept" && chapterId) {
      reorderConcepts(chapterId, String(active.id), String(over.id));
    }
  };

  // Toggle chapter selection for merge
  const handleToggleSelectChapter = (chapterId: string) => {
    setSelectedChapterIds((prev) => {
      const next = new Set(prev);
      if (next.has(chapterId)) {
        next.delete(chapterId);
      } else {
        next.add(chapterId);
      }
      return next;
    });
  };

  const handleClearSelection = () => {
    setSelectedChapterIds(new Set());
  };

  const handleMergeSelected = () => {
    if (selectedChapterIds.size >= 2) {
      mergeChapters(Array.from(selectedChapterIds));
      setSelectedChapterIds(new Set());
    }
  };

  // Expand / Collapse All
  const handleToggleExpandAll = () => {
    if (allExpanded) {
      setExpandedUnitIds(new Set());
      setExpandedChapterIds(new Set());
      setAllExpanded(false);
    } else {
      const allU = new Set(units.map((u) => u.id));
      const allC = new Set<string>();
      units.forEach((u) => u.chapters.forEach((c) => allC.add(c.id)));
      setExpandedUnitIds(allU);
      setExpandedChapterIds(allC);
      setAllExpanded(true);
    }
  };

  const handleConfirmSyllabus = async () => {
    try {
      await confirmTree();
      onConfirmSuccess?.();
    } catch {
      // Toast is already triggered inside hook
    }
  };

  // Filtered units based on search query
  const filteredUnits = useMemo(() => {
    if (!searchQuery.trim()) return units;

    const q = searchQuery.toLowerCase().trim();
    return units
      .map((unit) => {
        const unitMatches = unit.title.toLowerCase().includes(q);
        const matchingChapters = unit.chapters.filter((chapter) => {
          const chapMatches = chapter.title.toLowerCase().includes(q);
          const hasMatchingConcept = chapter.concepts.some((cp) =>
            cp.title.toLowerCase().includes(q)
          );
          return chapMatches || hasMatchingConcept;
        });

        if (unitMatches || matchingChapters.length > 0) {
          return {
            ...unit,
            chapters: unitMatches ? unit.chapters : matchingChapters,
          };
        }
        return null;
      })
      .filter((u): u is TopicUnit => u !== null);
  }, [units, searchQuery]);

  // Statistics calculation
  const totalChapters = useMemo(
    () => units.reduce((acc, u) => acc + (u.chapters?.length || 0), 0),
    [units]
  );
  const totalConcepts = useMemo(
    () =>
      units.reduce(
        (acc, u) =>
          acc + u.chapters.reduce((cAcc, c) => cAcc + (c.concepts?.length || 0), 0),
        0
      ),
    [units]
  );

  const statusCounts = useMemo(() => {
    const counts = { not_started: 0, studied: 0, revised: 0, tested: 0 };
    units.forEach((u) =>
      u.chapters.forEach((c) => {
        if (c.status in counts) {
          counts[c.status]++;
        } else {
          counts.not_started++;
        }
      })
    );
    return counts;
  }, [units]);

  return (
    <div className={cn("space-y-6", className)}>
      {/* ─── Top Control Toolbar ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-2xl border border-border bg-card shadow-xs">
        {/* Left: Search input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter units, chapters, concepts..."
            className="w-full pl-9 pr-8 py-1.5 text-xs rounded-xl border border-input bg-background/50 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:bg-background transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Right: Actions (Expand All, Add Unit, Save Status) */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Auto-save Status Pill */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/60 text-[11px] font-medium text-muted-foreground select-none">
            {isSaving ? (
              <>
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span className="text-foreground">Saving...</span>
              </>
            ) : isDirty ? (
              <>
                <Clock className="h-3 w-3 text-amber-500" />
                <span className="text-amber-600 dark:text-amber-400">Unsaved changes</span>
                <button
                  type="button"
                  onClick={() => saveTreeNow()}
                  className="ml-1 text-primary hover:underline font-semibold cursor-pointer"
                >
                  Save now
                </button>
              </>
            ) : (
              <>
                <Check className="h-3 w-3 text-emerald-500" />
                <span>
                  Saved{lastSavedAt ? ` ${lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ""}
                </span>
              </>
            )}
          </div>

          {/* Toggle Expand / Collapse All */}
          <button
            type="button"
            onClick={handleToggleExpandAll}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
            title="Expand or collapse all units and chapters"
          >
            <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="hidden sm:inline">
              {allExpanded ? "Collapse All" : "Expand All"}
            </span>
          </button>

          {/* Add Unit Button */}
          <button
            type="button"
            onClick={() => addItem(null, "unit")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Unit</span>
          </button>
        </div>
      </div>

      {/* ─── Topic Stats Summary Bar ───────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl border border-border bg-card/60 shadow-2xs">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            Total Structure
          </p>
          <p className="text-lg font-bold text-foreground mt-0.5">
            {units.length} <span className="text-xs font-normal text-muted-foreground">units</span> · {totalChapters} <span className="text-xs font-normal text-muted-foreground">chapters</span>
          </p>
        </div>

        <div className="p-3 rounded-xl border border-border bg-card/60 shadow-2xs">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            Total Concepts
          </p>
          <p className="text-lg font-bold text-foreground mt-0.5">
            {totalConcepts} <span className="text-xs font-normal text-muted-foreground">key topics</span>
          </p>
        </div>

        <div className="p-3 rounded-xl border border-border bg-card/60 shadow-2xs col-span-2">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
            Mastery Progress
          </p>
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-medium text-[11px]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {statusCounts.revised} Revised
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 font-medium text-[11px]">
              <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
              {statusCounts.tested} Tested
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-medium text-[11px]">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              {statusCounts.studied} Studied
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-medium text-[11px]">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
              {statusCounts.not_started} Not Started
            </span>
          </div>
        </div>
      </div>

      {/* ─── Floating Merge Chapters Banner (when >= 2 selected) ───────── */}
      {selectedChapterIds.size > 0 && (
        <div className="sticky top-20 z-40 flex items-center justify-between gap-4 p-3.5 rounded-xl border border-primary/40 bg-card shadow-lg ring-1 ring-primary/20 animate-in fade-in-0 slide-in-from-top-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <GitMerge className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">
                {selectedChapterIds.size} {selectedChapterIds.size === 1 ? "chapter" : "chapters"} selected
              </p>
              <p className="text-[11px] text-muted-foreground">
                {selectedChapterIds.size >= 2
                  ? "Combine these into a single comprehensive chapter"
                  : "Select at least 2 chapters to merge"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleMergeSelected}
              disabled={selectedChapterIds.size < 2}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer",
                selectedChapterIds.size >= 2
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-muted text-muted-foreground cursor-not-allowed opacity-60"
              )}
            >
              <GitMerge className="h-3.5 w-3.5" />
              <span>Merge Selected</span>
            </button>
            <button
              type="button"
              onClick={handleClearSelection}
              className="px-2.5 py-1.5 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ─── Main Dnd Drag and Drop Tree ───────────────────────────────── */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={unitIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-4">
            {filteredUnits.map((unit) => (
              <TreeUnit
                key={unit.id}
                unit={unit}
                selectedChapterIds={selectedChapterIds}
                onToggleSelectChapter={handleToggleSelectChapter}
                onRename={renameItem}
                onDelete={deleteItem}
                onStatusChange={updateStatus}
                onAddChapter={(uId) => addItem(uId, "chapter")}
                onAddConcept={(cId) => addItem(cId, "concept")}
                onRenameConcept={(cpId, newTitle) => renameItem(cpId, "concept", newTitle)}
                onDeleteConcept={(cpId) => deleteItem(cpId, "concept")}
                isExpanded={
                  allExpanded !== null
                    ? allExpanded
                    : expandedUnitIds.has(unit.id) || expandedUnitIds.size === 0
                }
                onToggleExpand={() => {
                  setExpandedUnitIds((prev) => {
                    const next = new Set(prev);
                    if (next.has(unit.id)) {
                      next.delete(unit.id);
                    } else {
                      next.add(unit.id);
                    }
                    return next;
                  });
                }}
              />
            ))}

            {/* Empty Tree State */}
            {filteredUnits.length === 0 && (
              <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-border bg-card/50">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-4">
                  <FolderTree className="h-6 w-6" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-1">
                  {searchQuery ? "No matching topics found" : "No syllabus units yet"}
                </h3>
                <p className="text-xs text-muted-foreground max-w-sm mb-5 leading-relaxed">
                  {searchQuery
                    ? `No units or chapters matched "${searchQuery}". Clear your search query to see all topics.`
                    : "Get started by adding your first unit, or upload a syllabus to automatically generate this topic hierarchy."}
                </p>
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
                  >
                    Clear Filter
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => addItem(null, "unit")}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-sm cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    Add First Unit
                  </button>
                )}
              </div>
            )}
          </div>
        </SortableContext>

        {/* Drag Overlay for Smooth Elevation */}
        <DragOverlay>
          {activeDragItem ? (
            <div className="rounded-xl border-2 border-primary bg-card p-3 shadow-2xl ring-4 ring-primary/20 opacity-95">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-primary">
                  {activeDragItem.level}
                </span>
                <span className="text-sm font-semibold text-foreground truncate">
                  {activeDragItem.item.title}
                </span>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* ─── Prominent Bottom Confirm Syllabus Action Bar ─────────────── */}
      <div className="sticky bottom-4 z-20 mt-8 rounded-2xl border border-border/80 bg-card/90 backdrop-blur-md p-4 sm:p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                Syllabus Confirmation
                {isConfirmed && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 text-[10px] font-semibold border border-emerald-200 dark:border-emerald-800">
                    <CheckCircle2 className="h-3 w-3" /> Confirmed
                  </span>
                )}
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Confirming locks the hierarchical tree for AI-generated study notes, formulas, and mock exams.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {isDirty && (
              <button
                type="button"
                onClick={() => saveTreeNow()}
                disabled={isSaving}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl border border-border text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                <Save className="h-3.5 w-3.5" />
                <span>Save Now</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleConfirmSyllabus}
              disabled={isConfirming || (isConfirmed && !isDirty)}
              className={cn(
                "flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer",
                isConfirmed && !isDirty
                  ? "bg-muted text-muted-foreground cursor-default border border-border"
                  : "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-primary/20 active:scale-[0.98]"
              )}
            >
              {isConfirming ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  <span>Confirming...</span>
                </>
              ) : isConfirmed && !isDirty ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>Syllabus Confirmed</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>{isDirty ? "Save & Confirm Syllabus" : "Confirm Syllabus"}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
