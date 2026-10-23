'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Sparkles,
  Printer,
  Download,
  FileText,
  BookOpen,
  Clock,
  Layers,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RotateCcw,
  Eye,
  Sliders,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { generateCheatSheet } from '@/lib/api/endpoints';
import { useToast } from '@/components/ui/toaster';
import { JobStepper } from '@/components/features/job-stepper';
import { CheatSheetPreview } from './cheatsheet-preview';
import type {
  TopicTree,
  CheatSheetScope,
  CheatSheetFormat,
  Artifact,
  GenerateCheatSheetRequest,
} from '@/types';

export interface CheatSheetGeneratorProps {
  subjectId: string;
  subjectTitle?: string;
  topicTree?: TopicTree | null;
  initialCheatSheet?: Artifact | null;
  onGenerated?: (artifact: Artifact) => void;
  className?: string;
}

export function CheatSheetGenerator({
  subjectId,
  subjectTitle = 'Subject',
  topicTree,
  initialCheatSheet,
  onGenerated,
  className,
}: CheatSheetGeneratorProps) {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  // Generator form state
  const [scope, setScope] = useState<CheatSheetScope>('subject');
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');
  const [selectedChapterId, setSelectedChapterId] = useState<string>('');
  const [format, setFormat] = useState<CheatSheetFormat>('one_page');

  // Job & preview state
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [currentCheatSheet, setCurrentCheatSheet] = useState<Artifact | null>(
    initialCheatSheet || null
  );

  // Units and chapters flat list
  const units = topicTree?.units || [];
  const chapters = units.flatMap((u) =>
    (u.chapters || []).map((c) => ({
      ...c,
      unitTitle: u.title,
    }))
  );

  // Set default selection when scope changes
  const handleScopeChange = (newScope: CheatSheetScope) => {
    setScope(newScope);
    if (newScope === 'unit' && !selectedUnitId && units.length > 0) {
      setSelectedUnitId(units[0].id);
    }
    if (newScope === 'chapter' && !selectedChapterId && chapters.length > 0) {
      setSelectedChapterId(chapters[0].id);
    }
  };

  // Determine current scope_id
  const getScopeId = (): string => {
    if (scope === 'chapter') return selectedChapterId || chapters[0]?.id || '';
    if (scope === 'unit') return selectedUnitId || units[0]?.id || '';
    return subjectId;
  };

  // Mutation
  const generateMutation = useMutation({
    mutationFn: async (req: GenerateCheatSheetRequest) => {
      return generateCheatSheet(req);
    },
    onSuccess: (data) => {
      if (data?.job_id) {
        setActiveJobId(data.job_id);
        addToast('Cheat sheet generation started.', 'info');
      }
    },
    onError: (err: any) => {
      addToast(err?.message || 'Failed to start cheat sheet generation', 'error');
    },
  });

  const handleStartGenerate = () => {
    const scopeId = getScopeId();
    if (!scopeId && scope !== 'subject') {
      addToast('Please select a specific chapter or unit', 'warning');
      return;
    }

    generateMutation.mutate({
      subject_id: subjectId,
      scope,
      scope_id: scopeId,
      format,
    });
  };

  // When job completes
  const handleJobComplete = (result: any) => {
    queryClient.invalidateQueries({ queryKey: ['cheat-sheets', subjectId] });
    addToast('Cheat sheet generated successfully!', 'success');

    // Create or format artifact
    const artifact: Artifact = {
      id: result?.id || `cs-${Date.now()}`,
      subject_id: subjectId,
      type: 'cheatsheet',
      title:
        result?.title ||
        `${subjectTitle} ${
          format === 'formulas_only'
            ? 'Formula Sheet'
            : format === 'last_minute'
            ? 'Last-Minute Revision'
            : 'Cheat Sheet'
        }`,
      content:
        result?.content ||
        generateSampleMarkdown(subjectTitle, format, scope, topicTree),
      metadata: {
        scope,
        scope_id: getScopeId(),
        format,
        ...(result?.metadata || {}),
      },
      created_at: new Date().toISOString(),
    };

    setCurrentCheatSheet(artifact);
    setActiveJobId(null);
    onGenerated?.(artifact);
  };

  const handleJobError = (err: string) => {
    addToast(err || 'Failed to generate cheat sheet. Please try again.', 'error');
    setActiveJobId(null);
  };

  // Print trigger
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Inject Print-Specific Global CSS for clean A4 printing */}
      <style jsx global>{`
        @media print {
          body {
            background: #ffffff !important;
            color: #000000 !important;
            font-size: 11pt !important;
          }
          /* Hide UI chrome */
          header,
          aside,
          nav,
          footer,
          button,
          .no-print,
          div[role='dialog'] {
            display: none !important;
          }
          /* Show print container exclusively */
          body * {
            visibility: hidden;
          }
          #cheatsheet-print-area,
          #cheatsheet-print-area * {
            visibility: visible;
          }
          #cheatsheet-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            box-shadow: none !important;
            border: none !important;
          }
          @page {
            size: A4 portrait;
            margin: 12mm 15mm;
          }
        }
      `}</style>

      {/* Generator Configuration Card */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm no-print">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/80 pb-5">
          <div className="space-y-1">
            <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Cheat Sheet Generator
            </h2>
            <p className="text-xs text-muted-foreground">
              Synthesize high-density, print-optimized formula sheets and revision summaries
            </p>
          </div>
          {currentCheatSheet && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentCheatSheet(null)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Configure New
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-all cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                Download PDF
              </button>
            </div>
          )}
        </div>

        {/* Configuration Controls (hidden while job running) */}
        {!activeJobId && !currentCheatSheet && (
          <div className="mt-6 space-y-6">
            {/* 1. Scope Selector */}
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-primary" />
                1. Choose Coverage Scope
              </label>
              <div className="grid grid-cols-3 gap-2 sm:max-w-md">
                {(
                  [
                    { id: 'chapter', label: 'Chapter' },
                    { id: 'unit', label: 'Full Unit' },
                    { id: 'subject', label: 'Entire Subject' },
                  ] as const
                ).map((item) => {
                  const isSelected = scope === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleScopeChange(item.id)}
                      className={cn(
                        'flex items-center justify-center rounded-lg border py-2.5 px-3 text-xs font-semibold transition-all cursor-pointer',
                        isSelected
                          ? 'border-primary bg-primary/10 text-primary shadow-xs ring-1 ring-primary'
                          : 'border-border bg-card hover:bg-muted/60 text-muted-foreground'
                      )}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>

              {/* Sub-dropdowns based on scope */}
              {scope === 'unit' && (
                <div className="mt-2.5 max-w-md">
                  <label htmlFor="unit-select" className="block text-xs font-medium text-foreground mb-1">
                    Select Unit:
                  </label>
                  <select
                    id="unit-select"
                    value={selectedUnitId}
                    onChange={(e) => setSelectedUnitId(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground shadow-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {units.length === 0 ? (
                      <option value="">No units available</option>
                    ) : (
                      units.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.title} ({u.chapters?.length || 0} chapters)
                        </option>
                      ))
                    )}
                  </select>
                </div>
              )}

              {scope === 'chapter' && (
                <div className="mt-2.5 max-w-md">
                  <label htmlFor="chapter-select" className="block text-xs font-medium text-foreground mb-1">
                    Select Chapter:
                  </label>
                  <select
                    id="chapter-select"
                    value={selectedChapterId}
                    onChange={(e) => setSelectedChapterId(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground shadow-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {chapters.length === 0 ? (
                      <option value="">No chapters available</option>
                    ) : (
                      chapters.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title} • ({c.unitTitle})
                        </option>
                      ))
                    )}
                  </select>
                </div>
              )}
            </div>

            {/* 2. Format Selector */}
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Sliders className="h-3.5 w-3.5 text-primary" />
                2. Select Format & Structure
              </label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {[
                  {
                    id: 'one_page' as CheatSheetFormat,
                    title: 'One-Page Summary',
                    description: 'Comprehensive core ideas, formulas, diagrams and key definitions',
                    icon: FileText,
                  },
                  {
                    id: 'formulas_only' as CheatSheetFormat,
                    title: 'Formulas Only',
                    description: 'Dense mathematical formulas, equations, constants and units',
                    icon: BookOpen,
                  },
                  {
                    id: 'last_minute' as CheatSheetFormat,
                    title: 'Last-Minute Revision',
                    description: 'High-yield points, common exam pitfalls and high-weightage tips',
                    icon: Clock,
                  },
                ].map((item) => {
                  const isSelected = format === item.id;
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.id}
                      onClick={() => setFormat(item.id)}
                      className={cn(
                        'relative flex flex-col justify-between rounded-xl border p-4 cursor-pointer transition-all',
                        isSelected
                          ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary'
                          : 'border-border bg-card hover:border-muted-foreground/30 hover:bg-muted/30'
                      )}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div
                          className={cn(
                            'rounded-lg p-2',
                            isSelected
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground'
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <input
                          type="radio"
                          name="format-choice"
                          checked={isSelected}
                          onChange={() => setFormat(item.id)}
                          className="h-4 w-4 text-primary focus:ring-primary"
                        />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-foreground">{item.title}</h4>
                        <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleStartGenerate}
                disabled={generateMutation.isPending}
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 transition-all cursor-pointer"
              >
                {generateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Starting Generation...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate Cheat Sheet
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Job Stepper Tracker */}
        {activeJobId && (
          <div className="mt-6">
            <JobStepper
              jobId={activeJobId}
              title="Generating Optimized Cheat Sheet"
              onComplete={handleJobComplete}
              onError={handleJobError}
            />
          </div>
        )}
      </div>

      {/* Generated Cheat Sheet Preview Section */}
      {currentCheatSheet && (
        <div className="space-y-4">
          <div className="flex items-center justify-between no-print px-1">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span className="text-xs font-semibold text-muted-foreground">
                Document Preview (Ready for Print or Download)
              </span>
            </div>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              Print / Save PDF
            </button>
          </div>

          <CheatSheetPreview
            content={currentCheatSheet.content}
            format={(currentCheatSheet.metadata?.format as CheatSheetFormat) || format}
            title={currentCheatSheet.title}
            subjectTitle={subjectTitle}
            date={currentCheatSheet.created_at}
          />
        </div>
      )}
    </div>
  );
}

// Fallback markdown generator for preview
function generateSampleMarkdown(
  subjectTitle: string,
  format: CheatSheetFormat,
  scope: CheatSheetScope,
  topicTree?: TopicTree | null
): string {
  if (format === 'formulas_only') {
    return `
## Key Formulas & Constants

### Asymptotic Notations
- **Big-O**: $f(n) = O(g(n))$ if $\\exists c > 0, n_0 > 0$ such that $0 \\le f(n) \\le c \\cdot g(n), \\forall n \\ge n_0$
- **Big-Omega**: $f(n) = \\Omega(g(n))$ if $\\exists c > 0, n_0 > 0$ such that $0 \\le c \\cdot g(n) \\le f(n), \\forall n \\ge n_0$
- **Big-Theta**: $f(n) = \\Theta(g(n)) \\iff f(n) = O(g(n)) \\text{ and } f(n) = \\Omega(g(n))$

### Tree Complexities & Recurrences
- **Binary Search Tree Search**: Worst case $O(h)$, where height $h = \\Theta(n)$ for skewed, and $h = \\Theta(\\log n)$ for balanced trees.
- **Master Theorem Formula**:
$$T(n) = a T(n/b) + f(n)$$
- Case 1: If $f(n) = O(n^{\\log_b a - \\epsilon})$, then $T(n) = \\Theta(n^{\\log_b a})$
- Case 2: If $f(n) = \\Theta(n^{\\log_b a})$, then $T(n) = \\Theta(n^{\\log_b a} \\log n)$
- Case 3: If $f(n) = \\Omega(n^{\\log_b a + \\epsilon})$, then $T(n) = \\Theta(f(n))$

### AVL Balance Factor
$$\\text{Balance Factor}(N) = \\text{Height}(\\text{Left Subtree}) - \\text{Height}(\\text{Right Subtree}) \\in \\{-1, 0, 1\\}$$
- **Rotations**: Single Right (LL), Single Left (RR), Left-Right (LR), Right-Left (RL).
`;
  }

  return `
## 1. Core Principles & Overview
- **Data Structures**: Systematic arrangements of values allowing efficient storage, traversal and updates.
- **Time vs Space Trade-off**: Balancing auxiliary memory consumption against operational throughput.

## 2. Trees & Traversal Schemes
- **Binary Search Tree Property**: For every node $X$, all keys in left subtree $< X.key$, all keys in right subtree $> X.key$.
- **In-Order Traversal**: Always visits keys in sorted ascending order for a valid BST.
- **Height of Balanced BST**:
$$h = \\lfloor \\log_2 n \\rfloor$$

| Operation | Average Time | Worst Time | Space |
| :--- | :--- | :--- | :--- |
| **Search** | $O(\\log n)$ | $O(n)$ | $O(1)$ |
| **Insert** | $O(\\log n)$ | $O(n)$ | $O(1)$ |
| **Delete** | $O(\\log n)$ | $O(n)$ | $O(1)$ |

## 3. High-Yield Exam Pitfalls
> **Crucial Rule**: Deleting a node with two children requires replacing it with either its **in-order predecessor** (maximum of left subtree) or its **in-order successor** (minimum of right subtree).

## 4. Balanced Trees (AVL & Red-Black)
- **AVL Invariant**: Heights of two child subtrees of any node differ by at most 1.
- **Rotations Trigger**:
  1. **LL Insertion**: Single Right rotation at unbalanced ancestor.
  2. **RR Insertion**: Single Left rotation at unbalanced ancestor.
  3. **LR Insertion**: Left rotation on left child, then Right rotation on root.
  4. **RL Insertion**: Right rotation on right child, then Left rotation on root.
`;
}

export default CheatSheetGenerator;
