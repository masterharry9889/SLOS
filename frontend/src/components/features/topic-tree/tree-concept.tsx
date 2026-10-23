"use client";

import React, { useState, useRef, useEffect } from "react";
import { GripVertical, Edit2, Trash2, Check, X, FileText } from "lucide-react";
import type { TopicConcept } from "@/types";
import { SortableItem, SortableHandle } from "./sortable-item";
import { cn } from "@/lib/utils";

export interface TreeConceptProps {
  concept: TopicConcept;
  chapterId: string;
  onRename: (conceptId: string, newTitle: string) => void;
  onDelete: (conceptId: string) => void;
  className?: string;
}

export function TreeConcept({
  concept,
  chapterId,
  onRename,
  onDelete,
  className,
}: TreeConceptProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [titleValue, setTitleValue] = useState(concept.title);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync external title if changed
  useEffect(() => {
    setTitleValue(concept.title);
  }, [concept.title]);

  // Focus and select input on editing mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSaveTitle = () => {
    const trimmed = titleValue.trim();
    if (trimmed && trimmed !== concept.title) {
      onRename(concept.id, trimmed);
    } else {
      setTitleValue(concept.title);
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setTitleValue(concept.title);
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

  return (
    <SortableItem
      id={concept.id}
      data={{ level: "concept", item: concept, chapterId }}
      className={cn("group/concept", className)}
    >
      <div
        className={cn(
          "flex items-center justify-between gap-2.5 py-1.5 px-3 rounded-lg border border-transparent transition-all duration-150 text-xs",
          "hover:bg-muted/40 hover:border-border/60 bg-card/40",
          isEditing && "bg-muted/60 border-primary/40 ring-1 ring-primary/20",
          showConfirmDelete && "bg-destructive/10 border-destructive/30"
        )}
      >
        {/* Left Side: Drag Handle, Icon, and Title */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* Drag Handle */}
          <SortableHandle className="text-muted-foreground/40 hover:text-foreground">
            <GripVertical className="h-3.5 w-3.5" />
          </SortableHandle>

          {/* Leaf Node Icon */}
          <FileText className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />

          {/* Title or Inline Edit Input */}
          {isEditing ? (
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <input
                ref={inputRef}
                type="text"
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleSaveTitle}
                className="w-full bg-background border border-input rounded px-2 py-0.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="Concept title..."
              />
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSaveTitle();
                }}
                className="p-1 rounded text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                aria-label="Save title"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleCancelEdit();
                }}
                className="p-1 rounded text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
                aria-label="Cancel editing"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <span
              onDoubleClick={() => setIsEditing(true)}
              className="text-foreground/90 font-normal truncate cursor-pointer hover:text-foreground transition-colors select-none"
              title="Double click to edit title"
            >
              {concept.title}
            </span>
          )}
        </div>

        {/* Right Side: Inline Delete Confirmation OR Action Buttons */}
        <div className="flex items-center gap-1 shrink-0">
          {showConfirmDelete ? (
            <div className="flex items-center gap-1.5 animate-in fade-in-0 duration-150">
              <span className="text-[11px] font-medium text-destructive">
                Delete?
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowConfirmDelete(false);
                  onDelete(concept.id);
                }}
                className="px-1.5 py-0.5 rounded bg-destructive text-destructive-foreground hover:bg-destructive/90 text-[10px] font-semibold transition-colors cursor-pointer"
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => setShowConfirmDelete(false)}
                className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground hover:text-foreground text-[10px] font-medium transition-colors cursor-pointer"
              >
                No
              </button>
            </div>
          ) : (
            !isEditing && (
              <div className="flex items-center gap-1 opacity-0 group-hover/concept:opacity-100 focus-within:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="p-1 rounded text-muted-foreground/60 hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                  title="Rename concept"
                  aria-label={`Rename ${concept.title}`}
                >
                  <Edit2 className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirmDelete(true)}
                  className="p-1 rounded text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                  title="Delete concept"
                  aria-label={`Delete ${concept.title}`}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            )
          )}
        </div>
      </div>
    </SortableItem>
  );
}
