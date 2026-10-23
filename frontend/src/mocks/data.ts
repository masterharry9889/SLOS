/**
 * Student Life OS - Comprehensive Mock Data
 * Realistic data models for Computer Science curriculum
 */

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  role: string;
  major: string;
  semester: number;
  university: string;
  createdAt: string;
  updatedAt: string;
}

export interface Subject {
  id: string;
  userId: string;
  title: string;
  code: string;
  description: string;
  examDate: string;
  progress: number;
  completedTopics: number;
  totalTopics: number;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface SourceSpan {
  page: number;
  start: number;
  end: number;
}

export type TopicStatus = 'not_started' | 'studied' | 'revised' | 'tested';
export type TopicLevel = 'unit' | 'chapter' | 'concept';

export interface TopicConcept {
  id: string;
  title: string;
  level: 'concept';
  order: number;
  status: TopicStatus;
  confirmed: boolean;
  parentId: string;
  sourceSpans?: SourceSpan[];
}

export interface TopicChapter {
  id: string;
  title: string;
  level: 'chapter';
  order: number;
  status: TopicStatus;
  confirmed: boolean;
  parentId: string;
  sourceSpans: SourceSpan[];
  concepts: TopicConcept[];
}

export interface TopicUnit {
  id: string;
  title: string;
  level: 'unit';
  order: number;
  status: TopicStatus;
  confirmed: boolean;
  subjectId: string;
  chapters: TopicChapter[];
}

export interface TopicTree {
  id: string;
  subjectId: string;
  subjectTitle: string;
  sourceType: string;
  units: TopicUnit[];
  confirmed: boolean;
  updatedAt: string;
}

export interface Note {
  id: string;
  userId: string;
  subjectId: string;
  topicId: string;
  chapterTitle: string;
  title: string;
  content: string;
  version: number;
  depth: 'brief' | 'standard' | 'detailed';
  mode: 'notes' | 'summary';
  isLatest: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CheatSheet {
  id: string;
  userId: string;
  subjectId: string;
  topicId: string;
  type: 'cheatsheet';
  title: string;
  content: string;
  metadata: {
    scope: 'unit' | 'chapter' | 'subject';
    unitTitle: string;
    generatedBy: string;
    version: number;
    tags: string[];
  };
  pdfKey?: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionPaperSection {
  title: string;
  instructions: string;
  marksPerQuestion: number;
  questions: Array<{
    id: string;
    number: number;
    question: string;
    marks: number;
    concept: string;
  }>;
}

export interface QuestionPaper {
  id: string;
  userId: string;
  subjectId: string;
  type: 'question_paper';
  title: string;
  durationMinutes: number;
  totalMarks: number;
  content: string;
  metadata: {
    sections: QuestionPaperSection[];
    answerKey: Array<{
      questionId: string;
      modelAnswer: string;
      markingRubric: string[];
    }>;
    blueprint: {
      easyWeight: number;
      mediumWeight: number;
      hardWeight: number;
    };
  };
  pdfKey?: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  topicId: string;
  topicTitle: string;
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
}

export interface Quiz {
  id: string;
  userId: string;
  subjectId: string;
  topicId?: string;
  title: string;
  description: string;
  questions: QuizQuestion[];
  timeLimitMinutes: number;
  totalPoints: number;
  createdAt: string;
}

export interface QuizQuestionFeedback {
  questionId: string;
  selectedOption: number;
  correctOption: number;
  isCorrect: boolean;
  explanation: string;
}

export interface QuizResult {
  id: string;
  quizId: string;
  userId: string;
  score: number;
  maxScore: number;
  percentage: number;
  timeSpentSeconds: number;
  status: 'graded';
  answers: Record<string, number>;
  feedback: QuizQuestionFeedback[];
  topicBreakdown: Record<
    string,
    {
      topicTitle: string;
      score: number;
      maxScore: number;
      percentage: number;
    }
  >;
  suggestions: string[];
  startedAt: string;
  submittedAt: string;
  gradedAt: string;
}

export interface WeakTopic {
  topicId: string;
  title: string;
  subjectId: string;
  subjectTitle: string;
  accuracy: number;
  totalQuestionsAttempted: number;
}

export interface DashboardContinueItem {
  subjectId: string;
  subjectTitle: string;
  subjectCode: string;
  topicId: string;
  chapterTitle: string;
  progress: number;
  lastAccessedAt: string;
}

export interface DashboardData {
  user: User;
  streak: {
    current: number;
    longest: number;
    todayCompleted: boolean;
  };
  weeklyStudyMinutes: Array<{
    day: string;
    date: string;
    minutes: number;
  }>;
  totalStudyMinutesThisWeek: number;
  quizScoreTrend: Array<{
    date: string;
    quizId: string;
    quizTitle: string;
    subjectTitle: string;
    score: number;
    percentage: number;
  }>;
  weakTopics: WeakTopic[];
  continueItem: DashboardContinueItem;
  completion: {
    overall: number;
    bySubject: Array<{
      subjectId: string;
      title: string;
      code: string;
      percentage: number;
      completedTopics: number;
      totalTopics: number;
    }>;
  };
  examCountdown: Array<{
    subjectId: string;
    title: string;
    code: string;
    examDate: string;
    daysRemaining: number;
  }>;
}

export type JobType =
  | 'parse'
  | 'generate_notes'
  | 'generate_cheatsheet'
  | 'generate_paper'
  | 'generate_quiz'
  | 'evaluate';

export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface Job {
  id: string;
  userId: string;
  type: JobType;
  status: JobStatus;
  progress?: number;
  payload: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: string;
  resourceId?: string;
  resourceType?: string;
  attempts: number;
  maxAttempts: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  subjectId?: string;
  topicId?: string;
  timestamp: string;
}

export interface UserSettings {
  id: string;
  userId: string;
  theme: 'system' | 'light' | 'dark';
  studyReminderTime: string;
  dailyGoalMinutes: number;
  emailNotifications: boolean;
  soundEffects: boolean;
  preferredNotesDepth: 'brief' | 'standard' | 'detailed';
  preferredNotesMode: 'notes' | 'summary';
  defaultExportFormat: 'markdown' | 'pdf';
  updatedAt: string;
}

export interface DocumentItem {
  id: string;
  userId: string;
  subjectId: string;
  fileName: string;
  fileKey: string;
  fileSize: number;
  mimeType: string;
  sourceType: 'syllabus' | 'content';
  status: 'uploaded' | 'parsing' | 'parsed' | 'error';
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Dynamic date helpers (relative to runtime invocation)
// ─────────────────────────────────────────────────────────────────────────────

const now = new Date();
const daysAgo = (days: number): string =>
  new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
const daysFromNow = (days: number): string =>
  new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
const minutesAgo = (minutes: number): string =>
  new Date(now.getTime() - minutes * 60 * 1000).toISOString();
const hoursAgo = (hours: number): string =>
  new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString();

// ─────────────────────────────────────────────────────────────────────────────
// 1. mockUser
// ─────────────────────────────────────────────────────────────────────────────

export const mockUser: User = {
  id: 'usr-8f3a9e21-d102-4b57-a9a3-5c21ef9a1001',
  email: 'alex.chen@university.edu',
  name: 'Alex Chen',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
  role: 'student',
  major: 'Computer Science & Engineering',
  semester: 5,
  university: 'State University of Technology',
  createdAt: daysAgo(60),
  updatedAt: hoursAgo(4),
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. mockSubjects
// ─────────────────────────────────────────────────────────────────────────────

export const mockSubjects: Subject[] = [
  {
    id: 'sub-dsa-101',
    userId: mockUser.id,
    title: 'Data Structures & Algorithms',
    code: 'CS-301',
    description:
      'Fundamental data structures, asymptotic notation, balanced trees, graph traversal, and dynamic programming.',
    examDate: daysFromNow(25),
    progress: 68,
    completedTopics: 34,
    totalTopics: 50,
    color: '#3B82F6',
    createdAt: daysAgo(45),
    updatedAt: hoursAgo(2),
  },
  {
    id: 'sub-os-202',
    userId: mockUser.id,
    title: 'Operating Systems',
    code: 'CS-302',
    description:
      'Process concurrency, synchronization, CPU scheduling, virtual memory management, and file system architecture.',
    examDate: daysFromNow(40),
    progress: 42,
    completedTopics: 18,
    totalTopics: 43,
    color: '#10B981',
    createdAt: daysAgo(40),
    updatedAt: daysAgo(1),
  },
  {
    id: 'sub-dbms-303',
    userId: mockUser.id,
    title: 'Database Management Systems',
    code: 'CS-303',
    description:
      'Relational algebra, normal forms (1NF-BCNF), B+ tree indexing, ACID transactions, and distributed consensus.',
    examDate: daysFromNow(14),
    progress: 85,
    completedTopics: 34,
    totalTopics: 40,
    color: '#8B5CF6',
    createdAt: daysAgo(42),
    updatedAt: hoursAgo(8),
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 3. mockTopicTree (for DSA: 5 Units, 3-4 Chapters each, 3-5 Concepts each)
// ─────────────────────────────────────────────────────────────────────────────

export const mockTopicTree: TopicTree = {
  id: 'tree-dsa-001',
  subjectId: 'sub-dsa-101',
  subjectTitle: 'Data Structures & Algorithms',
  sourceType: 'syllabus',
  confirmed: true,
  updatedAt: hoursAgo(2),
  units: [
    // Unit 1: Arrays & Strings
    {
      id: 'top-u1-arrays',
      title: 'Unit 1: Arrays & Strings',
      level: 'unit',
      order: 1,
      status: 'tested',
      confirmed: true,
      subjectId: 'sub-dsa-101',
      chapters: [
        {
          id: 'top-u1-c1',
          title: 'Static & Dynamic Arrays',
          level: 'chapter',
          order: 1,
          status: 'tested',
          confirmed: true,
          parentId: 'top-u1-arrays',
          sourceSpans: [
            { page: 4, start: 100, end: 950 },
            { page: 5, start: 50, end: 600 },
          ],
          concepts: [
            {
              id: 'top-u1-c1-con1',
              title: 'Contiguous memory allocation and pointer arithmetic',
              level: 'concept',
              order: 1,
              status: 'tested',
              confirmed: true,
              parentId: 'top-u1-c1',
            },
            {
              id: 'top-u1-c1-con2',
              title: 'Dynamic array doubling and amortized O(1) analysis',
              level: 'concept',
              order: 2,
              status: 'tested',
              confirmed: true,
              parentId: 'top-u1-c1',
            },
            {
              id: 'top-u1-c1-con3',
              title: 'Cache lines and spatial locality performance',
              level: 'concept',
              order: 3,
              status: 'tested',
              confirmed: true,
              parentId: 'top-u1-c1',
            },
          ],
        },
        {
          id: 'top-u1-c2',
          title: 'Two-Pointer & Sliding Window Techniques',
          level: 'chapter',
          order: 2,
          status: 'tested',
          confirmed: true,
          parentId: 'top-u1-arrays',
          sourceSpans: [
            { page: 12, start: 300, end: 1200 },
            { page: 13, start: 0, end: 780 },
          ],
          concepts: [
            {
              id: 'top-u1-c2-con1',
              title: 'Opposing pointer convergence for sorted pair sums',
              level: 'concept',
              order: 1,
              status: 'tested',
              confirmed: true,
              parentId: 'top-u1-c2',
            },
            {
              id: 'top-u1-c2-con2',
              title: 'Fixed-size sliding window for running aggregates',
              level: 'concept',
              order: 2,
              status: 'tested',
              confirmed: true,
              parentId: 'top-u1-c2',
            },
            {
              id: 'top-u1-c2-con3',
              title: 'Dynamic sliding window with hash map constraint tracking',
              level: 'concept',
              order: 3,
              status: 'tested',
              confirmed: true,
              parentId: 'top-u1-c2',
            },
          ],
        },
        {
          id: 'top-u1-c3',
          title: 'String Algorithms & Pattern Matching',
          level: 'chapter',
          order: 3,
          status: 'tested',
          confirmed: true,
          parentId: 'top-u1-arrays',
          sourceSpans: [
            { page: 20, start: 100, end: 1400 },
            { page: 21, start: 15, end: 890 },
          ],
          concepts: [
            {
              id: 'top-u1-c3-con1',
              title: 'String representation and immutability invariants',
              level: 'concept',
              order: 1,
              status: 'tested',
              confirmed: true,
              parentId: 'top-u1-c3',
            },
            {
              id: 'top-u1-c3-con2',
              title: 'Knuth-Morris-Pratt (KMP) prefix function (pi table)',
              level: 'concept',
              order: 2,
              status: 'tested',
              confirmed: true,
              parentId: 'top-u1-c3',
            },
            {
              id: 'top-u1-c3-con3',
              title: 'Rabin-Karp polynomial rolling hash fingerprinting',
              level: 'concept',
              order: 3,
              status: 'tested',
              confirmed: true,
              parentId: 'top-u1-c3',
            },
          ],
        },
      ],
    },

    // Unit 2: Linked Lists
    {
      id: 'top-u2-linkedlists',
      title: 'Unit 2: Linked Lists',
      level: 'unit',
      order: 2,
      status: 'tested',
      confirmed: true,
      subjectId: 'sub-dsa-101',
      chapters: [
        {
          id: 'top-u2-c1',
          title: 'Singly & Doubly Linked Lists',
          level: 'chapter',
          order: 1,
          status: 'tested',
          confirmed: true,
          parentId: 'top-u2-linkedlists',
          sourceSpans: [{ page: 28, start: 50, end: 1100 }],
          concepts: [
            {
              id: 'top-u2-c1-con1',
              title: 'Pointer link manipulation and null pointer semantics',
              level: 'concept',
              order: 1,
              status: 'tested',
              confirmed: true,
              parentId: 'top-u2-c1',
            },
            {
              id: 'top-u2-c1-con2',
              title: 'Dummy sentinel nodes for edge-case simplification',
              level: 'concept',
              order: 2,
              status: 'tested',
              confirmed: true,
              parentId: 'top-u2-c1',
            },
            {
              id: 'top-u2-c1-con3',
              title: 'Doubly linked list with O(1) arbitrary node deletion',
              level: 'concept',
              order: 3,
              status: 'tested',
              confirmed: true,
              parentId: 'top-u2-c1',
            },
          ],
        },
        {
          id: 'top-u2-c2',
          title: 'In-Place Reversals & Group Partitioning',
          level: 'chapter',
          order: 2,
          status: 'tested',
          confirmed: true,
          parentId: 'top-u2-linkedlists',
          sourceSpans: [{ page: 35, start: 120, end: 1450 }],
          concepts: [
            {
              id: 'top-u2-c2-con1',
              title: 'Iterative 3-pointer list reversal (prev, curr, next)',
              level: 'concept',
              order: 1,
              status: 'tested',
              confirmed: true,
              parentId: 'top-u2-c2',
            },
            {
              id: 'top-u2-c2-con2',
              title: 'K-group reverse segment splicing',
              level: 'concept',
              order: 2,
              status: 'tested',
              confirmed: true,
              parentId: 'top-u2-c2',
            },
            {
              id: 'top-u2-c2-con3',
              title: 'Palindrome verification via midpoint reverse and fold',
              level: 'concept',
              order: 3,
              status: 'tested',
              confirmed: true,
              parentId: 'top-u2-c2',
            },
          ],
        },
        {
          id: 'top-u2-c3',
          title: 'Fast-Slow Pointers & Cycle Detection',
          level: 'chapter',
          order: 3,
          status: 'tested',
          confirmed: true,
          parentId: 'top-u2-linkedlists',
          sourceSpans: [{ page: 41, start: 200, end: 1300 }],
          concepts: [
            {
              id: 'top-u2-c3-con1',
              title: "Floyd's Tortoise and Hare cycle detection",
              level: 'concept',
              order: 1,
              status: 'tested',
              confirmed: true,
              parentId: 'top-u2-c3',
            },
            {
              id: 'top-u2-c3-con2',
              title: 'Mathematical proof for cycle origin discovery',
              level: 'concept',
              order: 2,
              status: 'tested',
              confirmed: true,
              parentId: 'top-u2-c3',
            },
            {
              id: 'top-u2-c3-con3',
              title: 'Intersection node of two singly linked lists',
              level: 'concept',
              order: 3,
              status: 'tested',
              confirmed: true,
              parentId: 'top-u2-c3',
            },
          ],
        },
      ],
    },

    // Unit 3: Trees & Graphs
    {
      id: 'top-u3-trees',
      title: 'Unit 3: Trees & Graphs',
      level: 'unit',
      order: 3,
      status: 'studied',
      confirmed: true,
      subjectId: 'sub-dsa-101',
      chapters: [
        {
          id: 'top-u3-c1',
          title: 'Binary Trees & Traversals',
          level: 'chapter',
          order: 1,
          status: 'studied',
          confirmed: true,
          parentId: 'top-u3-trees',
          sourceSpans: [
            { page: 48, start: 100, end: 1650 },
            { page: 49, start: 0, end: 1100 },
          ],
          concepts: [
            {
              id: 'top-u3-c1-con1',
              title: 'Binary tree structural properties and height bounds',
              level: 'concept',
              order: 1,
              status: 'studied',
              confirmed: true,
              parentId: 'top-u3-c1',
            },
            {
              id: 'top-u3-c1-con2',
              title: 'Depth-First Search: Pre-order, In-order, and Post-order',
              level: 'concept',
              order: 2,
              status: 'studied',
              confirmed: true,
              parentId: 'top-u3-c1',
            },
            {
              id: 'top-u3-c1-con3',
              title: 'Breadth-First Search (Level-Order) using Queues',
              level: 'concept',
              order: 3,
              status: 'studied',
              confirmed: true,
              parentId: 'top-u3-c1',
            },
            {
              id: 'top-u3-c1-con4',
              title: 'Lowest Common Ancestor (LCA) in general Binary Trees',
              level: 'concept',
              order: 4,
              status: 'studied',
              confirmed: true,
              parentId: 'top-u3-c1',
            },
          ],
        },
        {
          id: 'top-u3-c2',
          title: 'Binary Search Trees & Self-Balancing Trees',
          level: 'chapter',
          order: 2,
          status: 'studied',
          confirmed: true,
          parentId: 'top-u3-trees',
          sourceSpans: [
            { page: 56, start: 150, end: 1800 },
            { page: 57, start: 20, end: 950 },
          ],
          concepts: [
            {
              id: 'top-u3-c2-con1',
              title: 'BST ordering invariant and recursive validation',
              level: 'concept',
              order: 1,
              status: 'studied',
              confirmed: true,
              parentId: 'top-u3-c2',
            },
            {
              id: 'top-u3-c2-con2',
              title: 'BST search, insertion, and three-case deletion',
              level: 'concept',
              order: 2,
              status: 'studied',
              confirmed: true,
              parentId: 'top-u3-c2',
            },
            {
              id: 'top-u3-c2-con3',
              title: 'AVL Tree balance factors and single/double rotations',
              level: 'concept',
              order: 3,
              status: 'not_started',
              confirmed: true,
              parentId: 'top-u3-c2',
            },
            {
              id: 'top-u3-c2-con4',
              title: 'Red-Black tree color invariants and black-height',
              level: 'concept',
              order: 4,
              status: 'not_started',
              confirmed: true,
              parentId: 'top-u3-c2',
            },
          ],
        },
        {
          id: 'top-u3-c3',
          title: 'Priority Queues & Binary Heaps',
          level: 'chapter',
          order: 3,
          status: 'studied',
          confirmed: true,
          parentId: 'top-u3-trees',
          sourceSpans: [{ page: 65, start: 80, end: 1520 }],
          concepts: [
            {
              id: 'top-u3-c3-con1',
              title: 'Complete binary tree implicit array representation',
              level: 'concept',
              order: 1,
              status: 'studied',
              confirmed: true,
              parentId: 'top-u3-c3',
            },
            {
              id: 'top-u3-c3-con2',
              title: 'Sift-up and Sift-down heapify operations in O(log n)',
              level: 'concept',
              order: 2,
              status: 'studied',
              confirmed: true,
              parentId: 'top-u3-c3',
            },
            {
              id: 'top-u3-c3-con3',
              title: 'Linear time bottom-up heap construction proof O(n)',
              level: 'concept',
              order: 3,
              status: 'studied',
              confirmed: true,
              parentId: 'top-u3-c3',
            },
          ],
        },
        {
          id: 'top-u3-c4',
          title: 'Graph Traversals & Topological Ordering',
          level: 'chapter',
          order: 4,
          status: 'not_started',
          confirmed: true,
          parentId: 'top-u3-trees',
          sourceSpans: [{ page: 72, start: 200, end: 1750 }],
          concepts: [
            {
              id: 'top-u3-c4-con1',
              title: 'Adjacency matrix vs Adjacency list space/time trade-offs',
              level: 'concept',
              order: 1,
              status: 'not_started',
              confirmed: true,
              parentId: 'top-u3-c4',
            },
            {
              id: 'top-u3-c4-con2',
              title: 'BFS shortest path in unweighted graphs',
              level: 'concept',
              order: 2,
              status: 'not_started',
              confirmed: true,
              parentId: 'top-u3-c4',
            },
            {
              id: 'top-u3-c4-con3',
              title: 'DFS back-edge detection for directed cycle verification',
              level: 'concept',
              order: 3,
              status: 'not_started',
              confirmed: true,
              parentId: 'top-u3-c4',
            },
            {
              id: 'top-u3-c4-con4',
              title: "Kahn's in-degree algorithm for Topological Sorting",
              level: 'concept',
              order: 4,
              status: 'not_started',
              confirmed: true,
              parentId: 'top-u3-c4',
            },
          ],
        },
      ],
    },

    // Unit 4: Sorting & Searching
    {
      id: 'top-u4-sorting',
      title: 'Unit 4: Sorting & Searching',
      level: 'unit',
      order: 4,
      status: 'studied',
      confirmed: true,
      subjectId: 'sub-dsa-101',
      chapters: [
        {
          id: 'top-u4-c1',
          title: 'Comparison-Based Sorting Algorithms',
          level: 'chapter',
          order: 1,
          status: 'studied',
          confirmed: true,
          parentId: 'top-u4-sorting',
          sourceSpans: [{ page: 85, start: 100, end: 1600 }],
          concepts: [
            {
              id: 'top-u4-c1-con1',
              title: 'MergeSort divide-and-conquer recurrence relations',
              level: 'concept',
              order: 1,
              status: 'studied',
              confirmed: true,
              parentId: 'top-u4-c1',
            },
            {
              id: 'top-u4-c1-con2',
              title: 'QuickSort partitioning schemes (Lomuto vs Hoare)',
              level: 'concept',
              order: 2,
              status: 'studied',
              confirmed: true,
              parentId: 'top-u4-c1',
            },
            {
              id: 'top-u4-c1-con3',
              title: 'Decision tree proof for Omega(n log n) comparison lower bound',
              level: 'concept',
              order: 3,
              status: 'studied',
              confirmed: true,
              parentId: 'top-u4-c1',
            },
          ],
        },
        {
          id: 'top-u4-c2',
          title: 'Linear Time Sorting Algorithms',
          level: 'chapter',
          order: 2,
          status: 'studied',
          confirmed: true,
          parentId: 'top-u4-sorting',
          sourceSpans: [{ page: 94, start: 80, end: 1200 }],
          concepts: [
            {
              id: 'top-u4-c2-con1',
              title: 'Counting Sort algorithm and stability preservation',
              level: 'concept',
              order: 1,
              status: 'studied',
              confirmed: true,
              parentId: 'top-u4-c2',
            },
            {
              id: 'top-u4-c2-con2',
              title: 'Radix Sort least-significant-digit (LSD) pass complexity',
              level: 'concept',
              order: 2,
              status: 'studied',
              confirmed: true,
              parentId: 'top-u4-c2',
            },
            {
              id: 'top-u4-c2-con3',
              title: 'Bucket Sort uniform distribution assumption and runtime',
              level: 'concept',
              order: 3,
              status: 'studied',
              confirmed: true,
              parentId: 'top-u4-c2',
            },
          ],
        },
        {
          id: 'top-u4-c3',
          title: 'Binary Search Paradigms & Invariants',
          level: 'chapter',
          order: 3,
          status: 'studied',
          confirmed: true,
          parentId: 'top-u4-sorting',
          sourceSpans: [{ page: 102, start: 150, end: 1400 }],
          concepts: [
            {
              id: 'top-u4-c3-con1',
              title: 'Discrete monotonic predicate search space template',
              level: 'concept',
              order: 1,
              status: 'studied',
              confirmed: true,
              parentId: 'top-u4-c3',
            },
            {
              id: 'top-u4-c3-con2',
              title: 'Lower bound and Upper bound index discovery',
              level: 'concept',
              order: 2,
              status: 'studied',
              confirmed: true,
              parentId: 'top-u4-c3',
            },
            {
              id: 'top-u4-c3-con3',
              title: 'Search in circularly rotated sorted arrays',
              level: 'concept',
              order: 3,
              status: 'studied',
              confirmed: true,
              parentId: 'top-u4-c3',
            },
          ],
        },
      ],
    },

    // Unit 5: Dynamic Programming
    {
      id: 'top-u5-dp',
      title: 'Unit 5: Dynamic Programming',
      level: 'unit',
      order: 5,
      status: 'not_started',
      confirmed: true,
      subjectId: 'sub-dsa-101',
      chapters: [
        {
          id: 'top-u5-c1',
          title: 'Principles of Dynamic Programming',
          level: 'chapter',
          order: 1,
          status: 'not_started',
          confirmed: true,
          parentId: 'top-u5-dp',
          sourceSpans: [{ page: 114, start: 100, end: 1550 }],
          concepts: [
            {
              id: 'top-u5-c1-con1',
              title: 'Optimal substructure and overlapping subproblems',
              level: 'concept',
              order: 1,
              status: 'not_started',
              confirmed: true,
              parentId: 'top-u5-c1',
            },
            {
              id: 'top-u5-c1-con2',
              title: 'Top-down memoization vs Bottom-up tabulation trade-offs',
              level: 'concept',
              order: 2,
              status: 'not_started',
              confirmed: true,
              parentId: 'top-u5-c1',
            },
            {
              id: 'top-u5-c1-con3',
              title: 'DAG formulation of state transition networks',
              level: 'concept',
              order: 3,
              status: 'not_started',
              confirmed: true,
              parentId: 'top-u5-c1',
            },
          ],
        },
        {
          id: 'top-u5-c2',
          title: '1D Dynamic Programming & Sequences',
          level: 'chapter',
          order: 2,
          status: 'not_started',
          confirmed: true,
          parentId: 'top-u5-dp',
          sourceSpans: [{ page: 122, start: 90, end: 1350 }],
          concepts: [
            {
              id: 'top-u5-c2-con1',
              title: 'Fibonacci linear state recurrence and space compression',
              level: 'concept',
              order: 1,
              status: 'not_started',
              confirmed: true,
              parentId: 'top-u5-c2',
            },
            {
              id: 'top-u5-c2-con2',
              title: 'House Robber non-adjacent item selection formulation',
              level: 'concept',
              order: 2,
              status: 'not_started',
              confirmed: true,
              parentId: 'top-u5-c2',
            },
            {
              id: 'top-u5-c2-con3',
              title: 'Longest Increasing Subsequence (LIS) in O(n log n)',
              level: 'concept',
              order: 3,
              status: 'not_started',
              confirmed: true,
              parentId: 'top-u5-c2',
            },
          ],
        },
        {
          id: 'top-u5-c3',
          title: '2D & Grid-Based Dynamic Programming',
          level: 'chapter',
          order: 3,
          status: 'not_started',
          confirmed: true,
          parentId: 'top-u5-dp',
          sourceSpans: [{ page: 130, start: 120, end: 1680 }],
          concepts: [
            {
              id: 'top-u5-c3-con1',
              title: '0/1 Knapsack pseudo-polynomial time and space optimization',
              level: 'concept',
              order: 1,
              status: 'not_started',
              confirmed: true,
              parentId: 'top-u5-c3',
            },
            {
              id: 'top-u5-c3-con2',
              title: 'Longest Common Subsequence (LCS) 2D recurrence grid',
              level: 'concept',
              order: 2,
              status: 'not_started',
              confirmed: true,
              parentId: 'top-u5-c3',
            },
            {
              id: 'top-u5-c3-con3',
              title: 'Edit Distance (Levenshtein distance) string transformations',
              level: 'concept',
              order: 3,
              status: 'not_started',
              confirmed: true,
              parentId: 'top-u5-c3',
            },
          ],
        },
        {
          id: 'top-u5-c4',
          title: 'Bitmask & State Machine DP',
          level: 'chapter',
          order: 4,
          status: 'not_started',
          confirmed: true,
          parentId: 'top-u5-dp',
          sourceSpans: [{ page: 142, start: 200, end: 1500 }],
          concepts: [
            {
              id: 'top-u5-c4-con1',
              title: 'State machine modeling for stock transactions with cooldown',
              level: 'concept',
              order: 1,
              status: 'not_started',
              confirmed: true,
              parentId: 'top-u5-c4',
            },
            {
              id: 'top-u5-c4-con2',
              title: 'Traveling Salesperson Problem (TSP) using 2^n bitmasking',
              level: 'concept',
              order: 2,
              status: 'not_started',
              confirmed: true,
              parentId: 'top-u5-c4',
            },
            {
              id: 'top-u5-c4-con3',
              title: 'Bitwise set operations for subset configuration transitions',
              level: 'concept',
              order: 3,
              status: 'not_started',
              confirmed: true,
              parentId: 'top-u5-c4',
            },
          ],
        },
      ],
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. mockNotes (Binary Trees: Substantive CS content, 700+ words, LaTeX, code)
// ─────────────────────────────────────────────────────────────────────────────

export const mockNotes: Note = {
  id: 'note-bt-001',
  userId: mockUser.id,
  subjectId: 'sub-dsa-101',
  topicId: 'top-u3-c1',
  chapterTitle: 'Binary Trees & Traversals',
  title: 'Binary Trees: Comprehensive Theory, Traversals & Mathematical Bounds',
  version: 2,
  depth: 'detailed',
  mode: 'notes',
  isLatest: true,
  createdAt: daysAgo(3),
  updatedAt: hoursAgo(6),
  content: `# Binary Trees: Comprehensive Theory, Traversals & Mathematical Bounds

## 1. Abstract Definition and Fundamentals

A **Binary Tree** $\\mathcal{T}$ is a non-linear, hierarchical data structure defined recursively. An empty set is a valid binary tree. Otherwise, $\\mathcal{T}$ consists of a distinguished element $r$, termed the **root**, and two disjoint subtrees, $\\mathcal{T}_L$ (the left subtree) and $\\mathcal{T}_R$ (the right subtree), each of which is itself a binary tree.

Unlike general multi-way trees, the ordering of child nodes in a binary tree is mathematically significant: the left child and right child are distinct even if a node possesses only one successor.

\`\`\`
       ( 1 )          <-- Root (Depth 0)
      /     \\
    ( 2 )   ( 3 )     <-- Internal Nodes (Depth 1)
   /   \\       \\
 ( 4 ) ( 5 )   ( 6 )   <-- Leaf Nodes (Depth 2)
\`\`\`

---

## 2. Core Mathematical Properties & Axiomatic Bounds

Let $n$ denote the total number of nodes in $\\mathcal{T}$, $h$ denote the height of the tree (where height of an isolated root is defined as $0$), $n_L$ denote the number of leaf nodes (nodes with degree $0$), and $n_2$ denote internal nodes with degree $2$.

### Theorem 1: Relationship between Leaves and Degree-2 Nodes
In any non-empty binary tree:
$$n_L = n_2 + 1$$

*Proof by Edge Counting:*
Let $e$ be the total number of directed edges. Every node except the root has exactly one incoming edge, thus:
$$e = n - 1$$
Edges originating from nodes must sum across out-degrees:
$$e = 0 \\cdot n_0 + 1 \\cdot n_1 + 2 \\cdot n_2 = n_1 + 2n_2$$
Since $n = n_0 + n_1 + n_2$ (where $n_0 = n_L$):
$$(n_L + n_1 + n_2) - 1 = n_1 + 2n_2 \\implies n_L - 1 = n_2 \\implies n_L = n_2 + 1 \\quad \\blacksquare$$

### Theorem 2: Height and Node Capacities
For a binary tree of height $h$:
1. The maximum number of nodes at level $i$ (where $0 \\le i \\le h$) is $2^i$.
2. The maximum total nodes $n_{\\max}$ in a tree of height $h$ is given by the finite geometric series:
   $$n_{\\max} = \\sum_{i=0}^{h} 2^i = 2^{h+1} - 1$$
3. Consequently, for a tree containing $n$ nodes, the minimal theoretical height is bounded by:
   $$h_{\\min} = \\lceil \\log_2(n + 1) \\rceil - 1 \\in \\Omega(\\log n)$$
   while the degenerate worst-case (skewed chain) yields $h_{\\max} = n - 1 \\in O(n)$.

---

## 3. Memory Layout & Node Representation

In modern systems, a binary tree node is represented either via reference pointers on the heap or consecutively within an array (typical for complete trees such as binary heaps).

\`\`\`python
from typing import Optional, Generic, TypeVar

T = TypeVar("T")

class TreeNode(Generic[T]):
    __slots__ = ("val", "left", "right")

    def __init__(self, val: T, left: Optional["TreeNode[T]"] = None, right: Optional["TreeNode[T]"] = None):
        self.val: T = val
        self.left: Optional[TreeNode[T]] = left
        self.right: Optional[TreeNode[T]] = right

    def __repr__(self) -> str:
        return f"TreeNode({self.val})"
\`\`\`

---

## 4. Depth-First Search (DFS) Traversals

Depth-First Traversals visit subtrees exhaustively before backtracking. The three canonical permutations arise from the relative order in which the current node is evaluated relative to its children:

1. **Pre-order Traversal** $(V \\to L \\to R)$: Evaluates root first. Widely used for tree serialization, prefix expression evaluation, and deep cloning.
2. **In-order Traversal** $(L \\to V \\to R)$: In a Binary Search Tree (BST), visits keys in strictly monotonically non-decreasing order.
3. **Post-order Traversal** $(L \\to R \\to V)$: Evaluates subtrees prior to node processing. Crucial for bottom-up aggregations, subtree deletion, and directory size computation.

### Iterative Implementation with Explicit Call Stack
To guarantee protection against runtime recursion stack overflow on heavily skewed inputs where $h \\approx n$, we utilize an explicit memory stack:

\`\`\`python
def inorder_iterative(root: Optional[TreeNode[int]]) -> list[int]:
    """Iterative in-order traversal using an explicit LIFO stack."""
    result: list[int] = []
    stack: list[TreeNode[int]] = []
    curr = root

    while curr is not None or len(stack) > 0:
        # Traverse leftmost branch to the deepest left child
        while curr is not None:
            stack.append(curr)
            curr = curr.left

        curr = stack.pop()
        result.append(curr.val)
        curr = curr.right

    return result
\`\`\`

### Complexity Profile of DFS
- **Time Complexity:** $T(n) = 2T(n/2) + O(1) \\implies \\Theta(n)$ as every node is visited exactly once.
- **Auxiliary Space Complexity:** Bound by the height of the recursion stack $O(h)$. For a balanced tree, $O(\\log n)$; for a degenerate tree, $O(n)$.

---

## 5. Breadth-First Search (BFS / Level-Order)

Level-Order traversal visits all nodes at depth $d$ prior to inspecting nodes at depth $d + 1$. This is fundamentally implemented using an explicit First-In-First-Out (FIFO) queue.

\`\`\`python
from collections import deque

def level_order_traversal(root: Optional[TreeNode[int]]) -> list[list[int]]:
    """Collects node values partitioned by discrete tree levels."""
    if root is None:
        return []

    levels: list[list[int]] = []
    queue: deque[TreeNode[int]] = deque([root])

    while queue:
        level_size = len(queue)
        current_level: list[int] = []

        for _ in range(level_size):
            node = queue.popleft()
            current_level.append(node.val)

            if node.left:
                queue.append(node.left)
            if node.right:
                queue.append(node.right)

        levels.append(current_level)

    return levels
\`\`\`

### Maximum Queue Breadth Analysis
For a complete binary tree of $n$ nodes, the widest tier occurs at the leaves ($d = h$), containing:
$$W_{\\max} = \\lceil n / 2 \\rceil \\in \\Theta(n)$$
Consequently, the auxiliary space consumed by BFS is $\\Theta(n)$ in the average and worst case.

---

## 6. Lowest Common Ancestor (LCA)

The Lowest Common Ancestor between nodes $p$ and $q$ in an arbitrary binary tree is the lowest node $v$ such that both $p$ and $q$ are descendants of $v$ (where a node can be a descendant of itself).

\`\`\`python
def lowest_common_ancestor(
    root: Optional[TreeNode[int]], 
    p: TreeNode[int], 
    q: TreeNode[int]
) -> Optional[TreeNode[int]]:
    if root is None or root is p or root is q:
        return root

    left = lowest_common_ancestor(root.left, p, q)
    right = lowest_common_ancestor(root.right, p, q)

    # If p and q are discovered in divergent subtrees, current node is the LCA
    if left is not None and right is not None:
        return root

    return left if left is not None else right
\`\`\`

---

## 7. Complexity Summary Matrix

| Operation | Best Case | Average Case | Skewed Worst Case | Space (Auxiliary) |
|---|---|---|---|---|
| In-Order DFS | $O(n)$ | $O(n)$ | $O(n)$ | $O(h)$ |
| Pre-Order DFS | $O(n)$ | $O(n)$ | $O(n)$ | $O(h)$ |
| Post-Order DFS | $O(n)$ | $O(n)$ | $O(n)$ | $O(h)$ |
| Level-Order BFS | $O(n)$ | $O(n)$ | $O(n)$ | $O(w) = O(n)$ |
| LCA Query | $O(1)$ | $O(n)$ | $O(n)$ | $O(h)$ |
`,
};

// ─────────────────────────────────────────────────────────────────────────────
// 5. mockCheatSheet (Artifact for Unit 3: Trees)
// ─────────────────────────────────────────────────────────────────────────────

export const mockCheatSheet: CheatSheet = {
  id: 'art-cs-trees-001',
  userId: mockUser.id,
  subjectId: 'sub-dsa-101',
  topicId: 'top-u3-c1',
  type: 'cheatsheet',
  title: 'Trees & Balanced Search Trees: Rapid Revision Sheet',
  metadata: {
    scope: 'unit',
    unitTitle: 'Unit 3: Trees & Graphs',
    generatedBy: 'agents-service',
    version: 1,
    tags: ['DSA', 'Trees', 'BST', 'AVL', 'Heaps', 'Formulas'],
  },
  pdfKey: 'usr-8f3a9e21/pdf/art-cs-trees-001.pdf',
  createdAt: daysAgo(5),
  updatedAt: hoursAgo(12),
  content: `# Rapid Revision Sheet: Trees, BSTs & Priority Queues

## 1. Quick Complexity Lookup Table

| Data Structure | Search | Insertion | Deletion | Space | Key Invariant |
|---|---|---|---|---|---|
| **Binary Search Tree** | $O(h)$ | $O(h)$ | $O(h)$ | $O(n)$ | Left $< v <$ Right |
| **AVL Tree** | $O(\\log n)$ | $O(\\log n)$ | $O(\\log n)$ | $O(n)$ | $|h_L - h_R| \\le 1$ |
| **Red-Black Tree** | $O(\\log n)$ | $O(\\log n)$ | $O(\\log n)$ | $O(n)$ | Black-height balance |
| **Binary Heap** | $O(n)$ | $O(\\log n)$ | $O(\\log n)$ | $O(n)$ | Parent $\\le$ Child (Min-Heap) |

*Note: For an unconstrained BST, worst case height $h = n$, degrading operations to $O(n)$.*

---

## 2. Fundamental Mathematical Formulas

- **Leaf vs Degree-2 Formula:** $n_L = n_2 + 1$
- **Total nodes at level $k$:** at most $2^k$ (root at $k = 0$)
- **Max capacity of height $h$:** $N = 2^{h+1} - 1$
- **Min height for $n$ nodes:** $h = \\lceil \\log_2(n+1) \\rceil - 1$
- **Array-based Heap indexing (0-based):**
  - $\\text{Parent}(i) = \\lfloor (i - 1) / 2 \\rfloor$
  - $\\text{LeftChild}(i) = 2i + 1$
  - $\\text{RightChild}(i) = 2i + 2$

---

## 3. AVL Rotations Cheat Matrix

\`\`\`
Left-Left (LL) Heavy   --> Single Right Rotation on root
Right-Right (RR) Heavy --> Single Left Rotation on root
Left-Right (LR) Heavy  --> Left Rotation on Child, then Right Rotation on root
Right-Left (RL) Heavy  --> Right Rotation on Child, then Left Rotation on root
\`\`\`

---

## 4. Canonical Traversal Code Templates

\`\`\`python
# Morris Inorder: O(n) Time, O(1) Auxiliary Space
def morris_inorder(root):
    curr = root
    while curr:
        if curr.left is None:
            yield curr.val
            curr = curr.right
        else:
            prev = curr.left
            while prev.right and prev.right is not curr:
                prev = prev.right
            if prev.right is None:
                prev.right = curr  # Establish thread
                curr = curr.left
            else:
                prev.right = None  # Revert thread
                yield curr.val
                curr = curr.right
\`\`\`

---

## 5. High-Yield Interview Gotchas
- **BST In-order Traversal:** Always yields strictly sorted keys without needing a separate sorting step.
- **Tree Reconstruction:** A unique binary tree CANNOT be constructed from In-order alone; you require **(In-order + Pre-order)** OR **(In-order + Post-order)**.
- **Degenerate Tree:** Inserting already-sorted sequences into an unaugmented BST results in a singly linked list with $O(n)$ operations.
`,
};

// ─────────────────────────────────────────────────────────────────────────────
// 6. mockQuestionPaper (Artifact for DSA)
// ─────────────────────────────────────────────────────────────────────────────

export const mockQuestionPaper: QuestionPaper = {
  id: 'art-qp-trees-001',
  userId: mockUser.id,
  subjectId: 'sub-dsa-101',
  type: 'question_paper',
  title: 'Mid-Semester Assessment: Binary Trees, BSTs & Balanced Structures',
  durationMinutes: 90,
  totalMarks: 45,
  pdfKey: 'usr-8f3a9e21/pdf/art-qp-trees-001.pdf',
  createdAt: daysAgo(7),
  updatedAt: daysAgo(2),
  metadata: {
    sections: [
      {
        title: 'Section A: Conceptual & Short Answer',
        instructions: 'Answer all 5 questions. Each carries 2 marks.',
        marksPerQuestion: 2,
        questions: [
          {
            id: 'qp-sec-a-q1',
            number: 1,
            question:
              'Prove that in any full binary tree with L leaves, the number of internal nodes is L - 1.',
            marks: 2,
            concept: 'Tree Structural Induction',
          },
          {
            id: 'qp-sec-a-q2',
            number: 2,
            question:
              'State the balance condition for an AVL tree and compute the minimum nodes in an AVL tree of height 4.',
            marks: 2,
            concept: 'AVL Fibonacci Bounds',
          },
          {
            id: 'qp-sec-a-q3',
            number: 3,
            question:
              'Why is it impossible to reconstruct an arbitrary binary tree given only its Pre-order and Post-order sequences?',
            marks: 2,
            concept: 'Traversal Ambiguity',
          },
          {
            id: 'qp-sec-a-q4',
            number: 4,
            question:
              'Explain how Morris Traversal achieves O(1) auxiliary memory consumption during tree traversal.',
            marks: 2,
            concept: 'Threaded Binary Trees',
          },
          {
            id: 'qp-sec-a-q5',
            number: 5,
            question:
              'Compare the cache-locality performance of an implicit array binary heap versus an explicit pointer tree.',
            marks: 2,
            concept: 'Memory Locality',
          },
        ],
      },
      {
        title: 'Section B: Analytical & Computational Problems',
        instructions: 'Answer any 3 questions. Each carries 5 marks.',
        marksPerQuestion: 5,
        questions: [
          {
            id: 'qp-sec-b-q1',
            number: 6,
            question:
              'Given keys [20, 15, 25, 10, 18, 5, 12], trace the stepwise insertion into an AVL tree. Show the rotation triggered after inserting 5.',
            marks: 5,
            concept: 'AVL Tree Construction',
          },
          {
            id: 'qp-sec-b-q2',
            number: 7,
            question:
              'Write an optimal recursive algorithm in pseudo-code to verify if a binary tree satisfies the BST ordering invariant in O(n) time.',
            marks: 5,
            concept: 'BST Validation',
          },
          {
            id: 'qp-sec-b-q3',
            number: 8,
            question:
              'Formally prove that bottom-up heap construction (Heapify) requires O(n) time, whereas repeated insertions require O(n log n).',
            marks: 5,
            concept: 'Heapify Complexity Proof',
          },
        ],
      },
      {
        title: 'Section C: Algorithmic Design & Proof',
        instructions: 'Answer both questions. Each carries 10 marks.',
        marksPerQuestion: 10,
        questions: [
          {
            id: 'qp-sec-c-q1',
            number: 9,
            question:
              'Design an O(n) algorithm to compute the maximum path sum between any two nodes in a non-empty binary tree. Include space complexity analysis.',
            marks: 10,
            concept: 'Subtree Dynamic Programming',
          },
          {
            id: 'qp-sec-c-q2',
            number: 10,
            question:
              'Describe an algorithm to serialize and deserialize an arbitrary binary tree to a compact string format. Analyze time and space guarantees.',
            marks: 10,
            concept: 'Serialization & Codec',
          },
        ],
      },
    ],
    answerKey: [
      {
        questionId: 'qp-sec-a-q1',
        modelAnswer:
          'In a full binary tree every internal node has degree 2. Using e = 2I and e = (L + I) - 1, equating gives 2I = L + I - 1 => I = L - 1.',
        markingRubric: [
          '1 mark for edge counting equations',
          '1 mark for algebraic deduction to I = L - 1',
        ],
      },
      {
        questionId: 'qp-sec-a-q2',
        modelAnswer:
          'Balance factor: |height(left) - height(right)| <= 1. Minimum nodes formula: N(h) = N(h-1) + N(h-2) + 1. For h=0: 1, h=1: 2, h=2: 4, h=3: 7, h=4: 12 nodes.',
        markingRubric: [
          '1 mark for accurate balance condition definition',
          '1 mark for recursive Fibonacci evaluation yielding 12 nodes',
        ],
      },
    ],
    blueprint: {
      easyWeight: 0.25,
      mediumWeight: 0.45,
      hardWeight: 0.3,
    },
  },
  content: `# CS-301 Mid-Semester Examination: Trees & Graph Structures
Time Allowed: 90 Minutes | Maximum Marks: 45

### Section A (10 Marks)
1. Prove that in any full binary tree with L leaves, the number of internal nodes is L - 1. (2 Marks)
2. State the balance condition for an AVL tree and compute the minimum nodes in an AVL tree of height 4. (2 Marks)
3. Why is it impossible to reconstruct an arbitrary binary tree given only its Pre-order and Post-order sequences? (2 Marks)
4. Explain how Morris Traversal achieves O(1) auxiliary memory consumption during tree traversal. (2 Marks)
5. Compare the cache-locality performance of an implicit array binary heap versus an explicit pointer tree. (2 Marks)

### Section B (15 Marks)
6. Trace stepwise insertion of keys [20, 15, 25, 10, 18, 5, 12] into an AVL tree. Show rebalancing rotations. (5 Marks)
7. Write an optimal O(n) recursive algorithm to verify whether a binary tree satisfies the BST property. (5 Marks)
8. Formally prove using mathematical series why build_heap operates in O(n) rather than O(n log n). (5 Marks)

### Section C (20 Marks)
9. Design an algorithm to compute the Maximum Path Sum in an arbitrary binary tree. Prove O(n) runtime. (10 Marks)
10. Formulate an end-to-end codec to serialize and deserialize arbitrary binary trees with null pointer markers. (10 Marks)
`,
};

// ─────────────────────────────────────────────────────────────────────────────
// 7. mockQuiz (5 MCQ Questions on Binary Trees)
// ─────────────────────────────────────────────────────────────────────────────

export const mockQuiz: Quiz = {
  id: 'quiz-trees-101',
  userId: mockUser.id,
  subjectId: 'sub-dsa-101',
  topicId: 'top-u3-c1',
  title: 'Binary Trees & Traversals Mastery Quiz',
  description:
    'Test your conceptual understanding of binary tree properties, DFS/BFS traversals, and asymptotic bounds.',
  timeLimitMinutes: 15,
  totalPoints: 5,
  createdAt: daysAgo(4),
  questions: [
    {
      id: 'q-trees-1',
      question:
        'What is the maximum number of nodes in a binary tree of height h (where a root-only tree has height 0)?',
      options: ['$2^h$', '$2^{h+1} - 1$', '$2^h - 1$', '$2^{h-1} + 1$'],
      correctAnswer: 1,
      explanation:
        'The maximum nodes occur when every level i from 0 to h is completely saturated. Summing the geometric series sum_{i=0}^h 2^i yields 2^{h+1} - 1.',
      topicId: 'top-u3-c1',
      topicTitle: 'Binary Tree Properties & Bounds',
      difficulty: 'easy',
      points: 1,
    },
    {
      id: 'q-trees-2',
      question:
        'Which traversal of a valid Binary Search Tree (BST) will process keys in strictly monotonically non-decreasing order?',
      options: [
        'In-order Traversal (Left, Root, Right)',
        'Pre-order Traversal (Root, Left, Right)',
        'Post-order Traversal (Left, Right, Root)',
        'Level-order Traversal (Breadth-First)',
      ],
      correctAnswer: 0,
      explanation:
        'By definition of a BST, all values in the left subtree are smaller than the root, and all values in the right subtree are larger. In-order traversal visits Left -> Root -> Right, which inherently preserves sorted order.',
      topicId: 'top-u3-c1',
      topicTitle: 'Tree Traversals (DFS)',
      difficulty: 'easy',
      points: 1,
    },
    {
      id: 'q-trees-3',
      question:
        'What is the worst-case time complexity of searching for an element in an unaugmented, unbalanced Binary Search Tree of n nodes?',
      options: ['$O(1)$', '$O(\\log n)$', '$O(n)$', '$O(n \\log n)$'],
      correctAnswer: 2,
      explanation:
        'If elements are inserted in monotonically increasing or decreasing order, the BST degenerates into a linear chain (like a linked list) of height n-1, leading to O(n) search time.',
      topicId: 'top-u3-c2',
      topicTitle: 'Binary Search Tree Worst-Case Behavior',
      difficulty: 'medium',
      points: 1,
    },
    {
      id: 'q-trees-4',
      question:
        'During a Breadth-First Level-Order traversal of a completely filled binary tree of n nodes, what is the maximum auxiliary memory consumed by the FIFO queue?',
      options: [
        '$O(1)$',
        '$O(n)$ (specifically ceil(n/2) leaf nodes)',
        '$O(\\log n)$',
        '$O(n \\log n)$',
      ],
      correctAnswer: 1,
      explanation:
        'At the lowest level of a complete binary tree, approximately half of all nodes (ceil(n/2)) reside as leaves. At the peak queue usage, the queue holds all leaf nodes simultaneously, consuming Theta(n) memory.',
      topicId: 'top-u3-c1',
      topicTitle: 'Breadth-First Search Memory Complexity',
      difficulty: 'medium',
      points: 1,
    },
    {
      id: 'q-trees-5',
      question:
        'Suppose node X has a balance factor of +2 (left-heavy), and its left child has a balance factor of -1 (right-heavy). What rotation sequence is required to restore AVL balance?',
      options: [
        'Single Right Rotation on X',
        'Single Left Rotation on X',
        'Right-Left Double Rotation (Right on child, then Left on X)',
        'Left-Right Double Rotation (Left on child, then Right on X)',
      ],
      correctAnswer: 3,
      explanation:
        'A (+2, -1) condition signifies a Left-Right (LR) imbalance. It requires a Left rotation on the left child to convert the shape into an LL imbalance, followed by a Right rotation on node X.',
      topicId: 'top-u3-c2',
      topicTitle: 'AVL Rotations & Self-Balancing',
      difficulty: 'hard',
      points: 1,
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// 8. mockQuizResult (Completed attempt with topic breakdown)
// ─────────────────────────────────────────────────────────────────────────────

export const mockQuizResult: QuizResult = {
  id: 'att-trees-attempt-001',
  quizId: 'quiz-trees-101',
  userId: mockUser.id,
  score: 4,
  maxScore: 5,
  percentage: 80,
  timeSpentSeconds: 265,
  status: 'graded',
  answers: {
    'q-trees-1': 1,
    'q-trees-2': 0,
    'q-trees-3': 2,
    'q-trees-4': 1,
    'q-trees-5': 0, // Student answered 0 (Single Right) instead of 3 (Left-Right)
  },
  feedback: [
    {
      questionId: 'q-trees-1',
      selectedOption: 1,
      correctOption: 1,
      isCorrect: true,
      explanation:
        'Correct! The maximum nodes in height h is 2^{h+1} - 1 from geometric series sum.',
    },
    {
      questionId: 'q-trees-2',
      selectedOption: 0,
      correctOption: 0,
      isCorrect: true,
      explanation:
        'Correct! In-order traversal visits Left -> Root -> Right, yielding sorted keys.',
    },
    {
      questionId: 'q-trees-3',
      selectedOption: 2,
      correctOption: 2,
      isCorrect: true,
      explanation:
        'Correct! Degenerate skewed BSTs collapse to O(n) worst-case time complexity.',
    },
    {
      questionId: 'q-trees-4',
      selectedOption: 1,
      correctOption: 1,
      isCorrect: true,
      explanation:
        'Correct! The queue stores up to ceil(n/2) leaf nodes at the maximum level.',
    },
    {
      questionId: 'q-trees-5',
      selectedOption: 0,
      correctOption: 3,
      isCorrect: false,
      explanation:
        'Incorrect. A (+2, -1) imbalance is a Left-Right case, which requires a Left rotation on the child followed by a Right rotation on the parent.',
    },
  ],
  topicBreakdown: {
    'Binary Tree Properties & Bounds': {
      topicTitle: 'Binary Tree Properties & Bounds',
      score: 1,
      maxScore: 1,
      percentage: 100,
    },
    'Tree Traversals (DFS & BFS)': {
      topicTitle: 'Tree Traversals (DFS & BFS)',
      score: 2,
      maxScore: 2,
      percentage: 100,
    },
    'Binary Search Tree Properties': {
      topicTitle: 'Binary Search Tree Properties',
      score: 1,
      maxScore: 1,
      percentage: 100,
    },
    'Tree Balancing & Rotations': {
      topicTitle: 'Tree Balancing & Rotations',
      score: 0,
      maxScore: 1,
      percentage: 0,
    },
  },
  suggestions: [
    'Review double rotation mechanisms in AVL trees (Left-Right and Right-Left scenarios).',
    'Practice tracing balance factors when inserting nodes in zig-zag order.',
  ],
  startedAt: minutesAgo(20),
  submittedAt: minutesAgo(15),
  gradedAt: minutesAgo(14),
};

// ─────────────────────────────────────────────────────────────────────────────
// 9. mockDashboard
// ─────────────────────────────────────────────────────────────────────────────

export const mockDashboard: DashboardData = {
  user: mockUser,
  streak: {
    current: 7,
    longest: 14,
    todayCompleted: true,
  },
  weeklyStudyMinutes: [
    { day: 'Mon', date: daysAgo(6).slice(0, 10), minutes: 65 },
    { day: 'Tue', date: daysAgo(5).slice(0, 10), minutes: 90 },
    { day: 'Wed', date: daysAgo(4).slice(0, 10), minutes: 45 },
    { day: 'Thu', date: daysAgo(3).slice(0, 10), minutes: 120 },
    { day: 'Fri', date: daysAgo(2).slice(0, 10), minutes: 75 },
    { day: 'Sat', date: daysAgo(1).slice(0, 10), minutes: 110 },
    { day: 'Sun', date: daysAgo(0).slice(0, 10), minutes: 85 },
  ],
  totalStudyMinutesThisWeek: 590,
  quizScoreTrend: [
    {
      date: daysAgo(18).slice(0, 10),
      quizId: 'quiz-dsa-arr',
      quizTitle: 'Arrays & Two-Pointers Mastery',
      subjectTitle: 'Data Structures & Algorithms',
      score: 7,
      percentage: 70,
    },
    {
      date: daysAgo(14).slice(0, 10),
      quizId: 'quiz-dsa-ll',
      quizTitle: 'Linked List Reversals & Cycles',
      subjectTitle: 'Data Structures & Algorithms',
      score: 8,
      percentage: 80,
    },
    {
      date: daysAgo(10).slice(0, 10),
      quizId: 'quiz-db-norm',
      quizTitle: 'Relational Normalization & BCNF',
      subjectTitle: 'Database Management Systems',
      score: 9,
      percentage: 90,
    },
    {
      date: daysAgo(6).slice(0, 10),
      quizId: 'quiz-os-sched',
      quizTitle: 'Process Scheduling Algorithms',
      subjectTitle: 'Operating Systems',
      score: 8,
      percentage: 80,
    },
    {
      date: daysAgo(2).slice(0, 10),
      quizId: 'quiz-trees-101',
      quizTitle: 'Binary Trees & Traversals Mastery Quiz',
      subjectTitle: 'Data Structures & Algorithms',
      score: 4,
      percentage: 80,
    },
  ],
  weakTopics: [
    {
      topicId: 'top-u3-c2-con3',
      title: 'AVL Tree Double Rotations (Left-Right / Right-Left)',
      subjectId: 'sub-dsa-101',
      subjectTitle: 'Data Structures & Algorithms',
      accuracy: 35,
      totalQuestionsAttempted: 12,
    },
    {
      topicId: 'top-u5-c1-con2',
      title: 'Dynamic Programming: Tabulation vs Memoization',
      subjectId: 'sub-dsa-101',
      subjectTitle: 'Data Structures & Algorithms',
      accuracy: 42,
      totalQuestionsAttempted: 15,
    },
    {
      topicId: 'top-os-vm-page',
      title: 'Virtual Memory Page Replacement (Clock & Second Chance)',
      subjectId: 'sub-os-202',
      subjectTitle: 'Operating Systems',
      accuracy: 48,
      totalQuestionsAttempted: 10,
    },
  ],
  continueItem: {
    subjectId: 'sub-dsa-101',
    subjectTitle: 'Data Structures & Algorithms',
    subjectCode: 'CS-301',
    topicId: 'top-u3-c1',
    chapterTitle: 'Binary Trees & Traversals',
    progress: 68,
    lastAccessedAt: hoursAgo(2),
  },
  completion: {
    overall: 0.65,
    bySubject: [
      {
        subjectId: 'sub-dsa-101',
        title: 'Data Structures & Algorithms',
        code: 'CS-301',
        percentage: 68,
        completedTopics: 34,
        totalTopics: 50,
      },
      {
        subjectId: 'sub-os-202',
        title: 'Operating Systems',
        code: 'CS-302',
        percentage: 42,
        completedTopics: 18,
        totalTopics: 43,
      },
      {
        subjectId: 'sub-dbms-303',
        title: 'Database Management Systems',
        code: 'CS-303',
        percentage: 85,
        completedTopics: 34,
        totalTopics: 40,
      },
    ],
  },
  examCountdown: [
    {
      subjectId: 'sub-dbms-303',
      title: 'Database Management Systems',
      code: 'CS-303',
      examDate: daysFromNow(14),
      daysRemaining: 14,
    },
    {
      subjectId: 'sub-dsa-101',
      title: 'Data Structures & Algorithms',
      code: 'CS-301',
      examDate: daysFromNow(25),
      daysRemaining: 25,
    },
    {
      subjectId: 'sub-os-202',
      title: 'Operating Systems',
      code: 'CS-302',
      examDate: daysFromNow(40),
      daysRemaining: 40,
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// 10. mockJobs
// ─────────────────────────────────────────────────────────────────────────────

export const mockJobs: Record<string, Job> = {
  'job-gen-notes-81a': {
    id: 'job-gen-notes-81a',
    userId: mockUser.id,
    type: 'generate_notes',
    status: 'completed',
    progress: 100,
    payload: {
      chapterId: 'top-u3-c1',
      depth: 'detailed',
      mode: 'notes',
    },
    result: {
      noteId: 'note-bt-001',
      chapterTitle: 'Binary Trees & Traversals',
      wordCount: 840,
    },
    resourceId: 'note-bt-001',
    resourceType: 'note',
    attempts: 1,
    maxAttempts: 3,
    createdAt: hoursAgo(6),
    updatedAt: hoursAgo(5),
    completedAt: hoursAgo(5),
  },
  'job-parse-os-92b': {
    id: 'job-parse-os-92b',
    userId: mockUser.id,
    type: 'parse',
    status: 'processing',
    progress: 65,
    payload: {
      documentId: 'doc-os-syllabus-01',
      fileName: 'Operating_Systems_Syllabus.pdf',
    },
    resourceId: 'doc-os-syllabus-01',
    resourceType: 'document',
    attempts: 1,
    maxAttempts: 3,
    createdAt: minutesAgo(4),
    updatedAt: minutesAgo(1),
  },
  'job-gen-quiz-14c': {
    id: 'job-gen-quiz-14c',
    userId: mockUser.id,
    type: 'generate_quiz',
    status: 'queued',
    progress: 0,
    payload: {
      subjectId: 'sub-dsa-101',
      topicId: 'top-u3-c4',
      numQuestions: 5,
    },
    attempts: 0,
    maxAttempts: 3,
    createdAt: minutesAgo(2),
    updatedAt: minutesAgo(2),
  },
  'job-gen-paper-55d': {
    id: 'job-gen-paper-55d',
    userId: mockUser.id,
    type: 'generate_paper',
    status: 'failed',
    progress: 45,
    payload: {
      subjectId: 'sub-os-202',
      difficulty: 'hard',
    },
    error: 'Agents-service LLM context window exceeded while compiling 5-unit blueprint.',
    attempts: 3,
    maxAttempts: 3,
    createdAt: hoursAgo(12),
    updatedAt: hoursAgo(11),
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 11. mockChatMessages (Student inquiring about BST in-order traversal)
// ─────────────────────────────────────────────────────────────────────────────

export const mockChatMessages: ChatMessage[] = [
  {
    id: 'msg-chat-001',
    role: 'user',
    content:
      'Can you explain why the in-order traversal of a Binary Search Tree (BST) always outputs nodes in ascending sorted order?',
    subjectId: 'sub-dsa-101',
    topicId: 'top-u3-c1',
    timestamp: minutesAgo(25),
  },
  {
    id: 'msg-chat-002',
    role: 'assistant',
    content: `Great question! The sorted property stems directly from the **Binary Search Tree Invariant**:

For every node $x$:
1. Every key in the left subtree $\\mathcal{T}_L$ satisfies $\\text{key}(u) < \\text{key}(x)$.
2. Every key in the right subtree $\\mathcal{T}_R$ satisfies $\\text{key}(v) > \\text{key}(x)$.

**In-order traversal** visits nodes in the strict sequence:
$$\\text{Left Subtree} \\longrightarrow \\text{Current Node} \\longrightarrow \\text{Right Subtree}$$

By mathematical induction on tree height:
- **Base Case ($h = 0$):** A single leaf node is trivially sorted.
- **Inductive Step:** By the induction hypothesis, recursively traversing $\\mathcal{T}_L$ produces its keys in sorted order. All these keys are strictly less than $\\text{key}(x)$. After outputting $\\text{key}(x)$, the traversal proceeds to $\\mathcal{T}_R$, which is also recursively visited in sorted order and consists solely of keys greater than $\\text{key}(x)$.
- Therefore, the concatenation $(\\text{Sorted}(\\mathcal{T}_L), \\text{key}(x), \\text{Sorted}(\\mathcal{T}_R))$ forms a globally sorted sequence.`,
    subjectId: 'sub-dsa-101',
    topicId: 'top-u3-c1',
    timestamp: minutesAgo(24),
  },
  {
    id: 'msg-chat-003',
    role: 'user',
    content:
      'How would I modify the traversal if I need the keys in descending (decreasing) order instead?',
    subjectId: 'sub-dsa-101',
    topicId: 'top-u3-c1',
    timestamp: minutesAgo(22),
  },
  {
    id: 'msg-chat-004',
    role: 'assistant',
    content: `To output keys in descending order, you simply perform a **Reverse In-Order Traversal** by inverting the recursive exploration order:

$$\\text{Right Subtree} \\longrightarrow \\text{Current Node} \\longrightarrow \\text{Left Subtree}$$

Here is the clean recursive implementation:

\`\`\`python
def reverse_inorder(node: Optional[TreeNode[int]]) -> list[int]:
    """Traverses BST in descending order."""
    result: list[int] = []

    def dfs(curr: Optional[TreeNode[int]]):
        if curr is None:
            return
        dfs(curr.right)          # 1. Visit largest values first
        result.append(curr.val)   # 2. Visit current node
        dfs(curr.left)           # 3. Visit smaller values last

    dfs(node)
    return result
\`\`\`

This still operates in **$O(n)$ time** and requires **$O(h)$ space** for the recursion stack!`,
    subjectId: 'sub-dsa-101',
    topicId: 'top-u3-c1',
    timestamp: minutesAgo(21),
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 12. mockSettings
// ─────────────────────────────────────────────────────────────────────────────

export const mockSettings: UserSettings = {
  id: 'set-8f3a9e21-001',
  userId: mockUser.id,
  theme: 'system',
  studyReminderTime: '19:00',
  dailyGoalMinutes: 90,
  emailNotifications: true,
  soundEffects: true,
  preferredNotesDepth: 'detailed',
  preferredNotesMode: 'notes',
  defaultExportFormat: 'markdown',
  updatedAt: daysAgo(2),
};

// ─────────────────────────────────────────────────────────────────────────────
// 13. mockDocuments
// ─────────────────────────────────────────────────────────────────────────────

export const mockDocuments: DocumentItem[] = [];
