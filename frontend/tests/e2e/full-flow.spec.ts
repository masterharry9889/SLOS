import { test, expect } from '@playwright/test';
import { login, waitForDashboard } from '../helpers';

test.describe('Full Student Workflow (Critical Path)', () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate and reach dashboard
    await login(page);
    await waitForDashboard(page);
  });

  test('Sign in -> Create Subject -> Upload Syllabus -> Confirm Topic Tree -> View Notes -> Generate Paper', async ({
    page,
  }) => {
    // -------------------------------------------------------------
    // Step 1: Create a new subject
    // -------------------------------------------------------------
    await page.goto('/subjects');
    await page.waitForLoadState('domcontentloaded');

    // Click "New Subject" button to open modal
    const newSubjectBtn = page.getByRole('button', { name: /new subject/i });
    await expect(newSubjectBtn).toBeVisible();
    await newSubjectBtn.click();

    // Verify modal is opened
    await expect(
      page.getByRole('heading', { name: /create new subject/i })
    ).toBeVisible();

    // Fill subject details
    const subjectTitle = 'Advanced Distributed Systems';
    await page.locator('input[name="title"]').fill(subjectTitle);
    await page
      .locator('textarea[name="description"]')
      .fill(
        'Consensus algorithms, Raft, Paxos, fault tolerance, and replication models.'
      );

    // Submit subject creation
    const submitSubjectBtn = page.getByRole('button', {
      name: /create subject workspace/i,
    });
    await submitSubjectBtn.click();

    // Wait for redirect to the new subject's workspace
    await page.waitForURL((url) => url.pathname.includes('/subjects/'), {
      timeout: 10000,
    });
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // Extract current subjectId from URL
    const url = new URL(page.url());
    const subjectId = url.pathname.split('/')[2];

    // -------------------------------------------------------------
    // Step 2: Upload a syllabus document (mock file)
    // -------------------------------------------------------------
    // Ensure Overview tab is active
    const overviewTab = page.getByRole('button', { name: /overview/i });
    await overviewTab.click();

    // Attach mock PDF file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'Distributed_Systems_Syllabus.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from(
        '%PDF-1.4 Mock syllabus content with units and topics for testing'
      ),
    });

    // Verify file is selected in upload zone
    await expect(
      page.getByText('Distributed_Systems_Syllabus.pdf')
    ).toBeVisible();

    // Click Upload button if available
    const uploadBtn = page.getByRole('button', {
      name: /upload & parse syllabus/i,
    });
    if (await uploadBtn.isVisible()) {
      await uploadBtn.click();
    }

    // -------------------------------------------------------------
    // Step 3: Wait for job stepper to complete
    // -------------------------------------------------------------
    // Look for JobStepper indicator or progress element
    const jobIndicator = page.locator(
      'text=Document Analysis & Syllabus Extraction, text=Processing Pipeline, text=Completed'
    ).first();
    await expect(jobIndicator).toBeVisible({ timeout: 15000 });

    // -------------------------------------------------------------
    // Step 4: Navigate to Topics page & Verify topic tree
    // -------------------------------------------------------------
    await page.goto(`/subjects/${subjectId}/topics`);
    await page.waitForLoadState('domcontentloaded');

    // Verify topic tree editor / tree structure is displayed
    await expect(page.getByText(/curriculum topic tree/i)).toBeVisible({
      timeout: 10000,
    });
    await expect(
      page.locator('text=Unit 1, text=Unit, text=Chapter').first()
    ).toBeVisible({ timeout: 10000 });

    // -------------------------------------------------------------
    // Step 5: Confirm syllabus
    // -------------------------------------------------------------
    const confirmBtn = page.getByRole('button', {
      name: /confirm syllabus|confirmed/i,
    });
    await expect(confirmBtn).toBeVisible();

    // If not already confirmed, click to confirm
    if (await page.getByRole('button', { name: /confirm syllabus/i }).isVisible()) {
      await page.getByRole('button', { name: /confirm syllabus/i }).click();
    }
    await expect(page.getByText(/confirmed/i)).toBeVisible({ timeout: 10000 });

    // -------------------------------------------------------------
    // Step 6: Navigate to a chapter's notes and verify markdown content
    // -------------------------------------------------------------
    await page.goto(`/subjects/${subjectId}`);
    await page.waitForLoadState('domcontentloaded');

    const notesTab = page.getByRole('button', { name: /notes/i });
    await notesTab.click();

    // Ensure notes are displayed
    const viewNotesBtn = page
      .getByRole('button', { name: /view|read notes/i })
      .first();

    // If existing notes exist, view them; otherwise trigger note generation
    if (await viewNotesBtn.isVisible()) {
      await viewNotesBtn.click();
      // Verify markdown content is rendered
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(
        page.locator('role=dialog >> text=#, role=dialog >> p, role=dialog >> code').first()
      ).toBeVisible();
      // Close modal
      const closeBtn = page.locator('role=dialog >> button').first();
      await closeBtn.click();
    } else {
      // Generate notes
      const genNotesBtn = page
        .getByRole('button', { name: /generate notes/i })
        .first();
      await genNotesBtn.click();
      await expect(page.getByRole('dialog')).toBeVisible();
      const startGenBtn = page.getByRole('button', {
        name: /start generating/i,
      });
      await startGenBtn.click();
    }

    // -------------------------------------------------------------
    // Step 7: Navigate to question paper generator & verify job starts
    // -------------------------------------------------------------
    const artifactsTab = page.getByRole('button', { name: /artifacts/i });
    await artifactsTab.click();

    // Verify artifacts section is displayed
    await expect(page.getByText(/mock exam papers/i)).toBeVisible();

    // Click Generate Paper
    const generatePaperBtn = page.getByRole('button', {
      name: /generate paper/i,
    });
    await expect(generatePaperBtn).toBeVisible();
    await generatePaperBtn.click();

    // Verify job starts / toast notification or stepper activates
    await expect(
      page.locator('text=started, text=Generating, text=Job, text=Processing').first()
    ).toBeVisible({ timeout: 10000 });
  });
});
