import { http, HttpResponse, delay } from 'msw';
import {
  mockUser,
  mockSubjects,
  mockTopicTree,
  mockNotes,
  mockCheatSheet,
  mockQuestionPaper,
  mockQuiz,
  mockQuizResult,
  mockDashboard,
  mockJobs,
  mockSettings,
  mockDocuments,
  mockChatMessages,
  type Subject,
  type Note,
  type UserSettings,
  type Job,
} from './data';

const BASE_URL = '*/api/v1';

// Mutable in-memory state for mock sessions
let currentSubjects = [...mockSubjects];
let currentTopicTree = { ...mockTopicTree };
let currentNotes = { ...mockNotes };
let currentSettings = { ...mockSettings };
let currentUser = { ...mockUser };

// Job progress tracker state
const dynamicJobs: Record<string, Job> = { ...mockJobs };
const jobPollCounters: Record<string, number> = {};

export const handlers = [
  // ─── Health ──────────────────────────────────────────────────────────────
  http.get(`${BASE_URL}/health`, async () => {
    await delay(100);
    return HttpResponse.json({ status: 'ok', timestamp: new Date().toISOString() });
  }),

  // Also support bare /health
  http.get('/health', async () => {
    await delay(100);
    return HttpResponse.json({ status: 'ok', timestamp: new Date().toISOString() });
  }),

  // ─── Auth ────────────────────────────────────────────────────────────────
  http.post(`${BASE_URL}/auth/login`, async ({ request }) => {
    await delay(200);
    let email = currentUser.email;
    try {
      const body = (await request.json()) as { email?: string; password?: string };
      if (body?.email) email = body.email;
    } catch {
      // ignore parse errors
    }

    return HttpResponse.json({
      user: {
        ...currentUser,
        email,
      },
      accessToken: 'mock-jwt-access-token-alex-chen-2026',
      refreshToken: 'mock-jwt-refresh-token-alex-chen-2026',
      expiresIn: 3600,
    });
  }),

  http.post(`${BASE_URL}/auth/register`, async ({ request }) => {
    await delay(250);
    let bodyName = currentUser.name;
    let bodyEmail = currentUser.email;

    try {
      const body = (await request.json()) as { name?: string; email?: string; password?: string };
      if (body?.name) bodyName = body.name;
      if (body?.email) bodyEmail = body.email;
    } catch {
      // ignore
    }

    const registeredUser = {
      ...currentUser,
      id: `usr-${Date.now()}`,
      name: bodyName,
      email: bodyEmail,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return HttpResponse.json(
      {
        user: registeredUser,
        accessToken: 'mock-jwt-access-token-registered-2026',
        refreshToken: 'mock-jwt-refresh-token-registered-2026',
        expiresIn: 3600,
      },
      { status: 201 }
    );
  }),

  http.post(`${BASE_URL}/auth/refresh`, async () => {
    await delay(150);
    return HttpResponse.json({
      accessToken: `mock-jwt-refreshed-token-${Date.now()}`,
      expiresIn: 3600,
    });
  }),

  http.post(`${BASE_URL}/auth/logout`, async () => {
    await delay(100);
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${BASE_URL}/auth/me`, async () => {
    await delay(100);
    return HttpResponse.json(currentUser);
  }),

  // ─── Subjects ────────────────────────────────────────────────────────────
  http.get(`${BASE_URL}/subjects`, async () => {
    await delay(200);
    return HttpResponse.json(currentSubjects);
  }),

  http.get(`${BASE_URL}/subjects/:id`, async ({ params }) => {
    await delay(150);
    const subjectId = params.id as string;
    const found = currentSubjects.find((s) => s.id === subjectId) || currentSubjects[0];
    return HttpResponse.json(found);
  }),

  http.post(`${BASE_URL}/subjects`, async ({ request }) => {
    await delay(250);
    let bodyData: Partial<Subject> = {};
    try {
      bodyData = (await request.json()) as Partial<Subject>;
    } catch {
      // default
    }

    const newSubject: Subject = {
      id: `sub-${Date.now().toString(36)}`,
      userId: currentUser.id,
      title: bodyData.title || 'Computer Networks',
      code: bodyData.code || 'CS-304',
      description: bodyData.description || 'OSI stack, TCP/IP, routing, and network security.',
      examDate: bodyData.examDate || new Date(Date.now() + 30 * 86400000).toISOString(),
      progress: 0,
      completedTopics: 0,
      totalTopics: 25,
      color: bodyData.color || '#F59E0B',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    currentSubjects = [newSubject, ...currentSubjects];
    return HttpResponse.json(newSubject, { status: 201 });
  }),

  // ─── Documents ───────────────────────────────────────────────────────────
  http.get(`${BASE_URL}/subjects/:id/documents`, async () => {
    await delay(150);
    return HttpResponse.json(mockDocuments);
  }),

  http.post(`${BASE_URL}/subjects/:id/documents/presigned-url`, async ({ params }) => {
    await delay(200);
    const subjectId = params.id as string;
    const fakeKey = `uploads/${currentUser.id}/${subjectId}/syllabus_${Date.now()}.pdf`;

    return HttpResponse.json({
      uploadUrl: `https://mock-s3-bucket.s3.amazonaws.com/${fakeKey}?AWSAccessKeyId=MOCK&Signature=MOCK_SIG`,
      fileKey: fakeKey,
      expiresIn: 3600,
    });
  }),

  // Also support /documents/upload-url
  http.post(`${BASE_URL}/documents/upload-url`, async () => {
    await delay(200);
    const fakeKey = `uploads/${currentUser.id}/doc_${Date.now()}.pdf`;
    return HttpResponse.json({
      uploadUrl: `https://mock-s3-bucket.s3.amazonaws.com/${fakeKey}?AWSAccessKeyId=MOCK&Signature=MOCK_SIG`,
      fileKey: fakeKey,
      expiresIn: 3600,
    });
  }),

  http.post(`${BASE_URL}/subjects/:id/documents/:docId/confirm`, async ({ params }) => {
    await delay(250);
    const docId = params.docId as string;
    const subjectId = params.id as string;

    const confirmedDoc = {
      id: docId || `doc-${Date.now()}`,
      userId: currentUser.id,
      subjectId,
      fileName: 'CS301_Syllabus.pdf',
      fileKey: `uploads/${currentUser.id}/${subjectId}/CS301_Syllabus.pdf`,
      fileSize: 245890,
      mimeType: 'application/pdf',
      sourceType: 'syllabus',
      status: 'uploaded',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return HttpResponse.json(confirmedDoc, { status: 200 });
  }),

  // ─── Topics ──────────────────────────────────────────────────────────────
  http.get(`${BASE_URL}/subjects/:id/topics`, async () => {
    await delay(200);
    return HttpResponse.json(currentTopicTree);
  }),

  http.get(`${BASE_URL}/subjects/:id/topic-tree`, async () => {
    await delay(200);
    return HttpResponse.json(currentTopicTree);
  }),

  http.put(`${BASE_URL}/subjects/:id/topics`, async ({ request }) => {
    await delay(250);
    try {
      const updatedTree = (await request.json()) as Partial<typeof currentTopicTree> | null;
      if (updatedTree) {
        currentTopicTree = { ...currentTopicTree, ...updatedTree, updatedAt: new Date().toISOString() };
      }
    } catch {
      // keep existing
    }
    return HttpResponse.json(currentTopicTree);
  }),

  http.put(`${BASE_URL}/subjects/:id/topic-tree`, async ({ request }) => {
    await delay(250);
    try {
      const updatedTree = (await request.json()) as Partial<typeof currentTopicTree> | null;
      if (updatedTree) {
        currentTopicTree = { ...currentTopicTree, ...updatedTree, updatedAt: new Date().toISOString() };
      }
    } catch {
      // keep existing
    }
    return HttpResponse.json(currentTopicTree);
  }),

  http.patch(`${BASE_URL}/subjects/:id/topics/:topicId/status`, async ({ params, request }) => {
    await delay(150);
    const topicId = params.topicId as string;
    let status = 'studied';

    try {
      const body = (await request.json()) as { status?: string };
      if (body?.status) status = body.status;
    } catch {
      // keep studied
    }

    // Recursively update status in mockTopicTree if matching node is found
    for (const unit of currentTopicTree.units) {
      if (unit.id === topicId) unit.status = status as typeof unit.status;
      for (const chapter of unit.chapters) {
        if (chapter.id === topicId) chapter.status = status as typeof chapter.status;
        for (const concept of chapter.concepts) {
          if (concept.id === topicId) concept.status = status as typeof concept.status;
        }
      }
    }

    return HttpResponse.json({
      id: topicId,
      status,
      updatedAt: new Date().toISOString(),
    });
  }),

  http.post(`${BASE_URL}/subjects/:id/topics/confirm`, async () => {
    await delay(200);
    currentTopicTree.confirmed = true;
    currentTopicTree.updatedAt = new Date().toISOString();
    return HttpResponse.json({
      success: true,
      confirmed: true,
      updatedAt: currentTopicTree.updatedAt,
    });
  }),

  http.post(`${BASE_URL}/subjects/:id/topic-tree/confirm`, async () => {
    await delay(200);
    currentTopicTree.confirmed = true;
    currentTopicTree.updatedAt = new Date().toISOString();
    return HttpResponse.json({
      success: true,
      message: 'Topic tree confirmed successfully',
      confirmed: true,
      updatedAt: currentTopicTree.updatedAt,
    });
  }),

  // ─── Notes ───────────────────────────────────────────────────────────────
  http.get(`${BASE_URL}/subjects/:id/notes/:chapterId`, async () => {
    await delay(200);
    return HttpResponse.json(currentNotes);
  }),

  // Also support /topics/:chapterId/notes
  http.get(`${BASE_URL}/topics/:chapterId/notes`, async () => {
    await delay(200);
    return HttpResponse.json(currentNotes);
  }),

  http.post(`${BASE_URL}/subjects/:id/notes/generate`, async () => {
    await delay(300);
    const newJobId = `job-gen-notes-${Date.now().toString(36)}`;
    dynamicJobs[newJobId] = {
      id: newJobId,
      userId: currentUser.id,
      type: 'generate_notes',
      status: 'queued',
      progress: 0,
      payload: { chapterId: 'top-u3-c1' },
      attempts: 0,
      maxAttempts: 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return HttpResponse.json(
      {
        job_id: newJobId,
        status: 'queued',
        message: 'Note generation job queued successfully',
      },
      { status: 202 }
    );
  }),

  http.put(`${BASE_URL}/subjects/:id/notes/:noteId`, async ({ request }) => {
    await delay(250);
    try {
      const body = (await request.json()) as Partial<Note>;
      currentNotes = {
        ...currentNotes,
        ...body,
        version: currentNotes.version + 1,
        updatedAt: new Date().toISOString(),
      };
    } catch {
      // default
    }

    return HttpResponse.json(currentNotes);
  }),

  // ─── Cheat Sheets ────────────────────────────────────────────────────────
  http.post(`${BASE_URL}/subjects/:id/cheatsheets/generate`, async () => {
    await delay(300);
    const newJobId = `job-gen-cs-${Date.now().toString(36)}`;
    dynamicJobs[newJobId] = {
      id: newJobId,
      userId: currentUser.id,
      type: 'generate_cheatsheet',
      status: 'queued',
      progress: 0,
      payload: { unitId: 'top-u3-trees' },
      attempts: 0,
      maxAttempts: 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return HttpResponse.json(
      {
        job_id: newJobId,
        status: 'queued',
        message: 'Cheatsheet generation job queued successfully',
      },
      { status: 202 }
    );
  }),

  http.get(`${BASE_URL}/subjects/:id/cheatsheets`, async () => {
    await delay(200);
    return HttpResponse.json([mockCheatSheet]);
  }),

  // ─── Question Papers ─────────────────────────────────────────────────────
  http.post(`${BASE_URL}/subjects/:id/papers/generate`, async () => {
    await delay(300);
    const newJobId = `job-gen-paper-${Date.now().toString(36)}`;
    dynamicJobs[newJobId] = {
      id: newJobId,
      userId: currentUser.id,
      type: 'generate_paper',
      status: 'queued',
      progress: 0,
      payload: { unitId: 'top-u3-trees' },
      attempts: 0,
      maxAttempts: 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return HttpResponse.json(
      {
        job_id: newJobId,
        status: 'queued',
        message: 'Question paper generation job queued successfully',
      },
      { status: 202 }
    );
  }),

  http.get(`${BASE_URL}/subjects/:id/papers`, async () => {
    await delay(200);
    return HttpResponse.json([mockQuestionPaper]);
  }),

  // ─── Quizzes ─────────────────────────────────────────────────────────────
  http.get(`${BASE_URL}/subjects/:id/quizzes`, async () => {
    await delay(200);
    return HttpResponse.json([mockQuiz]);
  }),

  http.get(`${BASE_URL}/subjects/:id/quizzes/:quizId`, async () => {
    await delay(150);
    return HttpResponse.json(mockQuiz);
  }),

  // Also support /quizzes/:quizId
  http.get(`${BASE_URL}/quizzes/:quizId`, async () => {
    await delay(150);
    return HttpResponse.json(mockQuiz);
  }),

  http.post(`${BASE_URL}/subjects/:id/quizzes/:quizId/submit`, async () => {
    await delay(350);
    return HttpResponse.json(mockQuizResult);
  }),

  // Also support /attempts/:id/submit
  http.post(`${BASE_URL}/attempts/:id/submit`, async () => {
    await delay(350);
    return HttpResponse.json(mockQuizResult);
  }),

  // ─── Dashboard ───────────────────────────────────────────────────────────
  http.get(`${BASE_URL}/dashboard`, async () => {
    await delay(200);
    return HttpResponse.json(mockDashboard);
  }),

  // Also support /progress/dashboard
  http.get(`${BASE_URL}/progress/dashboard`, async () => {
    await delay(200);
    return HttpResponse.json(mockDashboard);
  }),

  // ─── Jobs & Progress Simulation ───────────────────────────────────────────
  http.get(`${BASE_URL}/jobs/:id`, async ({ params }) => {
    await delay(150);
    const jobId = params.id as string;

    // Track poll iterations to simulate realistic progress progression
    const count = (jobPollCounters[jobId] || 0) + 1;
    jobPollCounters[jobId] = count;

    let job = dynamicJobs[jobId];

    if (!job) {
      // Create dynamically if unknown
      job = {
        id: jobId,
        userId: currentUser.id,
        type: 'generate_notes',
        status: count >= 3 ? 'completed' : count >= 1 ? 'processing' : 'queued',
        progress: Math.min(count * 35, 100),
        payload: {},
        attempts: 1,
        maxAttempts: 3,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      dynamicJobs[jobId] = job;
    } else if (job.status === 'processing' || job.status === 'queued') {
      // Advance progress automatically over subsequent polling requests
      const newProgress = Math.min((job.progress || 0) + 35, 100);
      const isComplete = newProgress >= 100;
      job = {
        ...job,
        progress: newProgress,
        status: isComplete ? 'completed' : 'processing',
        updatedAt: new Date().toISOString(),
        completedAt: isComplete ? new Date().toISOString() : undefined,
      };
      dynamicJobs[jobId] = job;
    }

    return HttpResponse.json(job);
  }),

  // ─── Study Sessions ───────────────────────────────────────────────────────
  http.post(`${BASE_URL}/study-sessions`, async () => {
    await delay(150);
    return HttpResponse.json(
      {
        success: true,
        sessionId: `sess-${Date.now()}`,
        startedAt: new Date().toISOString(),
      },
      { status: 201 }
    );
  }),

  // Also support /progress/events
  http.post(`${BASE_URL}/progress/events`, async ({ request }) => {
    await delay(150);
    let body: Record<string, unknown> = {};
    try {
      const parsed = (await request.json()) as Record<string, unknown> | null;
      if (parsed) body = parsed;
    } catch {
      // ignore
    }
    return HttpResponse.json(
      {
        success: true,
        eventId: `evt-${Date.now()}`,
        event: body,
      },
      { status: 201 }
    );
  }),

  // ─── Chat ─────────────────────────────────────────────────────────────────
  http.post(`${BASE_URL}/chat`, async ({ request }) => {
    await delay(300);
    let messageText = 'Can you explain tree traversals?';
    try {
      const body = (await request.json()) as { message?: string };
      if (body?.message) messageText = body.message;
    } catch {
      // ignore
    }

    const replyMessage = {
      id: `msg-${Date.now()}`,
      role: 'assistant' as const,
      content: `Here is a detailed explanation regarding: "${messageText}".\n\nIn-order traversal visits left-subtree, current node, and right-subtree in sequence. In a Binary Search Tree (BST), this produces sorted keys in $O(n)$ time with $O(h)$ stack space.`,
      timestamp: new Date().toISOString(),
    };

    return HttpResponse.json({
      reply: replyMessage.content,
      message: replyMessage,
    });
  }),

  http.get(`${BASE_URL}/chat/messages`, async () => {
    await delay(150);
    return HttpResponse.json(mockChatMessages);
  }),

  // ─── Settings ─────────────────────────────────────────────────────────────
  http.get(`${BASE_URL}/settings`, async () => {
    await delay(150);
    return HttpResponse.json(currentSettings);
  }),

  http.put(`${BASE_URL}/settings/profile`, async ({ request }) => {
    await delay(200);
    try {
      const body = (await request.json()) as Partial<typeof currentUser>;
      currentUser = {
        ...currentUser,
        ...body,
        updatedAt: new Date().toISOString(),
      };
    } catch {
      // keep
    }
    return HttpResponse.json(currentUser);
  }),

  http.put(`${BASE_URL}/settings`, async ({ request }) => {
    await delay(200);
    try {
      const body = (await request.json()) as Partial<UserSettings>;
      currentSettings = {
        ...currentSettings,
        ...body,
        updatedAt: new Date().toISOString(),
      };
    } catch {
      // keep
    }
    return HttpResponse.json(currentSettings);
  }),

  http.post(`${BASE_URL}/settings/export`, async () => {
    await delay(300);
    return HttpResponse.json({
      download_url:
        'https://mock-s3-bucket.s3.amazonaws.com/exports/student_life_os_full_backup.zip?AWSAccessKeyId=MOCK&Signature=MOCK_SIG',
      expiresIn: 3600,
      sizeBytes: 1548230,
    });
  }),

  http.delete(`${BASE_URL}/settings/account`, async () => {
    await delay(250);
    return new HttpResponse(null, { status: 204 });
  }),
];
