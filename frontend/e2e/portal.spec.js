import { test, expect } from '@playwright/test';

test('opens the synthetic customer portal and loads the owner claim list', async ({ page }) => {
  let authorization;
  await page.route('**/api/claims', async route => {
    authorization = route.request().headers().authorization;
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: /clearer path/i })).toBeVisible();
  await page.getByRole('button', { name: /continue as customer/i }).click();
  await expect(page.getByRole('heading', { name: 'Your claims' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'No claims yet' })).toBeVisible();
  expect(authorization).toBe('Basic ' + btoa('customer:customer123'));
});