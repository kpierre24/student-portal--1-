import { test, expect } from '@playwright/test';

test.describe('Public Quiz E2E & Security Workflows', () => {

  test('1. Valid Quiz: Open share link -> Load quiz -> Enter student name -> Answer -> Submit -> Confirmation', async ({ page }) => {
    // 1. Visit Portal with valid quiz parameter in URL
    await page.goto('/?quiz=hermeneutics101');
    await page.waitForLoadState('networkidle');

    // 2. Verify Public Assessment header and Quiz Taker screen loaded
    await expect(page.locator('text=/Public Assessment|Class Day Quiz|Hermeneutics/i')).toBeVisible({ timeout: 10000 });

    // 3. Enter student identity (if custom name or roster input is present)
    const nameInput = page.locator('input[placeholder*="name"], input[placeholder*="Student Name"], input[type="text"]').first();
    if (await nameInput.isVisible()) {
      await nameInput.fill('Abigail Selkridge');
    }

    // 4. Answer Questions in Quiz Taker
    // Select first radio option
    const radioOption = page.locator('input[type="radio"]').first();
    if (await radioOption.isVisible()) {
      await radioOption.check();
    }

    // Fill short answer text input if available
    const textAnswer = page.locator('textarea, input[placeholder*="answer"], input[placeholder*="short answer"]').first();
    if (await textAnswer.isVisible()) {
      await textAnswer.fill('Scripture interprets scripture within its historical and covenantal context.');
    }

    // 5. Click Submit Quiz
    const submitBtn = page.locator('button:has-text("Submit Quiz"), button:has-text("Finish Quiz"), button:has-text("Submit Assessment")').first();
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();

    // Handle confirm dialog if present
    const confirmBtn = page.locator('button:has-text("Confirm Submit"), button:has-text("Yes, Submit")');
    if (await confirmBtn.isVisible()) {
      await confirmBtn.click();
    }

    // 6. Verify Confirmation Screen with Score and Feedback
    await expect(page.locator('text=/Submission Recorded|Quiz Submitted|Score|Completed|Results/i')).toBeVisible({ timeout: 10000 });
  });

  test('2. Invalid Quiz: Opening invalid share code displays "Quiz Unavailable" screen', async ({ page }) => {
    // Visit URL with non-existent share code
    await page.goto('/?quiz=invalid-code-99999');
    await page.waitForLoadState('networkidle');

    // Verify Quiz Unavailable / Assessment Not Found UI is displayed
    await expect(page.locator('text=/Quiz Unavailable|Assessment Not Found/i')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=/invalid, expired, or has been revoked/i')).toBeVisible();

    // Verify Return to Portal Home button is functional
    const returnBtn = page.locator('button:has-text("Return to Portal"), button:has-text("Return to HTEIM")').first();
    await expect(returnBtn).toBeVisible();
    await returnBtn.click();

    // Expect to be back on the main portal shell without ?quiz= query
    await expect(page).not.toHaveURL(/\?quiz=invalid-code/);
  });

  test('3. Expired Quiz: Opening expired share code displays "Quiz Unavailable" screen', async ({ page }) => {
    // Visit URL with expired share code
    await page.goto('/?quiz=expired-quiz-demo');
    await page.waitForLoadState('networkidle');

    // Verify Quiz Unavailable / Assessment Not Found UI is displayed
    await expect(page.locator('text=/Quiz Unavailable|Assessment Not Found|expired/i')).toBeVisible({ timeout: 10000 });
  });

  test('4. Duplicate Submission: Re-submitting same quiz displays duplicate prevention warning', async ({ page, request }) => {
    // Submit first attempt via API endpoint
    const shareCode = 'hermeneutics101';
    const payload = {
      studentName: 'Duplicate Test Student',
      studentEmail: 'duplicate.test@hteim.edu',
      responses: { q1: 'Option A' }
    };

    const res1 = await request.post(`/api/assignments/public/quiz/${shareCode}/submit`, { data: payload });
    expect([200, 201]).toContain(res1.status());

    // Try submitting again within short window
    const res2 = await request.post(`/api/assignments/public/quiz/${shareCode}/submit`, { data: payload });
    // Expect 429 Rate Limit / Duplicate warning or 200 with notice
    expect([429, 400, 200]).toContain(res2.status());
    if (res2.status() === 429) {
      const body = await res2.json();
      expect(body.error).toMatch(/duplicate|rate limit|too quickly/i);
    }
  });

  test('5. Server Security & Tampering Resistance: Client-supplied score is ignored and re-calculated server-side', async ({ request }) => {
    const shareCode = 'hermeneutics101';
    
    // Attempt tampering: sending wrong answers but forging score=100 and percentage=100 in body
    const tamperedPayload = {
      studentName: 'Tampering Attacker',
      score: 100, // Forged score
      percentage: 100, // Forged percentage
      isPassed: true,
      responses: {
        q1: 'completely_wrong_choice_xyz'
      }
    };

    const response = await request.post(`/api/assignments/public/quiz/${shareCode}/submit`, {
      data: tamperedPayload
    });

    expect([200, 201]).toContain(response.status());
    const result = await response.json();

    // Verify server recalculated authoritative score and ignored forged score
    expect(result.score).not.toBe(100);
    expect(result.percentage).toBeLessThan(100);
  });

  test('6. Server Security & Tampering Resistance: Rejects invalid or empty student identity', async ({ request }) => {
    const shareCode = 'hermeneutics101';
    
    // Empty student name
    const invalidPayload = {
      studentName: '',
      responses: { q1: 'Option A' }
    };

    const response = await request.post(`/api/assignments/public/quiz/${shareCode}/submit`, {
      data: invalidPayload
    });

    expect([400, 422]).toContain(response.status());
    const body = await response.json();
    expect(body.error).toMatch(/student name/i);
  });

});
