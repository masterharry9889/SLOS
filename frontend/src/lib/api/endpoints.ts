import { api, setTokens, clearTokens } from './client';
import type {
  User,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  TokenRefreshResponse,
  Subject,
  CreateSubjectRequest,
  UpdateSubjectRequest,
  Document,
  PresignedUploadResponse,
  TopicTree,
  TopicStatus,
  Note,
  GenerateNotesRequest,
  UpdateNoteRequest,
  Artifact,
  GenerateCheatSheetRequest,
  QuestionPaper,
  GenerateQuestionPaperRequest,
  Quiz,
  QuizAnswer,
  QuizResult,
  Job,
  DashboardData,
  StudySession,
  LogStudySessionRequest,
  ChatMessage,
  UserSettings,
  UpdateProfileRequest,
  UpdateSettingsRequest,
  LLMProviderId,
} from '@/types';

// ==========================================
// Authentication Endpoints
// ==========================================

interface BackendAuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
    avatarUrl: string | null;
    createdAt: string;
  };
  accessToken: string;
}

function normalizeAuthResponse(response: BackendAuthResponse): AuthResponse {
  return {
    user: {
      id: response.user.id,
      email: response.user.email,
      name: response.user.name,
      avatar_url: response.user.avatarUrl ?? undefined,
      created_at: response.user.createdAt,
      updated_at: response.user.createdAt,
    },
    access_token: response.accessToken,
  };
}

export async function login(data: LoginRequest): Promise<AuthResponse> {
  const normalized = normalizeAuthResponse(
    await api.post<BackendAuthResponse>('/auth/login', data),
  );
  if (normalized.access_token) {
    setTokens(normalized.access_token);
  }
  return normalized;
}

export async function register(data: RegisterRequest): Promise<AuthResponse> {
  const normalized = normalizeAuthResponse(
    await api.post<BackendAuthResponse>('/auth/register', data),
  );
  if (normalized.access_token) {
    setTokens(normalized.access_token);
  }
  return normalized;
}

export async function completeGoogleLogin(): Promise<AuthResponse> {
  const normalized = normalizeAuthResponse(
    await api.post<BackendAuthResponse>('/auth/refresh'),
  );
  if (normalized.access_token) {
    setTokens(normalized.access_token);
  }
  return normalized;
}

export async function refreshToken(): Promise<TokenRefreshResponse> {
  const response = await api.post<{ accessToken: string }>('/auth/refresh');
  const normalized = { access_token: response.accessToken };
  if (normalized.access_token) {
    setTokens(normalized.access_token);
  }
  return normalized;
}

export async function logout(): Promise<{ success: boolean }> {
  try {
    await api.post<void>('/auth/logout');
    return { success: true };
  } finally {
    clearTokens();
  }
}

function mapSubject(raw: Record<string, unknown>): Subject {
  return {
    id: String(raw.id),
    user_id: String(raw.userId ?? raw.user_id ?? ''),
    title: String(raw.title ?? ''),
    description: typeof raw.description === 'string' ? raw.description : undefined,
    color: typeof raw.color === 'string' ? raw.color : '#6366f1',
    exam_date: String(raw.examDate ?? raw.exam_date ?? '') || undefined,
    total_topics: Number(raw.total_topics ?? 0),
    completed_topics: Number(raw.completed_topics ?? 0),
    created_at: String(raw.createdAt ?? raw.created_at ?? ''),
    updated_at: String(raw.updatedAt ?? raw.updated_at ?? ''),
  };
}

// ==========================================
// Subjects Endpoints
// ==========================================

export async function getSubjects(): Promise<Subject[]> {
  const rows = await api.get<Record<string, unknown>[]>('/subjects');
  return rows.map(mapSubject);
}

export async function getSubject(id: string): Promise<Subject> {
  return mapSubject(await api.get<Record<string, unknown>>(`/subjects/${id}`));
}

export async function createSubject(data: CreateSubjectRequest): Promise<Subject> {
  return mapSubject(await api.post<Record<string, unknown>>('/subjects', {
    title: data.title,
    description: data.description,
    examDate: data.exam_date,
  }));
}

export async function updateSubject(
  id: string,
  data: UpdateSubjectRequest
): Promise<Subject> {
  return mapSubject(await api.patch<Record<string, unknown>>(`/subjects/${id}`, {
    title: data.title,
    description: data.description,
    examDate: data.exam_date,
  }));
}

export async function deleteSubject(id: string): Promise<{ success: boolean }> {
  await api.delete<void>(`/subjects/${id}`);
  return { success: true };
}

// ==========================================
// Documents Endpoints
// ==========================================

export async function getPresignedUrl(
  subjectId: string,
  filename: string,
  fileType: string,
  fileSize: number
): Promise<PresignedUploadResponse> {
  const extension = filename.split('.').pop()?.toLowerCase();
  const mimeType = extension === 'pdf'
    ? 'application/pdf'
    : extension === 'docx'
      ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      : extension === 'png'
        ? 'image/png'
        : extension === 'jpg' || extension === 'jpeg'
          ? 'image/jpeg'
          : null;
  if (!mimeType || fileType === 'image' && !['png', 'jpg', 'jpeg'].includes(extension ?? '')) {
    throw new Error('Unsupported file type. Upload a PDF, DOCX, PNG, or JPG file.');
  }
  const response = await api.post<{ uploadUrl: string; fileKey: string; expiresIn: number }>(
    '/documents/upload-url',
    { subjectId, fileName: filename, fileSize, mimeType },
  );
  return { upload_url: response.uploadUrl, file_key: response.fileKey };
}

export async function registerDocument(input: {
  subjectId: string;
  fileKey: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  sourceType?: 'syllabus' | 'content';
}): Promise<Document> {
  const raw = await api.post<Record<string, unknown>>('/documents', {
    ...input,
    sourceType: input.sourceType ?? 'content',
  });
  const document = raw.document as Record<string, unknown> | undefined;
  const value = document ?? raw;
  return {
    id: String(value.id),
    subject_id: String(value.subjectId ?? input.subjectId),
    filename: String(value.fileName ?? input.fileName),
    file_type: input.mimeType === 'application/pdf' ? 'pdf'
      : input.mimeType.includes('wordprocessingml') ? 'docx' : 'image',
    file_url: '',
    file_size: Number(value.fileSize ?? input.fileSize),
    status: 'processing',
    created_at: String(value.createdAt ?? new Date().toISOString()),
  };
}

export async function getDocuments(subjectId: string): Promise<Document[]> {
  const rows = await api.get<Record<string, unknown>[]>(`/subjects/${subjectId}/documents`);
  return rows.map((row) => ({
    id: String(row.id),
    subject_id: String(row.subjectId ?? subjectId),
    filename: String(row.fileName ?? ''),
    file_type: row.mimeType === 'application/pdf' ? 'pdf'
      : typeof row.mimeType === 'string' && row.mimeType.includes('wordprocessingml') ? 'docx' : 'image',
    file_url: '',
    file_size: Number(row.fileSize ?? 0),
    status: row.status === 'parsed' ? 'processed' : row.status === 'error' ? 'failed' : 'processing',
    created_at: String(row.createdAt ?? ''),
  }));
}

// ==========================================
// Topic Tree Endpoints
// ==========================================

export async function getTopicTree(subjectId: string): Promise<TopicTree> {
  const tree = await api.get<TopicTree>(`/subjects/${subjectId}/topics`);
  return {
    ...tree,
    units: tree.units.map((unit) => ({
      ...unit,
      chapters: unit.chapters.map((chapter) => ({
        ...chapter,
        concepts: chapter.concepts.map((concept) =>
          typeof concept === 'string'
            ? { id: `${chapter.id}-${concept}`, title: concept }
            : concept,
        ),
      })),
    })),
  };
}

export async function updateTopicTree(
  subjectId: string,
  tree: TopicTree
): Promise<TopicTree> {
  return api.put<TopicTree>(`/subjects/${subjectId}/topic-tree`, tree);
}

export async function updateTopicStatus(
  subjectId: string,
  topicId: string,
  status: TopicStatus
): Promise<{ success: boolean; topic_id: string; status: TopicStatus }> {
  await api.patch(`/topics/${topicId}`, { status });
  return { success: true, topic_id: topicId, status };
}

export async function confirmTopicTree(
  subjectId: string
): Promise<{ success: boolean; message: string }> {
  return api.post<{ success: boolean; message: string }>(`/subjects/${subjectId}/topic-tree/confirm`);
}

// ==========================================
// Notes Endpoints
// ==========================================

export async function getNotes(
  subjectId: string,
  chapterId?: string
): Promise<Note[]> {
  const rows = chapterId
    ? await api.get<Record<string, unknown>[]>(`/topics/${encodeURIComponent(chapterId)}/notes`)
    : await api.get<Record<string, unknown>[]>(`/subjects/${encodeURIComponent(subjectId)}/notes`);
  return rows.map((row) => {
    const topic = row.topic as Record<string, unknown> | undefined;
    const createdAt = String(row.createdAt ?? '');
    return {
      id: String(row.id),
      chapter_id: String(row.topicId ?? topic?.id ?? chapterId ?? ''),
      subject_id: String(topic?.subjectId ?? subjectId),
      content: String(row.content ?? ''),
      depth: String(row.depth ?? 'standard') as Note['depth'],
      version: Number(row.version ?? 1),
      word_count: String(row.content ?? '').trim().split(/\s+/).filter(Boolean).length,
      created_at: createdAt,
      updated_at: createdAt,
    };
  });
}

export async function getNote(noteId: string): Promise<Note> {
  const rows = await api.get<Record<string, unknown>>(`/notes/${noteId}`);
  const createdAt = String(rows.createdAt ?? '');
  return {
    id: String(rows.id),
    chapter_id: String(rows.topicId ?? ''),
    subject_id: '',
    content: String(rows.content ?? ''),
    depth: String(rows.depth ?? 'standard') as Note['depth'],
    version: Number(rows.version ?? 1),
    word_count: String(rows.content ?? '').trim().split(/\s+/).filter(Boolean).length,
    created_at: createdAt,
    updated_at: createdAt,
  };
}

export async function generateNotes(
  data: GenerateNotesRequest
): Promise<{ job_id: string }> {
  return api.post<{ job_id: string }>(`/topics/${encodeURIComponent(data.chapter_id)}/notes/generate`, {
    depth: data.depth,
    mode: 'grounded',
  });
}

export async function updateNote(
  noteId: string,
  data: UpdateNoteRequest
): Promise<Note> {
  const row = await api.patch<Record<string, unknown>>(`/notes/${noteId}`, data);
  const createdAt = String(row.createdAt ?? '');
  return {
    id: String(row.id),
    chapter_id: String(row.topicId ?? ''),
    subject_id: '',
    content: String(row.content ?? ''),
    depth: String(row.depth ?? 'standard') as Note['depth'],
    version: Number(row.version ?? 1),
    word_count: String(row.content ?? '').trim().split(/\s+/).filter(Boolean).length,
    created_at: createdAt,
    updated_at: createdAt,
  };
}

// ==========================================
// Artifacts Endpoints (Cheatsheet & Question Paper)
// ==========================================

function mapArtifact(row: Record<string, unknown>): Artifact {
  return {
    id: String(row.id),
    subject_id: String(row.subjectId ?? row.subject_id ?? ''),
    type: String(row.type) as Artifact['type'],
    title: String(row.title ?? ''),
    content: String(row.content ?? ''),
    metadata: (row.metadata as Record<string, unknown> | null) ?? {},
    created_at: String(row.createdAt ?? row.created_at ?? ''),
  };
}

export async function getCheatSheets(subjectId: string): Promise<Artifact[]> {
  const rows = await api.get<Record<string, unknown>[]>(`/subjects/${subjectId}/artifacts?type=cheatsheet`);
  return rows.map(mapArtifact);
}

export async function generateCheatSheet(
  data: GenerateCheatSheetRequest
): Promise<{ job_id: string }> {
  return api.post<{ job_id: string }>('/artifacts/cheatsheet', data);
}

export async function getQuestionPapers(
  subjectId: string
): Promise<QuestionPaper[]> {
  const rows = await api.get<Record<string, unknown>[]>(`/subjects/${subjectId}/question-papers`);
  return rows.map((row) => {
    const metadata = (row.metadata as Record<string, unknown> | null) ?? {};
    return {
      id: String(row.id),
      subject_id: String(row.subjectId ?? subjectId),
      title: String(row.title ?? ''),
      questions: formatPaperContent(String(row.content ?? '')),
      answer_key: formatArtifactSection(metadata.answer_key),
      marking_scheme: formatArtifactSection(metadata.marking_scheme),
      total_marks: Number(metadata.total_marks ?? 0),
      duration_minutes: Number(metadata.duration_minutes ?? 0),
      created_at: String(row.createdAt ?? ''),
    };
  });
}

export function formatArtifactSection(value: unknown): string {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return '';
  return Object.entries(value)
    .map(([question, answer]) => `- **${question}:** ${typeof answer === 'string' ? answer : JSON.stringify(answer)}`)
    .join('\n');
}

export function formatPaperContent(content: string): string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return content;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return content;
  const questions = (parsed as Record<string, unknown>).questions;
  if (!Array.isArray(questions)) return content;

  return questions.map((value, index) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return '';
    const question = value as Record<string, unknown>;
    const id = typeof question.id === 'string' ? question.id : `Q${index + 1}`;
    const text = typeof question.text === 'string'
      ? question.text
      : typeof question.question === 'string' ? question.question : '';
    const marks = typeof question.marks === 'number' ? ` **[${question.marks} Marks]**` : '';
    const options = question.options;
    const optionsText = options && typeof options === 'object' && !Array.isArray(options)
      ? Object.entries(options).map(([key, option]) => `- **${key}.** ${String(option)}`).join('\n')
      : Array.isArray(options)
        ? options.map((option, optionIndex) => `- **${String.fromCharCode(65 + optionIndex)}.** ${String(option)}`).join('\n')
        : '';
    return `### ${id}${marks}\n\n${text}${optionsText ? `\n\n${optionsText}` : ''}`;
  }).filter(Boolean).join('\n\n');
}

export async function generateQuestionPaper(
  data: GenerateQuestionPaperRequest
): Promise<{ job_id: string }> {
  return api.post<{ job_id: string }>('/artifacts/question-paper', data);
}

// ==========================================
// Quiz Endpoints
// ==========================================

export async function getQuizzes(subjectId: string): Promise<Quiz[]> {
  const rows = await api.get<Record<string, unknown>[]>(`/subjects/${subjectId}/quizzes`);
  return rows.map((row) => ({
    id: String(row.id),
    subject_id: String(row.subjectId ?? subjectId),
    title: String(row.title ?? ''),
    questions: (Array.isArray(row.questions) ? row.questions : []) as Quiz['questions'],
    total_marks: Number(row.total_marks ?? 0),
    duration_minutes: Number(row.duration_minutes ?? 15),
    created_at: String(row.createdAt ?? ''),
  }));
}

export async function getQuiz(quizId: string): Promise<Quiz> {
  const row = await api.get<Record<string, unknown>>(`/quizzes/${quizId}`);
  return {
    id: String(row.id),
    subject_id: String(row.subjectId ?? ''),
    title: String(row.title ?? ''),
    questions: (Array.isArray(row.questions) ? row.questions : []) as Quiz['questions'],
    total_marks: Number(row.total_marks ?? 0),
    duration_minutes: Number(row.duration_minutes ?? 15),
    created_at: String(row.createdAt ?? ''),
  };
}

export async function startQuiz(
  quizId: string
): Promise<{ attempt_id: string; quiz: Quiz; started_at: string }> {
  return api.post<{ attempt_id: string; quiz: Quiz; started_at: string }>(
    `/quizzes/${quizId}/start`
  );
}

export async function submitQuiz(
  quizId: string,
  attemptId: string,
  answers: QuizAnswer[]
): Promise<{ job_id: string; attempt_id: string }> {
  return api.post<{ job_id: string; attempt_id: string }>(
    `/quizzes/${quizId}/attempts/${attemptId}/submit`,
    { answers }
  );
}

export async function getQuizResult(
  quizId: string,
  attemptId: string
): Promise<QuizResult> {
  return api.get<QuizResult>(`/quizzes/${quizId}/attempts/${attemptId}/result`);
}

// ==========================================
// Dashboard Endpoints
// ==========================================

export async function getDashboard(): Promise<DashboardData> {
  return api.get<DashboardData>('/progress/dashboard');
}

// ==========================================
// Study Sessions Endpoints
// ==========================================

export async function logStudySession(
  data: LogStudySessionRequest
): Promise<StudySession> {
  return api.post<StudySession>('/study-sessions', data);
}

// ==========================================
// Chat Endpoints
// ==========================================

export async function getChatHistory(
  subjectId: string,
  chapterId?: string
): Promise<ChatMessage[]> {
  const query = chapterId ? `&chapter_id=${encodeURIComponent(chapterId)}` : '';
  return api.get<ChatMessage[]>(`/chat/history?subject_id=${encodeURIComponent(subjectId)}${query}`);
}

// ==========================================
// Job Polling / Status Endpoints
// ==========================================

export async function getJob(jobId: string): Promise<Job> {
  const raw = await api.get<Record<string, unknown>>(`/jobs/${jobId}`);
  const status = raw.status === 'completed' ? 'completed'
    : raw.status === 'failed' ? 'failed'
      : raw.status === 'processing' ? 'running' : 'pending';
  return {
    id: String(raw.id),
    type: String(raw.type) as Job['type'],
    status,
    progress: status === 'completed' ? 100 : 0,
    result: raw.result,
    error: typeof raw.error === 'string' ? raw.error : undefined,
    created_at: String(raw.createdAt ?? ''),
    updated_at: String(raw.updatedAt ?? ''),
  };
}

// ==========================================
// User Settings & Profile Endpoints
// ==========================================

export async function getSettings(): Promise<UserSettings> {
  return api.get<UserSettings>('/settings');
}

export async function updateProfile(data: UpdateProfileRequest): Promise<User> {
  return api.patch<User>('/users/me', data);
}

export async function updateSettings(
  data: UpdateSettingsRequest
): Promise<UserSettings> {
  return api.patch<UserSettings>('/settings', data);
}

export interface SaveLLMProviderRequest {
  providerId: LLMProviderId;
  apiKey?: string;
  model: string;
  baseUrl?: string;
}

export async function saveLLMProvider(
  data: SaveLLMProviderRequest,
): Promise<UserSettings> {
  return api.post<UserSettings>('/settings/llm/providers', data);
}

export async function selectLLMProvider(
  providerId: LLMProviderId,
): Promise<UserSettings> {
  return api.patch<UserSettings>('/settings/llm/active', { providerId });
}

export async function removeLLMProvider(
  providerId: LLMProviderId,
): Promise<UserSettings> {
  return api.delete<UserSettings>(`/settings/llm/providers/${providerId}`);
}

export async function exportData(): Promise<{ download_url: string }> {
  return api.post<{ download_url: string }>('/settings/export');
}

export async function deleteAccount(): Promise<{ success: boolean }> {
  return api.delete<{ success: boolean }>('/users/me');
}

// ==========================================
// Health Check Endpoint
// ==========================================

export async function healthCheck(): Promise<{ status: string; timestamp: string }> {
  return api.get<{ status: string; timestamp: string }>('/health');
}
