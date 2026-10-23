'use client';

import React, { useState } from 'react';
import {
  Printer,
  Download,
  Eye,
  EyeOff,
  CheckCircle2,
  ListOrdered,
  FileCheck2,
  Clock,
  Award,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import { MarkdownRenderer } from '@/components/ui/markdown-renderer';
import type { QuestionPaper } from '@/types';

export interface QuestionPaperPreviewProps {
  paper: QuestionPaper;
  subjectTitle?: string;
  className?: string;
}

export function QuestionPaperPreview({
  paper,
  subjectTitle,
  className,
}: QuestionPaperPreviewProps) {
  const [showAnswerKey, setShowAnswerKey] = useState(false);
  const [showMarkingScheme, setShowMarkingScheme] = useState(false);

  // Normalize fields between canonical types and mock data
  const raw: any = paper;
  const title = paper.title || raw.title || 'Examination Question Paper';
  const duration = paper.duration_minutes ?? raw.durationMinutes ?? 120;
  const totalMarks = paper.total_marks ?? raw.totalMarks ?? 100;
  const createdAt = paper.created_at || raw.createdAt || new Date().toISOString();

  // Questions content
  const questionsContent: string =
    paper.questions ||
    raw.content ||
    (raw.metadata?.sections
      ? raw.metadata.sections
          .map(
            (sec: any) =>
              `### ${sec.title}\n*${sec.instructions} (${sec.marksPerQuestion} marks each)*\n\n` +
              sec.questions
                .map(
                  (q: any) =>
                    `**Q${q.number}.** ${q.question} **[${q.marks} Marks]**`
                )
                .join('\n\n')
          )
          .join('\n\n---\n\n')
      : 'No questions generated.');

  // Answer Key content
  const answerKeyContent: string =
    paper.answer_key ||
    (raw.metadata?.answerKey
      ? raw.metadata.answerKey
          .map(
            (a: any, idx: number) =>
              `**Answer for Question ${idx + 1}:**\n${a.modelAnswer}\n\n*Rubric:* ${a.markingRubric?.join(' • ')}`
          )
          .join('\n\n---\n\n')
      : '');

  // Marking Scheme content
  const markingSchemeContent: string =
    paper.marking_scheme ||
    (raw.metadata?.answerKey
      ? `## Examination Marking Rubric\n\n` +
        raw.metadata.answerKey
          .map(
            (a: any, idx: number) =>
              `### Question ${idx + 1} Step-by-Step Scoring Guide\n` +
              (a.markingRubric?.map((r: string) => `- ${r}`).join('\n') ||
                '- Correct working: full marks\n- Minor algebraic error: -1 mark')
          )
          .join('\n\n')
      : '');

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Print-specific style tag for A4 formatting */}
      <style jsx global>{`
        @media print {
          body {
            background: #ffffff !important;
            color: #000000 !important;
            font-size: 11pt !important;
          }
          header,
          aside,
          nav,
          footer,
          button,
          .no-print,
          div[role='dialog'] {
            display: none !important;
          }
          body * {
            visibility: hidden;
          }
          #paper-print-area,
          #paper-print-area * {
            visibility: visible;
          }
          #paper-print-area {
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
            margin: 15mm 20mm;
          }
        }
      `}</style>

      {/* Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 shadow-xs no-print">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAnswerKey((prev) => !prev)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer',
              showAnswerKey
                ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : 'border-border bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            {showAnswerKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {showAnswerKey ? 'Hide Answer Key' : 'Show Answer Key'}
          </button>

          <button
            type="button"
            onClick={() => setShowMarkingScheme((prev) => !prev)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer',
              showMarkingScheme
                ? 'border-purple-500 bg-purple-500/10 text-purple-600 dark:text-purple-400'
                : 'border-border bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <FileCheck2 className="h-3.5 w-3.5" />
            {showMarkingScheme ? 'Hide Rubric' : 'Marking Scheme'}
          </button>
        </div>

        <button
          type="button"
          onClick={handlePrint}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-all cursor-pointer"
        >
          <Printer className="h-3.5 w-3.5" />
          Print / Download PDF
        </button>
      </div>

      {/* Printable Exam Paper Container */}
      <div
        id="paper-print-area"
        className="rounded-xl border border-border bg-card p-8 sm:p-12 text-foreground shadow-sm print:border-none print:shadow-none print:p-0 print:bg-white print:text-black"
      >
        {/* Exam Header */}
        <div className="border-b-2 border-border pb-6 text-center print:border-b-2 print:border-black print:pb-4">
          <div className="flex items-center justify-center gap-2 mb-2 text-xs font-bold uppercase tracking-wider text-primary print:text-neutral-700">
            <span>Student Life OS</span>
            <span>•</span>
            <span>{subjectTitle || 'Academic Examination'}</span>
          </div>

          <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-foreground print:text-2xl print:text-black">
            {title}
          </h1>

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs border-t border-border/70 pt-4 print:border-neutral-400 print:pt-3">
            <div className="flex flex-col items-center sm:items-start">
              <span className="text-muted-foreground print:text-neutral-600">Duration:</span>
              <span className="font-bold text-foreground print:text-black flex items-center gap-1">
                <Clock className="h-3 w-3 no-print" />
                {duration} Minutes
              </span>
            </div>
            <div className="flex flex-col items-center sm:items-start">
              <span className="text-muted-foreground print:text-neutral-600">Total Marks:</span>
              <span className="font-bold text-foreground print:text-black flex items-center gap-1">
                <Award className="h-3 w-3 no-print" />
                {totalMarks} Marks
              </span>
            </div>
            <div className="flex flex-col items-center sm:items-start">
              <span className="text-muted-foreground print:text-neutral-600">Exam Date:</span>
              <span className="font-bold text-foreground print:text-black flex items-center gap-1">
                <Calendar className="h-3 w-3 no-print" />
                {formatDate(createdAt)}
              </span>
            </div>
            <div className="flex flex-col items-center sm:items-start">
              <span className="text-muted-foreground print:text-neutral-600">Status:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 print:text-black">
                Official Paper
              </span>
            </div>
          </div>
        </div>

        {/* Instructions Section */}
        <div className="my-6 rounded-lg border border-border/80 bg-muted/40 p-4 text-xs print:border-neutral-400 print:bg-neutral-50 print:text-black print:my-4">
          <h2 className="font-bold uppercase tracking-wider text-foreground mb-2 print:text-black">
            General Instructions:
          </h2>
          <ol className="list-decimal list-inside space-y-1 text-muted-foreground print:text-neutral-800">
            <li>Read all questions thoroughly before attempting answers.</li>
            <li>All questions are compulsory unless specified otherwise within the section.</li>
            <li>Figures to the right in brackets indicate maximum allocated marks.</li>
            <li>Calculators and formula sheets are permitted where indicated.</li>
            <li>Write clear, legible answers with proper headings and step-by-step mathematical working.</li>
          </ol>
        </div>

        {/* Questions Body */}
        <div className="mt-8 space-y-6 print:mt-6">
          <MarkdownRenderer content={questionsContent} className="text-sm print:text-[11pt]" />
        </div>

        {/* Answer Key Toggle View */}
        {showAnswerKey && answerKeyContent && (
          <div className="mt-10 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6 print:border-neutral-400 print:bg-neutral-50 print:mt-8">
            <div className="flex items-center gap-2 border-b border-emerald-500/20 pb-3 mb-4">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 print:text-black" />
              <h2 className="text-base font-bold text-emerald-950 dark:text-emerald-100 print:text-black">
                Model Solutions & Answer Key
              </h2>
            </div>
            <MarkdownRenderer
              content={answerKeyContent}
              className="text-xs text-foreground/90 print:text-black"
            />
          </div>
        )}

        {/* Marking Scheme Toggle View */}
        {showMarkingScheme && markingSchemeContent && (
          <div className="mt-8 rounded-xl border border-purple-500/30 bg-purple-500/5 p-6 print:border-neutral-400 print:bg-neutral-50 print:mt-8">
            <div className="flex items-center gap-2 border-b border-purple-500/20 pb-3 mb-4">
              <FileCheck2 className="h-5 w-5 text-purple-600 dark:text-purple-400 print:text-black" />
              <h2 className="text-base font-bold text-purple-950 dark:text-purple-100 print:text-black">
                Evaluation Criteria & Step-by-Step Marking Rubric
              </h2>
            </div>
            <MarkdownRenderer
              content={markingSchemeContent}
              className="text-xs text-foreground/90 print:text-black"
            />
          </div>
        )}

        {/* Paper End Mark */}
        <div className="mt-12 border-t border-border/80 pt-4 text-center text-xs text-muted-foreground print:border-neutral-400 print:text-neutral-500">
          *** END OF QUESTION PAPER ***
        </div>
      </div>
    </div>
  );
}

export default QuestionPaperPreview;
