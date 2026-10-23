"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  GripVertical,
  ChevronDown,
  ChevronRight,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  BookOpen,
} from "lucide-react";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { TopicUnit, TopicStatus } from "@/types";
import { SortableItem, SortableHandle } from "./sortable-item";
import { TreeChapter } from "./tree-chapter";
import { cn } from "@/lib/utils";

export interface TreeUnitProps {
  unit: TopicUnit;
  selectedChapterIds: Set<string>;
  onToggleSelectChapter: (chapterId: string) => void;
  onRename: (id: string, level: "unit" | "chapter", newTitle: string) => void;
  onDelete: (id: string, level: "unit" | "chapter") => void;
  onStatusChange: (chapterId: string, status: TopicStatus) => void;
  onAddChapter: (unitId: string) => void;
  onAddConcept: (chapterId: string) => void;
  onRenameConcept: (conceptId: string, newTitle: string) => void;
  onDeleteConcept: (conceptId: string) => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  className?: string;
}

export function TreeUnit({
  unit,
  selectedChapterIds,
  onToggleSelectChapter,
  onRename,
  onDelete,
  onStatusChange,
  onAddChapter,
  onAddConcept,
  onRenameConcept,
  onDeleteConcept,
  isExpanded: controlledExpanded,
  onToggleExpand,
  className,
}: TreeUnitProps) {
  // Local expand state if uncontrolled
  const [internalExpanded, setInternalExpanded] = useState(true);
  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;
  const toggleExpand = () => {
    if (onToggleExpand) {
      onToggleExpand();
    } else {
      setInternalExpanded((prev) => !prev);
    }
  };

  const [isEditing, setIsEditing] = useState(false);
  const [titleValue, setTitleValue] = useState(unit.title);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync external title if changed
  useEffect(() => {
    setTitleValue(unit.title);
  }, [unit.title]);

  // Focus and select input on entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSaveTitle = () => {
    const trimmed = titleValue.trim();
    if (trimmed && trimmed !== unit.title) {
      onRename(unit.id, "unit", trimmed);
    } else {
      setTitleValue(unit.title);
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setTitleValue(unit.title);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSaveTitle();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancelEdit();
    }
  };

  const chapters = Array.isArray(unit.chapters) ? unit.chapters : [];
  const chapterIds = chapters.map((c) => c.id);
  const totalConcepts = chapters.reduce((sum, c) => sum + (c.concepts?.length || 0), 0);

  return (
    <SortableItem
      id={unit.id}
      data={{ level: "unit", item: unit }}
      className={cn("group/unit", className)}
    >
      <div
        className={cn(
          "rounded-2xl border border-border bg-card shadow-xs transition-all duration-200 overflow-hidden",
          showConfirmDelete && "border-destructive/40 bg-destructive/[0.02]"
        )}
      >
        {/* Unit Top Header */}
        <div
          className={cn(
            "flex items-center justify-between gap-3 px-4 py-3.5 bg-muted/30 border-b border-border/70 transition-colors",
            "hover:bg-muted/50"
          )}
        >
          {/* Left: Drag Handle, Chevron, Unit Icon, Title */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {/* Drag Handle */}
            <SortableHandle className="text-muted-foreground/50 hover:text-foreground">
              <GripVertical className="h-4.5 w-4.5" />
            </SortableHandle>

            {/* Expand / Collapse Toggle */}
            <button
              type="button"
              onClick={toggleExpand}
              aria-expanded={isExpanded}
              aria-label={isExpanded ? "Collapse unit" : "Expand unit"}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer shrink-0"
            >
              {isExpanded ? (
                <ChevronDown className="h-4.5 w-4.5" />
              ) : (
                <ChevronRight className="h-4.5 w-4.5" />
              )}
            </button>

            {/* Unit Indicator Badge / Icon */}
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
              <BookOpen className="h-4 w-4" />
            </div>

            {/* Title / Inline Rename */}
            {isEditing ? (
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <input
                  ref={inputRef}
                  type="text"
                  value={titleValue}
                  onChange={(e) => setTitleValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={handleSaveTitle}
                  className="w-full bg-background border border-input rounded-md px-3 py-1 text-sm sm:text-base font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Unit title..."
                />
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSaveTitle();
                  }}
                  className="p-1.5 rounded-md text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                  aria-label="Save unit title"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleCancelEdit();
                  }}
                  className="p-1.5 rounded-md text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
                  aria-label="Cancel editing"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 min-w-0 flex-1 flex-wrap">
                <h3
                  onDoubleClick={() => setIsEditing(true)}
                  className="text-sm sm:text-base font-semibold text-foreground truncate cursor-pointer hover:text-primary transition-colors select-none"
                  title="Double click to edit title"
                >
                  {unit.title}
                </h3>

                {/* Chapter Count Badge */}
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center rounded-md bg-secondary/80 px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                    {chapters.length} {chapters.length === 1 ? "chapter" : "chapters"}
                  </span>
                  <span className="hidden sm:inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {totalConcepts} {totalConcepts === 1 ? "concept" : "concepts"}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Right: Inline Delete Confirmation OR Unit Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            {showConfirmDelete ? (
              <div className="flex items-center gap-1.5 animate-in fade-in-0 duration-150">
                <span className="text-xs font-medium text-destructive hidden sm:inline">
                  Delete unit & {chapters.length} chapters?
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setShowConfirmDelete(false);
                    onDelete(unit.id, "unit");
                  }}
                  className="px-2.5 py-1 rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                >
                  Delete Unit
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirmDelete(false)}
                  className="px-2 py-1 rounded-md bg-muted text-muted-foreground hover:text-foreground text-xs font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              !isEditing && (
                <div className="flex items-center gap-1">
                  {/* Add Chapter Button */}
                  <button
                    type="button"
                    onClick={() => {
                      onAddChapter(unit.id);
                      if (!isExpanded) toggleExpand();
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-card border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted hover:border-border/80 transition-colors shadow-xs cursor-pointer"
                    title="Add a new chapter to this unit"
                  >
                    <Plus className="h-3.5 w-3.5 text-primary" />
                    <span>Add Chapter</span>
                  </button>

                  {/* Edit Unit Button */}
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                    title="Rename unit"
                    aria-label={`Rename ${unit.title}`}
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>

                  {/* Delete Unit Button */}
                  <button
                    type="button"
                    onClick={() => setShowConfirmDelete(true)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                    title="Delete unit"
                    aria-label={`Delete ${unit.title}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )
            )}
          </div>
        </div>

        {/* Collapsible Unit Body (Chapters List) */}
        {isExpanded && (
          <div className="p-3 sm:p-4 space-y-2.5 bg-background/50">
            <SortableContext items={chapterIds} strategy={verticalListSortingStrategy}>
              <div className="space-y-2.5">
                {chapters.map((chapter) => (
                  <TreeChapter
                    key={chapter.id}
                    chapter={chapter}
                    unitId={unit.id}
                    isSelected={selectedChapterIds.has(chapter.id)}
                    onToggleSelect={onToggleSelectChapter}
                    onRename={onRename}
                    onDelete={onDelete}
                    onStatusChange={onStatusChange}
                    onAddConcept={onAddConcept}
                    onRenameConcept={onRenameConcept}
                    onDeleteConcept={onDeleteConcept}
                  />
                ))}

                {/* Empty State for Unit */}
                {chapters.length === 0 && (
                  <div className="flex flex-col items-center justify-center p-6 text-center rounded-xl border border-dashed border-border bg-card/40">
                    <p className="text-xs text-muted-foreground mb-3">
                      No chapters in this unit yet.
                    </p>
                    <button
                      type="button"
                      onClick={() => onAddChapter(unit.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Chapter
                    </button>
                  </div>
                )}
              </div>
            </SortableContext>
          </div>
        )}
      </div>
    </SortableItem>
  );
}
