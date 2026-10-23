"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  GripVertical,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Folder,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Layers,
} from "lucide-react";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { TopicChapter, TopicStatus } from "@/types";
import { SortableItem, SortableHandle } from "./sortable-item";
import { StatusChip } from "./status-chip";
import { TreeConcept } from "./tree-concept";
import { cn } from "@/lib/utils";

export interface TreeChapterProps {
  chapter: TopicChapter;
  unitId: string;
  isSelected?: boolean;
  onToggleSelect?: (chapterId: string) => void;
  onRename: (id: string, level: "chapter", newTitle: string) => void;
  onDelete: (id: string, level: "chapter") => void;
  onStatusChange: (chapterId: string, status: TopicStatus) => void;
  onAddConcept: (chapterId: string) => void;
  onRenameConcept: (conceptId: string, newTitle: string) => void;
  onDeleteConcept: (conceptId: string) => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  className?: string;
}

export function TreeChapter({
  chapter,
  unitId,
  isSelected = false,
  onToggleSelect,
  onRename,
  onDelete,
  onStatusChange,
  onAddConcept,
  onRenameConcept,
  onDeleteConcept,
  isExpanded: controlledExpanded,
  onToggleExpand,
  className,
}: TreeChapterProps) {
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
  const [titleValue, setTitleValue] = useState(chapter.title);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync external title if changed
  useEffect(() => {
    setTitleValue(chapter.title);
  }, [chapter.title]);

  // Focus and select input on entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSaveTitle = () => {
    const trimmed = titleValue.trim();
    if (trimmed && trimmed !== chapter.title) {
      onRename(chapter.id, "chapter", trimmed);
    } else {
      setTitleValue(chapter.title);
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setTitleValue(chapter.title);
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

  const concepts = Array.isArray(chapter.concepts) ? chapter.concepts : [];
  const conceptIds = concepts.map((c) => c.id);

  return (
    <SortableItem
      id={chapter.id}
      data={{ level: "chapter", item: chapter, unitId }}
      className={cn("group/chapter", className)}
    >
      <div
        className={cn(
          "rounded-xl border border-border/80 bg-card transition-all duration-200 overflow-hidden shadow-xs",
          isSelected && "border-primary/60 ring-1 ring-primary/20 bg-primary/[0.02]",
          showConfirmDelete && "border-destructive/40 bg-destructive/[0.02]"
        )}
      >
        {/* Chapter Header Bar */}
        <div
          className={cn(
            "flex items-center justify-between gap-3 px-3 py-2.5 transition-colors",
            "hover:bg-muted/30",
            isSelected && "bg-primary/[0.04]"
          )}
        >
          {/* Left: Drag Handle, Select Checkbox, Chevron, Chapter Icon, Title */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {/* Drag Handle */}
            <SortableHandle className="text-muted-foreground/40 hover:text-foreground">
              <GripVertical className="h-4 w-4" />
            </SortableHandle>

            {/* Checkbox for Merge Multi-select */}
            {onToggleSelect && (
              <label
                className="relative flex items-center justify-center cursor-pointer p-0.5"
                onClick={(e) => e.stopPropagation()}
                title="Select to merge with other chapters"
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggleSelect(chapter.id)}
                  aria-label={`Select ${chapter.title} for merge`}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30 cursor-pointer accent-primary"
                />
              </label>
            )}

            {/* Expand / Collapse Chevron */}
            <button
              type="button"
              onClick={toggleExpand}
              aria-expanded={isExpanded}
              aria-label={isExpanded ? "Collapse concepts" : "Expand concepts"}
              className="p-1 rounded-md text-muted-foreground/70 hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer shrink-0"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>

            {/* Chapter Folder Icon */}
            <div className="shrink-0 text-muted-foreground">
              {isExpanded ? (
                <FolderOpen className="h-4 w-4 text-primary" />
              ) : (
                <Folder className="h-4 w-4" />
              )}
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
                  className="w-full bg-background border border-input rounded-md px-2.5 py-1 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Chapter title..."
                />
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSaveTitle();
                  }}
                  className="p-1 rounded-md text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                  aria-label="Save chapter title"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleCancelEdit();
                  }}
                  className="p-1 rounded-md text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
                  aria-label="Cancel editing"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span
                  onDoubleClick={() => setIsEditing(true)}
                  className="text-sm font-medium text-foreground truncate cursor-pointer hover:text-primary transition-colors select-none"
                  title="Double click to edit title"
                >
                  {chapter.title}
                </span>

                {/* Concept count badge */}
                <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground shrink-0">
                  <Layers className="h-3 w-3" />
                  {concepts.length} {concepts.length === 1 ? "concept" : "concepts"}
                </span>
              </div>
            )}
          </div>

          {/* Right: Status Chip + Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Status Chip */}
            <StatusChip
              status={chapter.status}
              onChange={(newStatus) => onStatusChange(chapter.id, newStatus)}
              size="sm"
            />

            {/* Inline Delete Confirmation OR Chapter Controls */}
            {showConfirmDelete ? (
              <div className="flex items-center gap-1.5 animate-in fade-in-0 duration-150 pl-1">
                <span className="text-xs font-medium text-destructive hidden sm:inline">
                  Delete chapter?
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setShowConfirmDelete(false);
                    onDelete(chapter.id, "chapter");
                  }}
                  className="px-2 py-1 rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Delete
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
                <div className="flex items-center gap-0.5 opacity-90 sm:opacity-0 group-hover/chapter:opacity-100 focus-within:opacity-100 transition-opacity">
                  {/* Add Concept button */}
                  <button
                    type="button"
                    onClick={() => {
                      onAddConcept(chapter.id);
                      if (!isExpanded) toggleExpand();
                    }}
                    className="inline-flex items-center gap-1 p-1 sm:px-2 sm:py-1 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                    title="Add new concept to chapter"
                    aria-label={`Add concept to ${chapter.title}`}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span className="hidden md:inline">Concept</span>
                  </button>

                  {/* Edit button */}
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="p-1 rounded-md text-muted-foreground/70 hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                    title="Rename chapter"
                    aria-label={`Rename ${chapter.title}`}
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>

                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={() => setShowConfirmDelete(true)}
                    className="p-1 rounded-md text-muted-foreground/70 hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                    title="Delete chapter"
                    aria-label={`Delete ${chapter.title}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )
            )}
          </div>
        </div>

        {/* Collapsible Concepts List */}
        {isExpanded && (
          <div className="border-t border-border/50 bg-muted/15 px-3 py-2 sm:pl-9 sm:pr-4">
            <SortableContext items={conceptIds} strategy={verticalListSortingStrategy}>
              <div className="space-y-1">
                {concepts.map((concept) => (
                  <TreeConcept
                    key={concept.id}
                    concept={concept}
                    chapterId={chapter.id}
                    onRename={onRenameConcept}
                    onDelete={onDeleteConcept}
                  />
                ))}

                {/* Empty State inside chapter */}
                {concepts.length === 0 && (
                  <div className="flex items-center justify-between py-2 px-3 rounded-lg border border-dashed border-border/70 text-xs text-muted-foreground">
                    <span>No concepts in this chapter yet.</span>
                    <button
                      type="button"
                      onClick={() => onAddConcept(chapter.id)}
                      className="inline-flex items-center gap-1 text-primary hover:underline font-medium cursor-pointer"
                    >
                      <Plus className="h-3 w-3" />
                      Add first concept
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
