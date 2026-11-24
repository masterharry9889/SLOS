import { prisma } from '@/lib/prisma.js';
import { AppError } from '@/lib/errors.js';
import type { ConfirmTopicsInput, UpdateTopicInput } from './schemas.js';

const TOPIC_STATUS_VALUES = ['not_started', 'studied', 'revised', 'tested'] as const;

function normalizeStatus(status: string | null | undefined): string {
  if (typeof status === 'string' && TOPIC_STATUS_VALUES.includes(status as (typeof TOPIC_STATUS_VALUES)[number])) {
    return status;
  }
  return 'not_started';
}

async function getSubjectSnapshot(userId: string, subjectId: string) {
  const subject = await prisma.subject.findFirst({
    where: { id: subjectId, userId },
    include: {
      documents: {
        select: { sourceType: true },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!subject) {
    throw new AppError(404, 'NOT_FOUND', 'Subject not found');
  }

  return subject;
}

async function getTopicForUser(userId: string, topicId: string) {
  const topic = await prisma.topic.findFirst({
    where: {
      id: topicId,
      subject: { userId },
    },
    include: { subject: { select: { id: true, title: true } } },
  });

  if (!topic) {
    throw new AppError(404, 'NOT_FOUND', 'Topic not found');
  }

  return topic;
}

function buildTopicTree(subject: { id: string; title: string }, sourceType: string, topics: Array<any>) {
  const unitTopics = topics
    .filter((topic) => topic.level === 'unit')
    .sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0));

  const chaptersByParent = new Map<string, any[]>();
  const conceptsByParent = new Map<string, any[]>();

  for (const topic of topics) {
    if (topic.parentId) {
      const collection = topic.level === 'chapter' ? chaptersByParent : conceptsByParent;
      const key = topic.parentId;
      const current = collection.get(key) ?? [];
      current.push(topic);
      collection.set(key, current);
    }
  }

  const units = unitTopics.map((unit) => {
    const chapterRows = (chaptersByParent.get(unit.id) ?? []).sort(
      (a, b) => Number(a.order ?? 0) - Number(b.order ?? 0),
    );

    return {
      id: unit.id,
      title: unit.title,
      order: unit.order,
      status: normalizeStatus(unit.status),
      confirmed: Boolean(unit.confirmed),
      source_spans: Array.isArray(unit.sourceSpans) ? unit.sourceSpans : [],
      chapters: chapterRows.map((chapter) => {
        const conceptRows = (conceptsByParent.get(chapter.id) ?? []).sort(
          (a, b) => Number(a.order ?? 0) - Number(b.order ?? 0),
        );

        return {
          id: chapter.id,
          title: chapter.title,
          order: chapter.order,
          status: normalizeStatus(chapter.status),
          confirmed: Boolean(chapter.confirmed),
          concepts: conceptRows.map((concept) => ({
            id: concept.id,
            title: concept.title,
          })),
          source_spans: Array.isArray(chapter.sourceSpans) ? chapter.sourceSpans : [],
        };
      }),
    };
  });

  return {
    subject_id: subject.id,
    subject_title: subject.title,
    source_type: sourceType,
    units,
  };
}

export async function getSubjectTopics(userId: string, subjectId: string) {
  const subject = await getSubjectSnapshot(userId, subjectId);
  const topics = await prisma.topic.findMany({
    where: { subjectId },
    orderBy: [{ parentId: 'asc' }, { order: 'asc' }],
  });

  const sourceType = subject.documents[0]?.sourceType ?? 'content';
  return buildTopicTree(subject, sourceType, topics);
}

export async function updateTopic(userId: string, topicId: string, input: UpdateTopicInput) {
  const topic = await getTopicForUser(userId, topicId);
  const updateData: Record<string, unknown> = {};

  if (input.delete === true || input.action === 'delete') {
    const idsToDelete = [topic.id];
    const queue = [topic.id];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const children = await prisma.topic.findMany({
        where: { parentId: currentId },
        select: { id: true },
      });

      for (const child of children) {
        idsToDelete.push(child.id);
        queue.push(child.id);
      }
    }

    await prisma.topic.deleteMany({
      where: { id: { in: idsToDelete } },
    });

    return { deleted: true, topicId: topic.id };
  }

  if (typeof input.title === 'string') {
    updateData.title = input.title.trim();
  }

  if (input.status) {
    updateData.status = input.status;
  }

  if (typeof input.order === 'number') {
    updateData.order = input.order;
  }

  if (input.parentId !== undefined) {
    if (input.parentId === topic.id) {
      throw new AppError(400, 'INVALID_PARENT', 'Topic cannot be its own parent');
    }

    if (input.parentId !== null) {
      const parent = await prisma.topic.findFirst({
        where: { id: input.parentId, subjectId: topic.subjectId, subject: { userId } },
      });

      if (!parent) {
        throw new AppError(404, 'NOT_FOUND', 'Parent topic not found');
      }

      if (parent.id === topic.id) {
        throw new AppError(400, 'INVALID_PARENT', 'Topic cannot be its own parent');
      }
    }

    updateData.parentId = input.parentId;
  }

  if (Object.keys(updateData).length === 0) {
    return topic;
  }

  return prisma.topic.update({
    where: { id: topic.id },
    data: updateData,
  });
}

export async function confirmSubjectTopics(userId: string, subjectId: string, input: ConfirmTopicsInput) {
  const subject = await getSubjectSnapshot(userId, subjectId);
  const confirmed = input.confirmed ?? true;

  await prisma.topic.updateMany({
    where: { subjectId },
    data: { confirmed },
  });

  const topics = await prisma.topic.findMany({
    where: { subjectId },
    orderBy: [{ parentId: 'asc' }, { order: 'asc' }],
  });

  const sourceType = input.sourceType ?? subject.documents[0]?.sourceType ?? 'content';
  return buildTopicTree(subject, sourceType, topics);
}

export async function saveSubjectTopicTree(
  userId: string,
  subjectId: string,
  input: { units: Array<{
    id?: string; title: string; order?: number; chapters: Array<{
      id?: string; title: string; order?: number; status?: string;
      source_spans?: Array<{ page: number; start: number; end: number }>;
      concepts?: Array<string | { id?: string; title: string }>;
    }>;
  }> },
) {
  const subject = await getSubjectSnapshot(userId, subjectId);
  const existing = await prisma.topic.findMany({ where: { subjectId }, select: { id: true } });
  const existingIds = new Set(existing.map((topic) => topic.id));
  const requestedIds = input.units.flatMap((unit) => [
    ...(unit.id ? [unit.id] : []),
    ...unit.chapters.flatMap((chapter) => [
      ...(chapter.id ? [chapter.id] : []),
      ...(chapter.concepts ?? []).flatMap((concept) =>
        typeof concept !== 'string' && concept.id ? [concept.id] : [],
      ),
    ]),
  ]);
  if (requestedIds.some((id) => !existingIds.has(id))) {
    throw new AppError(400, 'INVALID_TOPIC_TREE', 'Topic tree contains IDs that do not belong to this subject');
  }

  const retainedIds = new Set<string>();
  await prisma.$transaction(async (transaction) => {
    for (const [unitIndex, unit] of input.units.entries()) {
      const savedUnit = unit.id
        ? await transaction.topic.update({
          where: { id: unit.id },
          data: { title: unit.title, level: 'unit', parentId: null, order: unit.order ?? unitIndex },
        })
        : await transaction.topic.create({
          data: { subjectId, title: unit.title, level: 'unit', order: unit.order ?? unitIndex },
        });
      retainedIds.add(savedUnit.id);

      for (const [chapterIndex, chapter] of unit.chapters.entries()) {
        const savedChapter = chapter.id
          ? await transaction.topic.update({
            where: { id: chapter.id },
            data: {
              title: chapter.title,
              level: 'chapter',
              parentId: savedUnit.id,
              order: chapter.order ?? chapterIndex,
              ...(chapter.status ? { status: chapter.status } : {}),
              sourceSpans: chapter.source_spans ?? [],
            },
          })
          : await transaction.topic.create({
            data: {
              subjectId,
              title: chapter.title,
              level: 'chapter',
              parentId: savedUnit.id,
              order: chapter.order ?? chapterIndex,
              status: chapter.status ?? 'not_started',
              sourceSpans: chapter.source_spans ?? [],
            },
          });
        retainedIds.add(savedChapter.id);

        for (const [conceptIndex, concept] of (chapter.concepts ?? []).entries()) {
          const title = typeof concept === 'string' ? concept : concept.title;
          const conceptId = typeof concept === 'string' ? undefined : concept.id;
          const savedConcept = conceptId
            ? await transaction.topic.update({
              where: { id: conceptId },
              data: { title, level: 'concept', parentId: savedChapter.id, order: conceptIndex },
            })
            : await transaction.topic.create({
              data: {
                subjectId,
                title,
                level: 'concept',
                parentId: savedChapter.id,
                order: conceptIndex,
              },
            });
          retainedIds.add(savedConcept.id);
        }
      }
    }

    const deletedIds = existing.filter((topic) => !retainedIds.has(topic.id)).map((topic) => topic.id);
    if (deletedIds.length) {
      await transaction.topic.deleteMany({ where: { id: { in: deletedIds }, subjectId } });
    }
  });

  return getSubjectTopics(userId, subject.id);
}
