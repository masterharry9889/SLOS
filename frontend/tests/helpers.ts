import { expect, type Page } from '@playwright/test';

/**
 * Default mock test credentials
 */
export const TEST_USER = {
  name: 'Alex Chen',
  email: 'alex.chen@university.edu',
  password: 'Password123!',
};

/**
 * Fills in the login form and submits it
 */
export async function login(
  page: Page,
  email = TEST_USER.email,
  password = TEST_USER.password
) {
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');

  // Fill in email and password
  await page.locator('input#email').fill(email);
  await page.locator('input#password').fill(password);

  // Submit the form
  const submitButton = page.getByRole('button', { name: /sign in/i });
  await submitButton.click();

  // Wait for redirect to dashboard
  await waitForDashboard(page);
}

/**
 * Fills in the registration form and submits it
 */
export async function register(
  page: Page,
  userData = TEST_USER
) {
  await page.goto('/register');
  await page.waitForLoadState('domcontentloaded');

  await page.locator('input#name').fill(userData.name);
  await page.locator('input#email').fill(userData.email);
  await page.locator('input#password').fill(userData.password);
  await page.locator('input#confirmPassword').fill(userData.password);

  // Accept terms and conditions
  const termsCheckbox = page.locator('input[type="checkbox"]');
  await termsCheckbox.check();

  // Submit
  const submitBtn = page.getByRole('button', { name: /create account/i });
  await submitBtn.click();

  // Wait for redirect to dashboard
  await waitForDashboard(page);
}

/**
 * Waits for the dashboard page to load and confirm key elements are visible
 */
export async function waitForDashboard(page: Page) {
  // Wait for URL to be root or dashboard
  await page.waitForURL((url) => url.pathname === '/' || url.pathname === '/dashboard', {
    timeout: 15000,
  });

  // Verify dashboard header or subject cards are rendered
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/welcome back/i, {
    timeout: 10000,
  });
  await expect(page.getByText(/your subjects/i)).toBeVisible({
    timeout: 10000,
  });
}

/**
 * Logs out the currently authenticated user
 */
export async function logout(page: Page) {
  // Click on the user avatar to open dropdown
  const avatarButton = page.locator('header').locator('button').filter({ hasText: /^[A-Z]{2}$/i }).first();
  await avatarButton.click();

  // Click on Sign out
  const signOutButton = page.getByRole('button', { name: /sign out/i });
  await signOutButton.click();

  // Wait for redirect to login page
  await page.waitForURL((url) => url.pathname === '/login', { timeout: 10000 });
  await expect(page.getByRole('heading', { name: /sign in to your account/i })).toBeVisible();
}

/**
 * Navigates directly to a specific subject workspace
 */
export async function navigateToSubject(page: Page, subjectId: string) {
  await page.goto(`/subjects/${subjectId}`);
  await page.waitForLoadState('domcontentloaded');

  // Verify subject header is loaded
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10000 });
}
