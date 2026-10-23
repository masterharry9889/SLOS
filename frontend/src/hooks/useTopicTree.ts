"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { arrayMove } from "@dnd-kit/sortable";
import type {
  TopicTree,
  TopicUnit,
  TopicChapter,
  TopicConcept,
  TopicStatus,
  SourceSpan,
} from "@/types";
import {
  getTopicTree,
  updateTopicTree,
  updateTopicStatus,
  confirmTopicTree,
} from "@/lib/api/endpoints";
import { useToast } from "@/components/ui/toaster";

function uid(prefix = "item"): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
}

// Ensure tree structure is safe and consistent
function normalizeTopicTree(raw: unknown, defaultTitle = "Syllabus Topics"): TopicTree {
  if (!raw || typeof raw !== "object") {
    return {
      subject_title: defaultTitle,
      source_type: "syllabus",
      units: [],
    };
  }

  const r = raw as Record<string, unknown>;
  const subject_title =
    (typeof r.subject_title === "string" && r.subject_title) ||
    (typeof r.subjectTitle === "string" && r.subjectTitle) ||
    defaultTitle;

  const source_type =
    r.source_type === "content" || r.sourceType === "content" ? "content" : "syllabus";

  const rawUnits = Array.isArray(r.units) ? r.units : [];

  const units: TopicUnit[] = rawUnits.map((u: unknown, uIdx: number) => {
    const unitRecord = (u && typeof u === "object" ? u : {}) as Record<string, unknown>;
    const rawChapters = Array.isArray(unitRecord.chapters) ? unitRecord.chapters : [];

    const chapters: TopicChapter[] = rawChapters.map((c: unknown, cIdx: number) => {
      const chapRecord = (c && typeof c === "object" ? c : {}) as Record<string, unknown>;
      const rawConcepts = Array.isArray(chapRecord.concepts) ? chapRecord.concepts : [];

      const concepts: TopicConcept[] = rawConcepts.map((cp: unknown, cpIdx: number) => {
        const cpRecord = (cp && typeof cp === "object" ? cp : {}) as Record<string, unknown>;
        return {
          id: String(cpRecord.id || uid(`concept-${uIdx}-${cIdx}-${cpIdx}`)),
          title: String(cpRecord.title || `Concept ${cpIdx + 1}`),
        };
      });

      const rawSpans = chapRecord.source_spans || chapRecord.sourceSpans;
      const source_spans: SourceSpan[] = Array.isArray(rawSpans)
        ? (rawSpans as SourceSpan[])
        : [];

      const rawStatus = chapRecord.status;
      const status: TopicStatus =
        rawStatus === "studied" ||
        rawStatus === "revised" ||
        rawStatus === "tested" ||
        rawStatus === "not_started"
          ? rawStatus
          : "not_started";

      return {
        id: String(chapRecord.id || uid(`chap-${uIdx}-${cIdx}`)),
        title: String(chapRecord.title || `Chapter ${cIdx + 1}`),
        concepts,
        source_spans,
        status,
        order: typeof chapRecord.order === "number" ? chapRecord.order : cIdx + 1,
      };
    });

    return {
      id: String(unitRecord.id || uid(`unit-${uIdx}`)),
      title: String(unitRecord.title || `Unit ${uIdx + 1}`),
      chapters,
      order: typeof unitRecord.order === "number" ? unitRecord.order : uIdx + 1,
    };
  });

  return {
    subject_title,
    source_type,
    units,
  };
}

export function useTopicTree(subjectId: string) {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const [tree, setTree] = useState<TopicTree | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  // References to prevent stale closures in async debounce timers
  const treeRef = useRef<TopicTree | null>(tree);
  treeRef.current = tree;

  const isDirtyRef = useRef<boolean>(isDirty);
  isDirtyRef.current = isDirty;

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Fetch Topic Tree Data
  const query = useQuery({
    queryKey: ["topic-tree", subjectId],
    queryFn: async () => {
      const data = await getTopicTree(subjectId);
      return normalizeTopicTree(data);
    },
    enabled: !!subjectId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Sync server data to local tree state when initially fetched or query updates while clean
  useEffect(() => {
    if (query.data && !isDirtyRef.current) {
      setTree(query.data);
      // Check if confirmed in server data
      const raw = query.data as unknown as Record<string, unknown>;
      if (raw.confirmed || raw.is_confirmed) {
        setIsConfirmed(true);
      }
    }
  }, [query.data]);

  // 2. Mutation for Saving Topic Tree
  const saveMutation = useMutation({
    mutationFn: async (treeToSave: TopicTree) => {
      setIsSaving(true);
      const res = await updateTopicTree(subjectId, treeToSave);
      return res;
    },
    onSuccess: (savedTree) => {
      setIsSaving(false);
      setIsDirty(false);
      setLastSavedAt(new Date());
      queryClient.setQueryData(["topic-tree", subjectId], savedTree);
    },
    onError: (err: unknown) => {
      setIsSaving(false);
      const message = err instanceof Error ? err.message : "Failed to save topic tree";
      addToast(message, "error", "Auto-save failed");
    },
  });

  // 3. Mutation for Confirming Topic Tree
  const confirmMutation = useMutation({
    mutationFn: async () => {
      // If there are unsaved changes, save them first
      if (isDirtyRef.current && treeRef.current) {
        await updateTopicTree(subjectId, treeRef.current);
        setIsDirty(false);
        setLastSavedAt(new Date());
      }
      return confirmTopicTree(subjectId);
    },
    onSuccess: (data) => {
      setIsConfirmed(true);
      queryClient.invalidateQueries({ queryKey: ["topic-tree", subjectId] });
      queryClient.invalidateQueries({ queryKey: ["subjects", subjectId] });
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      addToast(data.message || "Syllabus confirmed successfully!", "success", "Syllabus Confirmed");
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "Failed to confirm syllabus";
      addToast(message, "error", "Confirmation Error");
    },
  });

  // Autosave trigger with 2-second debounce
  const triggerAutoSave = useCallback(
    (newTree: TopicTree) => {
      setIsDirty(true);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        saveMutation.mutate(newTree);
      }, 2000);
    },
    [saveMutation]
  );

  // Immediate save helper
  const saveTreeNow = useCallback(async () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (treeRef.current) {
      return saveMutation.mutateAsync(treeRef.current);
    }
  }, [saveMutation]);

  // Clean up debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // ─── Tree Modification Actions ──────────────────────────────────────────

  // Reorder Units
  const reorderUnits = useCallback(
    (activeId: string, overId: string) => {
      if (!treeRef.current || activeId === overId) return;

      const units = [...treeRef.current.units];
      const oldIndex = units.findIndex((u) => u.id === activeId);
      const newIndex = units.findIndex((u) => u.id === overId);

      if (oldIndex === -1 || newIndex === -1) return;

      const newUnits = arrayMove(units, oldIndex, newIndex).map((unit, index) => ({
        ...unit,
        order: index + 1,
      }));

      const updatedTree: TopicTree = {
        ...treeRef.current,
        units: newUnits,
      };

      setTree(updatedTree);
      triggerAutoSave(updatedTree);
    },
    [triggerAutoSave]
  );

  // Reorder Chapters within a Unit
  const reorderChapters = useCallback(
    (unitId: string, activeId: string, overId: string) => {
      if (!treeRef.current || activeId === overId) return;

      const updatedUnits = treeRef.current.units.map((unit) => {
        if (unit.id !== unitId) return unit;

        const chapters = [...unit.chapters];
        const oldIndex = chapters.findIndex((c) => c.id === activeId);
        const newIndex = chapters.findIndex((c) => c.id === overId);

        if (oldIndex === -1 || newIndex === -1) return unit;

        const newChapters = arrayMove(chapters, oldIndex, newIndex).map((chap, index) => ({
          ...chap,
          order: index + 1,
        }));

        return {
          ...unit,
          chapters: newChapters,
        };
      });

      const updatedTree: TopicTree = {
        ...treeRef.current,
        units: updatedUnits,
      };

      setTree(updatedTree);
      triggerAutoSave(updatedTree);
    },
    [triggerAutoSave]
  );

  // Reorder Concepts within a Chapter
  const reorderConcepts = useCallback(
    (chapterId: string, activeId: string, overId: string) => {
      if (!treeRef.current || activeId === overId) return;

      const updatedUnits = treeRef.current.units.map((unit) => {
        const containsChapter = unit.chapters.some((c) => c.id === chapterId);
        if (!containsChapter) return unit;

        const updatedChapters = unit.chapters.map((chapter) => {
          if (chapter.id !== chapterId) return chapter;

          const concepts = [...chapter.concepts];
          const oldIndex = concepts.findIndex((cp) => cp.id === activeId);
          const newIndex = concepts.findIndex((cp) => cp.id === overId);

          if (oldIndex === -1 || newIndex === -1) return chapter;

          const newConcepts = arrayMove(concepts, oldIndex, newIndex);

          return {
            ...chapter,
            concepts: newConcepts,
          };
        });

        return {
          ...unit,
          chapters: updatedChapters,
        };
      });

      const updatedTree: TopicTree = {
        ...treeRef.current,
        units: updatedUnits,
      };

      setTree(updatedTree);
      triggerAutoSave(updatedTree);
    },
    [triggerAutoSave]
  );

  // Rename Item (Unit, Chapter, or Concept)
  const renameItem = useCallback(
    (id: string, level: "unit" | "chapter" | "concept", newTitle: string) => {
      if (!treeRef.current || !newTitle.trim()) return;
      const trimmed = newTitle.trim();

      const updatedUnits = treeRef.current.units.map((unit) => {
        if (level === "unit" && unit.id === id) {
          return { ...unit, title: trimmed };
        }

        const updatedChapters = unit.chapters.map((chapter) => {
          if (level === "chapter" && chapter.id === id) {
            return { ...chapter, title: trimmed };
          }

          if (level === "concept") {
            const updatedConcepts = chapter.concepts.map((concept) => {
              if (concept.id === id) {
                return { ...concept, title: trimmed };
              }
              return concept;
            });
            return { ...chapter, concepts: updatedConcepts };
          }

          return chapter;
        });

        return {
          ...unit,
          chapters: updatedChapters,
        };
      });

      const updatedTree: TopicTree = {
        ...treeRef.current,
        units: updatedUnits,
      };

      setTree(updatedTree);
      triggerAutoSave(updatedTree);
    },
    [triggerAutoSave]
  );

  // Delete Item (Unit, Chapter, or Concept)
  const deleteItem = useCallback(
    (id: string, level: "unit" | "chapter" | "concept") => {
      if (!treeRef.current) return;

      let updatedUnits = treeRef.current.units;

      if (level === "unit") {
        updatedUnits = updatedUnits
          .filter((unit) => unit.id !== id)
          .map((unit, index) => ({ ...unit, order: index + 1 }));
      } else if (level === "chapter") {
        updatedUnits = updatedUnits.map((unit) => {
          const filteredChapters = unit.chapters
            .filter((c) => c.id !== id)
            .map((c, index) => ({ ...c, order: index + 1 }));
          return {
            ...unit,
            chapters: filteredChapters,
          };
        });
      } else if (level === "concept") {
        updatedUnits = updatedUnits.map((unit) => {
          const updatedChapters = unit.chapters.map((chapter) => ({
            ...chapter,
            concepts: chapter.concepts.filter((cp) => cp.id !== id),
          }));
          return {
            ...unit,
            chapters: updatedChapters,
          };
        });
      }

      const updatedTree: TopicTree = {
        ...treeRef.current,
        units: updatedUnits,
      };

      setTree(updatedTree);
      triggerAutoSave(updatedTree);
    },
    [triggerAutoSave]
  );

  // Add Item (Unit, Chapter, or Concept)
  const addItem = useCallback(
    (parentId: string | null, level: "unit" | "chapter" | "concept", title?: string) => {
      if (!treeRef.current) return;

      let updatedUnits = [...treeRef.current.units];

      if (level === "unit") {
        const newUnit: TopicUnit = {
          id: uid("unit"),
          title: title?.trim() || `Unit ${updatedUnits.length + 1}: New Unit`,
          chapters: [],
          order: updatedUnits.length + 1,
        };
        updatedUnits.push(newUnit);
      } else if (level === "chapter") {
        const targetUnitId = parentId || (updatedUnits[0] ? updatedUnits[0].id : null);
        if (!targetUnitId) return;

        updatedUnits = updatedUnits.map((unit) => {
          if (unit.id !== targetUnitId) return unit;

          const newChapter: TopicChapter = {
            id: uid("chap"),
            title: title?.trim() || `New Chapter ${unit.chapters.length + 1}`,
            concepts: [],
            source_spans: [],
            status: "not_started",
            order: unit.chapters.length + 1,
          };

          return {
            ...unit,
            chapters: [...unit.chapters, newChapter],
          };
        });
      } else if (level === "concept") {
        if (!parentId) return;

        updatedUnits = updatedUnits.map((unit) => {
          const updatedChapters = unit.chapters.map((chapter) => {
            if (chapter.id !== parentId) return chapter;

            const newConcept: TopicConcept = {
              id: uid("concept"),
              title: title?.trim() || `New Concept ${chapter.concepts.length + 1}`,
            };

            return {
              ...chapter,
              concepts: [...chapter.concepts, newConcept],
            };
          });

          return {
            ...unit,
            chapters: updatedChapters,
          };
        });
      }

      const updatedTree: TopicTree = {
        ...treeRef.current,
        units: updatedUnits,
      };

      setTree(updatedTree);
      triggerAutoSave(updatedTree);
    },
    [triggerAutoSave]
  );

  // Merge Multiple Chapters
  const mergeChapters = useCallback(
    (chapterIds: string[]) => {
      if (!treeRef.current || chapterIds.length < 2) return;

      const chaptersToMerge: TopicChapter[] = [];
      for (const unit of treeRef.current.units) {
        for (const chap of unit.chapters) {
          if (chapterIds.includes(chap.id)) {
            chaptersToMerge.push(chap);
          }
        }
      }

      if (chaptersToMerge.length < 2) return;

      const targetChapter = chaptersToMerge[0];
      const otherChapters = chaptersToMerge.slice(1);

      // Combine titles
      const mergedTitle = `${targetChapter.title} & ${otherChapters.map((c) => c.title).join(" & ")}`;

      // Combine unique concepts
      const mergedConcepts: TopicConcept[] = [...targetChapter.concepts];
      for (const other of otherChapters) {
        for (const concept of other.concepts) {
          mergedConcepts.push({
            id: uid("concept"),
            title: concept.title,
          });
        }
      }

      // Combine source spans
      const mergedSpans: SourceSpan[] = [
        ...targetChapter.source_spans,
        ...otherChapters.flatMap((c) => c.source_spans || []),
      ];

      // Determine highest status
      const statusPriority: Record<TopicStatus, number> = {
        tested: 4,
        revised: 3,
        studied: 2,
        not_started: 1,
      };
      let bestStatus: TopicStatus = targetChapter.status;
      for (const c of otherChapters) {
        if ((statusPriority[c.status] || 0) > (statusPriority[bestStatus] || 0)) {
          bestStatus = c.status;
        }
      }

      const mergedChapter: TopicChapter = {
        ...targetChapter,
        title: mergedTitle,
        concepts: mergedConcepts,
        source_spans: mergedSpans,
        status: bestStatus,
      };

      const otherIds = new Set(otherChapters.map((c) => c.id));

      const updatedUnits = treeRef.current.units.map((unit) => {
        const containsTarget = unit.chapters.some((c) => c.id === targetChapter.id);

        let unitChapters = unit.chapters.filter((c) => !otherIds.has(c.id));

        if (containsTarget) {
          unitChapters = unitChapters.map((c) => (c.id === targetChapter.id ? mergedChapter : c));
        }

        return {
          ...unit,
          chapters: unitChapters.map((c, idx) => ({ ...c, order: idx + 1 })),
        };
      });

      const updatedTree: TopicTree = {
        ...treeRef.current,
        units: updatedUnits,
      };

      setTree(updatedTree);
      triggerAutoSave(updatedTree);
      addToast(
        `Merged ${chapterIds.length} chapters into "${mergedTitle.slice(0, 35)}..."`,
        "success",
        "Chapters Merged"
      );
    },
    [addToast, triggerAutoSave]
  );

  // Optimistic Status Update
  const updateStatus = useCallback(
    async (chapterId: string, status: TopicStatus) => {
      if (!treeRef.current) return;

      // 1. Optimistic local update
      const updatedUnits = treeRef.current.units.map((unit) => {
        const updatedChapters = unit.chapters.map((chapter) => {
          if (chapter.id === chapterId) {
            return { ...chapter, status };
          }
          return chapter;
        });
        return {
          ...unit,
          chapters: updatedChapters,
        };
      });

      const updatedTree: TopicTree = {
        ...treeRef.current,
        units: updatedUnits,
      };

      setTree(updatedTree);

      // 2. Call status update API in background
      try {
        await updateTopicStatus(subjectId, chapterId, status);
        // Also update cached topic tree query data
        queryClient.setQueryData(["topic-tree", subjectId], updatedTree);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to update topic status";
        addToast(message, "error", "Status Update Error");
      }
    },
    [addToast, queryClient, subjectId]
  );

  // Confirm Syllabus
  const confirmTree = useCallback(() => {
    return confirmMutation.mutateAsync();
  }, [confirmMutation]);

  return {
    tree,
    setTree,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    isDirty,
    isSaving: isSaving || saveMutation.isPending,
    isConfirming: confirmMutation.isPending,
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
    refetch: query.refetch,
  };
}
