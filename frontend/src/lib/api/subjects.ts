import { useQuery } from "@tanstack/react-query";
import type { Subject } from "@/types";

export const MOCK_SUBJECTS: Subject[] = [
  {
    id: "sub-1",
    user_id: "user-1",
    title: "Advanced Calculus",
    description: "Multivariable calculus, differential equations, and vectors",
    color: "#6366f1", // Indigo
    icon: "calculator",
    exam_date: "2026-11-15T09:00:00Z",
    total_topics: 24,
    completed_topics: 18,
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-10-18T00:00:00Z",
  },
  {
    id: "sub-2",
    user_id: "user-1",
    title: "Quantum Physics",
    description: "Wave mechanics, Schrödinger equation, and atomic structure",
    color: "#06b6d4", // Cyan
    icon: "atom",
    exam_date: "2026-11-28T14:00:00Z",
    total_topics: 16,
    completed_topics: 9,
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-10-19T00:00:00Z",
  },
  {
    id: "sub-3",
    user_id: "user-1",
    title: "Data Structures & Algorithms",
    description: "Trees, graphs, dynamic programming, and complexity analysis",
    color: "#10b981", // Emerald
    icon: "binary",
    exam_date: "2026-12-05T10:00:00Z",
    total_topics: 30,
    completed_topics: 22,
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-10-20T00:00:00Z",
  },
  {
    id: "sub-4",
    user_id: "user-1",
    title: "Machine Learning",
    description: "Supervised learning, deep networks, and transformers",
    color: "#f59e0b", // Amber
    icon: "brain",
    exam_date: "2026-12-14T09:00:00Z",
    total_topics: 20,
    completed_topics: 7,
    created_at: "2026-09-05T00:00:00Z",
    updated_at: "2026-10-15T00:00:00Z",
  },
];

export function useSubjects() {
  return useQuery<Subject[]>({
    queryKey: ["subjects"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/v1/subjects");
        if (!res.ok) {
          return MOCK_SUBJECTS;
        }
        const data = await res.json();
        return Array.isArray(data) ? data : data.subjects || MOCK_SUBJECTS;
      } catch {
        return MOCK_SUBJECTS;
      }
    },
    initialData: MOCK_SUBJECTS,
  });
}
