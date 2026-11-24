import type { FastifyInstance } from 'fastify';
import puppeteer from 'puppeteer';
import { marked } from 'marked';
import { ArtifactParamsSchema, ArtifactQuerySchema, GenerateCheatsheetSchema, GeneratePaperSchema } from './schemas.js';
import { enqueueCheatsheet, enqueuePaper, getArtifact, listArtifacts } from './service.js';

export default async function artifactRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('onRequest', fastify.authenticate);
  fastify.post('/artifacts/cheatsheet', {
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
  }, async (request, reply) => reply.status(202).send(
    await enqueueCheatsheet(request.user!.id, GenerateCheatsheetSchema.parse(request.body)),
  ));
  fastify.post('/artifacts/cheatsheet/generate', {
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
  }, async (request, reply) => reply.status(202).send(
    await enqueueCheatsheet(request.user!.id, GenerateCheatsheetSchema.parse(request.body)),
  ));
  fastify.post('/artifacts/question-paper', {
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
  }, async (request, reply) => reply.status(202).send(
    await enqueuePaper(request.user!.id, GeneratePaperSchema.parse(request.body)),
  ));
  fastify.post('/artifacts/question-paper/generate', {
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
  }, async (request, reply) => reply.status(202).send(
    await enqueuePaper(request.user!.id, GeneratePaperSchema.parse(request.body)),
  ));
  fastify.get('/artifacts', async (request) => {
    const query = ArtifactQuerySchema.parse(request.query);
    return listArtifacts(request.user!.id, query);
  });
  fastify.get('/subjects/:subjectId/artifacts', async (request) => {
    const params = request.params as { subjectId: string };
    const query = ArtifactQuerySchema.parse({ ...request.query as object, subject_id: params.subjectId });
    return listArtifacts(request.user!.id, query);
  });
  fastify.get('/subjects/:subjectId/question-papers', async (request) => {
    const params = request.params as { subjectId: string };
    return listArtifacts(request.user!.id, { subject_id: params.subjectId, type: 'question_paper' });
  });
  fastify.get('/artifacts/:id', async (request) => {
    const { id } = ArtifactParamsSchema.parse(request.params);
    return getArtifact(request.user!.id, id);
  });
  fastify.get('/artifacts/:id/pdf', async (request, reply) => {
    const { id } = ArtifactParamsSchema.parse(request.params);
    const artifact = await getArtifact(request.user!.id, id);
    const browser = await puppeteer.launch({ headless: true });
    try {
      const page = await browser.newPage();
      const body = await marked.parse(artifact.content);
      await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
        body{font:14px/1.6 Arial,sans-serif;color:#172033;max-width:760px;margin:40px auto;padding:0 32px}
        h1,h2,h3{color:#243b75}pre,code{background:#f1f3f8;padding:2px 4px;border-radius:4px}
        blockquote{border-left:3px solid #7184c5;padding-left:16px;color:#526078}
        @page{margin:18mm}
      </style></head><body><h1>${escapeHtml(artifact.title)}</h1>${body}</body></html>`);
      const pdf = await page.pdf({ format: 'A4', printBackground: true });
      return reply
        .type('application/pdf')
        .header('Content-Disposition', `attachment; filename="${artifact.id}.pdf"`)
        .send(Buffer.from(pdf));
    } finally {
      await browser.close();
    }
  });
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] ?? character);
}
