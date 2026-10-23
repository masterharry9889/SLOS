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
} from '@/types';

// ==========================================
// Authentication Endpoints
// ==========================================

export async function login(data: LoginRequest): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>('/auth/login', data);
  if (response.access_token) {
    setTokens(response.access_token, response.refresh_token);
  }
  return response;
}

export async function register(data: RegisterRequest): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>('/auth/register', data);
  if (response.access_token) {
    setTokens(response.access_token, response.refresh_token);
  }
  return response;
}

export async function googleLogin(token: string): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>('/auth/google', { token });
  if (response.access_token) {
    setTokens(response.access_token, response.refresh_token);
  }
  return response;
}

export async function refreshToken(refreshTokenStr: string): Promise<TokenRefreshResponse> {
  const response = await api.post<TokenRefreshResponse>('/auth/refresh', {
    refresh_token: refreshTokenStr,
  });
  if (response.access_token) {
    setTokens(response.access_token);
  }
  return response;
}

export async function logout(): Promise<{ success: boolean }> {
  try {
    return await api.post<{ success: boolean }>('/auth/logout');
  } finally {
    clearTokens();
  }
}

// ==========================================
// Subjects Endpoints
// ==========================================

export async function getSubjects(): Promise<Subject[]> {
  return api.get<Subject[]>('/subjects');
}

export async function getSubject(id: string): Promise<Subject> {
  return api.get<Subject>(`/subjects/${id}`);
}

export async function createSubject(data: CreateSubjectRequest): Promise<Subject> {
  return api.post<Subject>('/subjects', data);
}

export async function updateSubject(
  id: string,
  data: UpdateSubjectRequest
): Promise<Subject> {
  return api.patch<Subject>(`/subjects/${id}`, data);
}

export async function deleteSubject(id: string): Promise<{ success: boolean }> {
  return api.delete<{ success: boolean }>(`/subjects/${id}`);
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
  return api.post<PresignedUploadResponse>(`/subjects/${subjectId}/documents/presigned`, {
    filename,
    file_type: fileType,
    file_size: fileSize,
  });
}

export async function confirmUpload(
  documentId: string,
  success: boolean
): Promise<Document> {
  return api.post<Document>(`/documents/${documentId}/confirm`, { success });
}

export async function getDocuments(subjectId: string): Promise<Document[]> {
  return api.get<Document[]>(`/subjects/${subjectId}/documents`);
}

// ==========================================
// Topic Tree Endpoints
// ==========================================

export async function getTopicTree(subjectId: string): Promise<TopicTree> {
  return api.get<TopicTree>(`/subjects/${subjectId}/topic-tree`);
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
  return api.patch<{ success: boolean; topic_id: string; status: TopicStatus }>(
    `/subjects/${subjectId}/topics/${topicId}/status`,
    { status }
  );
}

export async function confirmTopicTree(
  subjectId: string
): Promise<{ success: boolean; message: string }> {
  return api.post<{ success: boolean; message: string }>(
    `/subjects/${subjectId}/topic-tree/confirm`
  );
}

// ==========================================
// Notes Endpoints
// ==========================================

export async function getNotes(
  subjectId: string,
  chapterId?: string
): Promise<Note[]> {
  const query = chapterId ? `?chapter_id=${encodeURIComponent(chapterId)}` : '';
  return api.get<Note[]>(`/subjects/${subjectId}/notes${query}`);
}

export async function getNote(noteId: string): Promise<Note> {
  return api.get<Note>(`/notes/${noteId}`);
}

export async function generateNotes(
  data: GenerateNotesRequest
): Promise<{ job_id: string }> {
  return api.post<{ job_id: string }>('/notes/generate', data);
}

export async function updateNote(
  noteId: string,
  data: UpdateNoteRequest
): Promise<Note> {
  return api.patch<Note>(`/notes/${noteId}`, data);
}

// ==========================================
// Artifacts Endpoints (Cheatsheet & Question Paper)
// ==========================================

export async function getCheatSheets(subjectId: string): Promise<Artifact[]> {
  return api.get<Artifact[]>(`/subjects/${subjectId}/artifacts?type=cheatsheet`);
}

export async function generateCheatSheet(
  data: GenerateCheatSheetRequest
): Promise<{ job_id: string }> {
  return api.post<{ job_id: string }>('/artifacts/cheatsheet/generate', data);
}

export async function getQuestionPapers(
  subjectId: string
): Promise<QuestionPaper[]> {
  return api.get<QuestionPaper[]>(`/subjects/${subjectId}/question-papers`);
}

export async function generateQuestionPaper(
  data: GenerateQuestionPaperRequest
): Promise<{ job_id: string }> {
  return api.post<{ job_id: string }>('/artifacts/question-paper/generate', data);
}

// ==========================================
// Quiz Endpoints
// ==========================================

export async function getQuizzes(subjectId: string): Promise<Quiz[]> {
  return api.get<Quiz[]>(`/subjects/${subjectId}/quizzes`);
}

export async function getQuiz(quizId: string): Promise<Quiz> {
  return api.get<Quiz>(`/quizzes/${quizId}`);
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
  return api.get<DashboardData>('/dashboard');
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
  return api.get<Job>(`/jobs/${jobId}`);
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
