// ==========================================
// Student Life OS - Core TypeScript Definitions
// ==========================================

// User
export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

// Auth
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  user: User;
  access_token: string;
  refresh_token: string;
}

export interface TokenRefreshResponse {
  access_token: string;
}

// Subject
export interface Subject {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  color: string;
  icon?: string;
  exam_date?: string;
  total_topics: number;
  completed_topics: number;
  created_at: string;
  updated_at: string;
}

export interface CreateSubjectRequest {
  title: string;
  description?: string;
  color: string;
  exam_date?: string;
}

export interface UpdateSubjectRequest {
  title?: string;
  description?: string;
  color?: string;
  exam_date?: string;
}

// Document
export interface Document {
  id: string;
  subject_id: string;
  filename: string;
  file_type: 'pdf' | 'docx' | 'image';
  file_url: string;
  file_size: number;
  status: 'uploading' | 'uploaded' | 'processing' | 'processed' | 'failed';
  created_at: string;
}

export interface PresignedUploadResponse {
  upload_url: string;
  document_id: string;
  fields: Record<string, string>;
}

export interface ConfirmUploadRequest {
  document_id: string;
  success: boolean;
}

// Topic Tree (the core topic tree JSON structure)
export interface SourceSpan {
  page: number;
  start: number;
  end: number;
}

export interface TopicConcept {
  id: string;
  title: string;
}

export interface TopicChapter {
  id: string;
  title: string;
  concepts: TopicConcept[];
  source_spans: SourceSpan[];
  status: TopicStatus;
  order: number;
}

export interface TopicUnit {
  id: string;
  title: string;
  chapters: TopicChapter[];
  order: number;
}

export type TopicStatus = 'not_started' | 'studied' | 'revised' | 'tested';

export interface TopicTree {
  subject_title: string;
  source_type: 'syllabus' | 'content';
  units: TopicUnit[];
}

export interface Topic {
  id: string;
  subject_id: string;
  parent_id?: string;
  title: string;
  level: 'unit' | 'chapter' | 'concept';
  status: TopicStatus;
  order: number;
  children?: Topic[];
}

// Notes
export interface Note {
  id: string;
  chapter_id: string;
  subject_id: string;
  content: string; // markdown
  depth: NoteDepth;
  version: number;
  word_count: number;
  created_at: string;
  updated_at: string;
}

export type NoteDepth = 'brief' | 'standard' | 'detailed';

export interface GenerateNotesRequest {
  chapter_id: string;
  depth: NoteDepth;
}

export interface UpdateNoteRequest {
  content: string;
}

// Artifacts (cheatsheet, question paper)
export interface Artifact {
  id: string;
  subject_id: string;
  type: ArtifactType;
  title: string;
  content: string; // markdown
  metadata: Record<string, unknown>;
  created_at: string;
}

export type ArtifactType = 'cheatsheet' | 'question_paper';

// Cheat Sheet
export type CheatSheetScope = 'chapter' | 'unit' | 'subject';
export type CheatSheetFormat = 'one_page' | 'formulas_only' | 'last_minute';

export interface GenerateCheatSheetRequest {
  subject_id: string;
  scope: CheatSheetScope;
  scope_id: string;
  format: CheatSheetFormat;
}

// Question Paper
export interface QuestionTypeConfig {
  type: 'mcq' | 'short_answer' | 'long_answer' | 'numerical' | 'true_false';
  count: number;
  marks_each: number;
}

export interface DifficultyMix {
  easy: number;
  medium: number;
  hard: number;
}

export interface GenerateQuestionPaperRequest {
  subject_id: string;
  chapter_ids: string[];
  total_marks: number;
  duration_minutes: number;
  difficulty_mix: DifficultyMix;
  question_types: QuestionTypeConfig[];
  past_paper_document_id?: string;
}

export interface QuestionPaper {
  id: string;
  subject_id: string;
  title: string;
  questions: string; // markdown
  answer_key: string; // markdown
  marking_scheme: string; // markdown
  total_marks: number;
  duration_minutes: number;
  created_at: string;
}

// Quiz
export interface Quiz {
  id: string;
  subject_id: string;
  title: string;
  questions: QuizQuestion[];
  total_marks: number;
  duration_minutes: number;
  created_at: string;
}

export interface QuizQuestion {
  id: string;
  question: string; // markdown
  type: 'mcq' | 'short_answer' | 'true_false' | 'numerical';
  options?: string[];
  marks: number;
  topic_id: string;
  topic_title: string;
}

export interface QuizAnswer {
  question_id: string;
  answer: string;
  time_spent_seconds: number;
}

export interface QuizAttempt {
  id: string;
  quiz_id: string;
  answers: QuizAnswer[];
  score: number;
  total_marks: number;
  percentage: number;
  started_at: string;
  completed_at: string;
  topic_breakdown: TopicBreakdown[];
}

export interface TopicBreakdown {
  topic_id: string;
  topic_title: string;
  correct: number;
  total: number;
  percentage: number;
}

export interface QuizResult {
  attempt: QuizAttempt;
  explanations: Record<string, string>; // question_id -> explanation markdown
  weak_topics: { topic_id: string; topic_title: string; score_percentage: number }[];
}

export interface SubmitQuizRequest {
  answers: QuizAnswer[];
}

// Job
export type JobStatus = 'pending' | 'running' | 'completed' | 'failed';
export type JobType = 'parse_document' | 'generate_notes' | 'generate_cheatsheet' | 'generate_paper' | 'evaluate_quiz';

export interface Job {
  id: string;
  type: JobType;
  status: JobStatus;
  progress: number; // 0-100
  current_step?: string;
  result?: unknown;
  error?: string;
  created_at: string;
  updated_at: string;
}

// Dashboard
export interface DashboardData {
  subjects: Subject[];
  study_streak: number;
  weekly_study_minutes: WeeklyStudyMinutes[];
  quiz_score_trend: QuizScoreTrend[];
  weak_topics: WeakTopic[];
  continue_item?: ContinueItem;
  total_study_hours: number;
  total_notes_generated: number;
  total_quizzes_taken: number;
}

export interface WeeklyStudyMinutes {
  day: string;
  minutes: number;
}

export interface QuizScoreTrend {
  date: string;
  score: number;
  quiz_title: string;
}

export interface WeakTopic {
  topic_id: string;
  topic_title: string;
  subject_title: string;
  subject_id: string;
  score_percentage: number;
}

export interface ContinueItem {
  type: 'note' | 'quiz' | 'topic';
  id: string;
  title: string;
  subject_id: string;
  subject_title: string;
  description: string;
}

// Study Session
export interface StudySession {
  id: string;
  chapter_id: string;
  subject_id: string;
  duration_seconds: number;
  started_at: string;
  ended_at: string;
}

export interface LogStudySessionRequest {
  chapter_id: string;
  subject_id: string;
  duration_seconds: number;
}

// Progress Event
export interface ProgressEvent {
  id: string;
  user_id: string;
  event_type: 'topic_status_change' | 'note_generated' | 'quiz_completed' | 'study_session';
  payload: Record<string, unknown>;
  created_at: string;
}

// Chat
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  level?: ChatLevel;
  created_at: string;
}

export type ChatLevel = 'simple' | 'exam' | 'advanced';

export interface Citation {
  note_id: string;
  chapter_title: string;
  section: string;
  page?: number;
}

export interface SendChatRequest {
  subject_id: string;
  chapter_id?: string;
  message: string;
  level: ChatLevel;
  history: { role: 'user' | 'assistant'; content: string }[];
}

// API Error
export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}

// SSE Event
export interface SSEJobEvent {
  type: 'job_progress' | 'job_completed' | 'job_failed';
  job_id: string;
  progress?: number;
  current_step?: string;
  result?: unknown;
  error?: string;
}

export interface SSEChatEvent {
  type: 'chat_token' | 'chat_done' | 'chat_error' | 'chat_citation';
  token?: string;
  citation?: Citation;
  error?: string;
}

// Settings
export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  language: string;
}

export interface UpdateProfileRequest {
  name?: string;
  avatar_url?: string;
}

export interface UpdateSettingsRequest {
  theme?: 'light' | 'dark' | 'system';
  language?: string;
}

// Pagination
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// ─── LLM Providers & Academic Agents ──────────────────────────────

export type LLMProviderId = 'gemini' | 'openai' | 'anthropic' | 'groq' | 'deepseek' | 'custom';

export interface LLMProviderConfig {
  id: LLMProviderId;
  name: string;
  description: string;
  apiKey: string;
  defaultModel: string;
  availableModels: string[];
  baseUrl?: string;
  enabled: boolean;
  websiteUrl: string;
}

export type AgentId = 'tutor' | 'notes' | 'cheatsheet' | 'paper' | 'assessment' | 'verifier';

export interface AgentDefinition {
  id: AgentId;
  name: string;
  shortName: string;
  role: string;
  description: string;
  iconName: string;
  badgeColor: string;
  badgeBg: string;
  suggestedPrompts: string[];
  systemPrompt: string;
}

export interface ChatSession {
  id: string;
  title: string;
  agentId: AgentId;
  provider: LLMProviderId;
  model: string;
  subjectId?: string;
  chapterId?: string;
  level: ChatLevel;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}
