import { useQuery } from "@tanstack/react-query";
import type { DashboardData } from "@/types";
import { MOCK_SUBJECTS } from "./subjects";

export const MOCK_DASHBOARD_DATA: DashboardData = {
  subjects: MOCK_SUBJECTS,
  study_streak: 14,
  total_study_hours: 48.5,
  total_notes_generated: 32,
  total_quizzes_taken: 19,
  weekly_study_minutes: [
    { day: "Mon", minutes: 95 },
    { day: "Tue", minutes: 120 },
    { day: "Wed", minutes: 80 },
    { day: "Thu", minutes: 145 },
    { day: "Fri", minutes: 110 },
    { day: "Sat", minutes: 180 },
    { day: "Sun", minutes: 135 },
  ],
  quiz_score_trend: [
    { date: "Oct 12", score: 68, quiz_title: "Calculus Limits & Continuity" },
    { date: "Oct 14", score: 74, quiz_title: "Quantum Wavefunctions" },
    { date: "Oct 16", score: 71, quiz_title: "Binary Search Trees" },
    { date: "Oct 17", score: 85, quiz_title: "Linear Algebra Vectors" },
    { date: "Oct 19", score: 82, quiz_title: "Dynamic Programming" },
    { date: "Oct 20", score: 91, quiz_title: "Schrödinger Equation" },
  ],
  weak_topics: [
    {
      topic_id: "top-101",
      topic_title: "Fourier Transform & Boundary Conditions",
      subject_title: "Quantum Physics",
      subject_id: "sub-2",
      score_percentage: 54,
    },
    {
      topic_id: "top-102",
      topic_title: "Red-Black Tree Rotations & Balancing",
      subject_title: "Data Structures & Algorithms",
      subject_id: "sub-3",
      score_percentage: 61,
    },
    {
      topic_id: "top-103",
      topic_title: "Multiple Integrals in Spherical Coordinates",
      subject_title: "Advanced Calculus",
      subject_id: "sub-1",
      score_percentage: 64,
    },
  ],
  continue_item: {
    type: "topic",
    id: "chap-4",
    title: "Dynamic Programming: Memoization vs Tabulation",
    subject_id: "sub-3",
    subject_title: "Data Structures & Algorithms",
    description: "Chapter 4 • 3 concepts remaining before mastery quiz",
  },
};

export function useDashboardData() {
  return useQuery<DashboardData>({
    queryKey: ["dashboard-data"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/v1/dashboard");
        if (!res.ok) {
          return MOCK_DASHBOARD_DATA;
        }
        const data = await res.json();
        return data || MOCK_DASHBOARD_DATA;
      } catch {
        return MOCK_DASHBOARD_DATA;
      }
    },
    initialData: MOCK_DASHBOARD_DATA,
  });
}
