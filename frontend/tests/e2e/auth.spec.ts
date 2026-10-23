import { test, expect } from '@playwright/test';
import { waitForDashboard, logout } from '../helpers';

test.describe('Authentication & Session Lifecycle', () => {
  const uniqueId = Date.now().toString(36);
  const user = {
    name: 'Alex Chen',
    email: `alex.chen.${uniqueId}@university.edu`,
    password: 'StudyPassword2026!',
  };

  test('Complete flow: Register -> Dashboard -> Logout -> Login -> Dashboard', async ({
    page,
  }) => {
    // 1. Navigate to Register page
    await page.goto('/register');
    await page.waitForLoadState('domcontentloaded');

    await expect(
      page.getByRole('heading', { name: /create your student account/i })
    ).toBeVisible();

    // 2. Fill in Registration form
    await page.locator('input#name').fill(user.name);
    await page.locator('input#email').fill(user.email);
    await page.locator('input#password').fill(user.password);
    await page.locator('input#confirmPassword').fill(user.password);

    // Accept terms
    const termsCheckbox = page.locator('input[type="checkbox"]');
    await termsCheckbox.check();

    // Submit form
    const registerButton = page.getByRole('button', { name: /create account/i });
    await registerButton.click();

    // 3. Expect redirect to dashboard and verify dashboard elements
    await waitForDashboard(page);

    // Check Welcome header
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      /welcome back/i
    );

    // Check Subject cards section
    await expect(page.getByText(/your subjects/i)).toBeVisible();

    // Check study streak indicator
    await expect(page.getByText(/study streak/i)).toBeVisible();

    // 4. Logout
    await logout(page);

    // 5. Navigate to Login page
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    await expect(
      page.getByRole('heading', { name: /sign in to your account/i })
    ).toBeVisible();

    // 6. Fill in Login credentials
    await page.locator('input#email').fill(user.email);
    await page.locator('input#password').fill(user.password);

    // Submit login
    const loginButton = page.getByRole('button', { name: /sign in/i });
    await loginButton.click();

    // 7. Expect redirect to dashboard
    await waitForDashboard(page);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      /welcome back/i
    );
  });
});
