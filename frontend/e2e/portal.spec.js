import { test, expect } from '@playwright/test';

// Official capstone browser trace: AC-01.

const settledClaim = {
  id: '00000000-0000-0000-0000-000000000101',
  claimNumber: 'CLM-2026-SYNTH01',
  policyNumber: 'MTR-2026-001',
  customerUsername: 'customer',
  type: 'MOTOR',
  incidentDate: '2026-08-20',
  claimedAmount: 100000,
  assessedAmount: 95000,
  description: 'A synthetic motor incident used for browser verification only.',
  documentTypes: ['POLICE_FIR', 'REPAIR_INVOICE'],
  verificationStatus: 'VERIFIED',
  fraudScore: 0,
  decision: 'AUTO_APPROVE',
  decisionReason: 'Synthetic evidence met the automatic approval criteria.',
  status: 'SETTLED',
  reopenCount: 0,
  settlement: {
    id: '00000000-0000-0000-0000-000000000201',
    claimId: '00000000-0000-0000-0000-000000000101',
    payoutReference: 'PAY-SYNTHETIC01',
    amount: 95000,
    paymentStatus: 'PAYMENT_STUB_CREATED',
    createdAt: '2026-08-20T10:00:00Z',
  },
  auditTrail: [{
    id: '00000000-0000-0000-0000-000000000301',
    claimId: '00000000-0000-0000-0000-000000000101',
    actor: 'system',
    action: 'SETTLEMENT_CREATED',
    detail: 'PAY-SYNTHETIC01',
    occurredAt: '2026-08-20T10:00:00Z',
  }],
};

const reopenedClaim = {
  ...settledClaim,
  id: '00000000-0000-0000-0000-000000000102',
  claimNumber: 'CLM-2026-SYNTH02',
  status: 'FILED',
  decision: null,
  settlement: null,
};

async function mockCustomerClaims(page, claims = []) {
  let authorization;
  await page.route('**/api/claims', async (route) => {
    authorization = route.request().headers().authorization;
    if (route.request().method() === 'POST') {
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(settledClaim) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(claims) });
  });
  return () => authorization;
}

test('E3-S1-AC1 opens the synthetic customer portal and loads the owner claim list', async ({ page }) => {
  const authorization = await mockCustomerClaims(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /clearer path/i })).toBeVisible();
  await page.getByRole('button', { name: /continue as customer/i }).click();
  await expect(page.getByRole('heading', { name: 'Your claims' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'No claims yet' })).toBeVisible();
  expect(authorization()).toBe('Basic ' + btoa('customer:customer123'));
});

test('E3-S1-AC2 submits a complete synthetic claim and presents its decision evidence', async ({ page }) => {
  await mockCustomerClaims(page);
  await page.goto('/');
  await page.getByRole('button', { name: /continue as customer/i }).click();
  await page.getByRole('button', { name: /new claim/i }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByLabel(/claim amount/i).fill('100000');
  await page.getByPlaceholder(/share the key details/i).fill('A complete synthetic motor claim submitted by a browser acceptance test.');
  await page.getByLabel('POLICE FIR').check();
  await page.getByLabel('REPAIR INVOICE').check();
  await page.getByRole('button', { name: /submit claim/i }).click();
  await expect(page.getByRole('heading', { name: settledClaim.claimNumber })).toBeVisible();
  await expect(page.locator('.settlement').getByText(settledClaim.settlement.payoutReference)).toBeVisible();
  await expect(page.getByText(/decision rationale/i)).toBeVisible();
});

test('E3-S1-AC3 filters claims by claim number, policy, type, or status', async ({ page }) => {
  await mockCustomerClaims(page, [settledClaim, reopenedClaim]);
  await page.goto('/');
  await page.getByRole('button', { name: /continue as customer/i }).click();
  await page.getByLabel('Search claims').fill('SYNTH02');
  await expect(page.getByText(reopenedClaim.claimNumber)).toBeVisible();
  await expect(page.getByText(settledClaim.claimNumber)).toBeHidden();
});

test('E3-S1-AC4 limits admin actions to claims in eligible workflow states', async ({ page }) => {
  let processCalled = false;
  await page.route('**/api/admin/claims', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([settledClaim, reopenedClaim]) }));
  await page.route('**/api/admin/dashboard', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ totalClaims: 2, openReviews: 0, settledClaims: 1 }) }));
  await page.route(`**/api/admin/claims/${reopenedClaim.id}/process`, (route) => {
    processCalled = true;
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(settledClaim) });
  });
  await page.goto('/');
  await page.getByRole('button', { name: /open admin console/i }).click();
  await page.getByText(settledClaim.claimNumber).click();
  await expect(page.getByRole('button', { name: 'Approve' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Reject' })).toHaveCount(0);
  await page.getByRole('button', { name: /close claim details/i }).click();
  await page.getByText(reopenedClaim.claimNumber).click();
  await page.getByRole('button', { name: 'Reprocess' }).click();
  await expect.poll(() => processCalled).toBe(true);
});

test('E3-S1-AC5 keeps the mobile portal usable and closes dialogs with Escape', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockCustomerClaims(page);
  await page.goto('/');
  await page.getByRole('button', { name: /continue as customer/i }).click();
  await page.getByRole('button', { name: /new claim/i }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(hasHorizontalOverflow).toBe(false);
});

test('E3-S1-AC6 announces API failures without a blocking browser alert', async ({ page }) => {
  await page.route('**/api/claims', (route) => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Synthetic service outage' }) }));
  await page.goto('/');
  await page.getByRole('button', { name: /continue as customer/i }).click();
  await expect(page.getByRole('alert')).toContainText('Synthetic service outage');
});

test('AC-03 keeps assessor verification in its own authorized workspace', async ({ page }) => {
  let verificationAuthorization;
  await page.route('**/api/assessor/queue', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([reopenedClaim]) }));
  await page.route(`**/api/assessor/claims/${reopenedClaim.id}/documents/POLICE_FIR/verification`, (route) => {
    verificationAuthorization = route.request().headers().authorization;
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...reopenedClaim, status: 'UNDER_REVIEW' }) });
  });
  await page.goto('/');
  await page.getByRole('button', { name: /open assessor workspace/i }).click();
  await expect(page.getByRole('heading', { name: /evidence review queue/i })).toBeVisible();
  await page.getByText(reopenedClaim.claimNumber).click();
  await page.getByRole('button', { name: 'Verify' }).first().click();
  expect(verificationAuthorization).toBe('Basic ' + btoa('assessor:assessor123'));
});

test('AC-01 customer portal visual baseline', async ({ page }) => {
  await mockCustomerClaims(page, [settledClaim, reopenedClaim]);
  await page.goto('/');
  await page.getByRole('button', { name: /continue as customer/i }).click();
  await expect(page).toHaveScreenshot('customer-portal.png', { fullPage: true, animations: 'disabled' });
});
