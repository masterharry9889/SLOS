'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BookOpen, Plus, Search, Calendar, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getSubjects } from '@/lib/api/endpoints';
import { CreateSubjectDialog } from '@/components/features/create-subject-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { getDaysUntil } from '@/lib/utils';
import type { Subject } from '@/types';

export default function SubjectsPage() {
  const router = useRouter();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: subjects = [], isLoading } = useQuery<Subject[]>({
    queryKey: ['subjects'],
    queryFn: () => getSubjects(),
  });

  const filteredSubjects = subjects.filter((s) =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Academic Subjects
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Manage your courses, syllabi, study materials, and topic mastery
          </p>
        </div>

        <button
          type="button"
          onClick={() => setCreateDialogOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>New Subject</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          placeholder="Search your subjects..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border border-input bg-card pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring transition-all"
        />
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      ) : filteredSubjects.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={searchQuery ? 'No matching subjects' : 'No subjects yet'}
          description={
            searchQuery
              ? 'Try modifying your search criteria to find what you are looking for.'
              : 'Add your first academic subject to upload a syllabus and generate notes.'
          }
          action={{
            label: 'Create Subject',
            onClick: () => setCreateDialogOpen(true),
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSubjects.map((sub) => {
            const daysLeft = getDaysUntil(sub.exam_date);
            return (
              <Link
                key={sub.id}
                href={`/subjects/${sub.id}`}
                className="group relative flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-primary/40"
              >
                <div
                  className="absolute top-0 left-0 right-0 h-1 rounded-t-xl"
                  style={{ backgroundColor: sub.color || '#6366f1' }}
                />

                <div>
                  <h3 className="font-bold text-sm text-foreground tracking-tight group-hover:text-primary transition-colors line-clamp-1">
                    {sub.title}
                  </h3>
                  {sub.description && (
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {sub.description}
                    </p>
                  )}
                </div>

                <div className="mt-6 pt-3 border-t border-border flex items-center justify-between text-xs">
                  {daysLeft !== null ? (
                    <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium text-[11px]">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>Exam in {daysLeft} days</span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-[11px]">
                      No exam scheduled
                    </span>
                  )}

                  <span className="text-muted-foreground group-hover:text-primary transition-all text-xs font-medium inline-flex items-center gap-0.5">
                    Workspace <ChevronRight className="h-3 w-3" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Dialog */}
      <CreateSubjectDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={(newSub) => {
          setCreateDialogOpen(false);
          router.push(`/subjects/${newSub.id}`);
        }}
      />
    </div>
  );
}
