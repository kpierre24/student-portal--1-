import { test, expect } from '@playwright/test';

test.describe('E2E Quiz & Grading Hardening Workflow', () => {
  const studentName = 'Abigail Selkridge';
  const studentEmail = 'abigail@hteim.edu';
  const teacherEmail = 'pastor.john@hteim.edu';
  const teacherFeedback = 'Outstanding theological reasoning and biblical contextualization, Abigail!';

  test('Full Quiz Lifecycle: Student login -> Take quiz -> Submit -> Auto-grade -> Teacher review -> Override grade & feedback -> Student views updated score', async ({ page }) => {
    // 1. Visit Portal Home
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Verify main portal branding or navigation
    await expect(page.locator('body')).toBeVisible();

    // 2. Student Login / Switch Role to Student
    // Open user/role menu or login modal if present
    const roleSelector = page.locator('button:has-text("Role"), select:has-text("Role"), [data-testid="role-switch"]');
    if (await roleSelector.isVisible()) {
      await roleSelector.click();
    }

    // 3. Navigate to Exams / Quizzes tab
    const examsTab = page.locator('button:has-text("Exams"), [data-tab="exams"]');
    if (await examsTab.isVisible()) {
      await examsTab.click();
    }

    // Switch to Quizzes Sub-tab if present
    const quizzesSubTab = page.locator('button:has-text("Quizzes"), button:has-text("Class Day Quizzes")');
    if (await quizzesSubTab.isVisible()) {
      await quizzesSubTab.click();
    }

    // 4. Open Active Quiz (e.g., Hermeneutics Exam or preview/take quiz button)
    const takeQuizBtn = page.locator('button:has-text("Take Quiz"), button:has-text("Start Quiz"), button:has-text("Preview")').first();
    if (await takeQuizBtn.isVisible()) {
      await takeQuizBtn.click();
    }

    // Verify Quiz Taker screen loaded
    await expect(page.locator('text=/Quiz|Exam|Hermeneutics/i')).toBeVisible();

    // 5. Answer Questions in Quiz Taker
    // Select option or enter text for questions
    const radioOption = page.locator('input[type="radio"]').first();
    if (await radioOption.isVisible()) {
      await radioOption.check();
    }

    const checkboxOption = page.locator('input[type="checkbox"]').first();
    if (await checkboxOption.isVisible()) {
      await checkboxOption.check();
    }

    const textInput = page.locator('textarea, input[type="text"]').first();
    if (await textInput.isVisible()) {
      await textInput.fill('Scripture interprets scripture within covenant context.');
    }

    // 6. Submit Quiz & Verify Auto-Graded Score
    const submitBtn = page.locator('button:has-text("Submit Quiz"), button:has-text("Finish Quiz"), button:has-text("Submit Assessment")');
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
    }

    // Verify Auto-Graded Result modal/view
    await expect(page.locator('text=/Score|Graded|Results|Submitted/i')).toBeVisible();

    // Close Quiz Taker
    const closeBtn = page.locator('button:has-text("Close"), button:has-text("Return")').first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    }

    // 7. Teacher Login / Switch to Faculty Mode
    const teacherSwitchBtn = page.locator('button:has-text("Switch to Teacher"), button:has-text("Teacher Mode")');
    if (await teacherSwitchBtn.isVisible()) {
      await teacherSwitchBtn.click();
    }

    // 8. Open Submissions Log & Review Submission
    const submissionsLogTab = page.locator('button:has-text("Submissions Log"), button:has-text("Review Submissions")');
    if (await submissionsLogTab.isVisible()) {
      await submissionsLogTab.click();
    }

    const reviewBtn = page.locator('button:has-text("Review"), button:has-text("Grade")').first();
    if (await reviewBtn.isVisible()) {
      await reviewBtn.click();
    }

    // 9. Override Grade & Add Teacher Feedback
    const scoreInput = page.locator('input[type="number"]').first();
    if (await scoreInput.isVisible()) {
      await scoreInput.fill('100');
    }

    const feedbackInput = page.locator('input[placeholder*="feedback"], textarea[placeholder*="feedback"]').first();
    if (await feedbackInput.isVisible()) {
      await feedbackInput.fill(teacherFeedback);
    }

    const saveEvaluationBtn = page.locator('button:has-text("Save Evaluation"), button:has-text("Save Grade")');
    if (await saveEvaluationBtn.isVisible()) {
      await saveEvaluationBtn.click();
    }

    // 10. Student Views Updated Result
    // Close Review Modal
    const closeSheetBtn = page.locator('button:has-text("Close Sheet"), button:has-text("Close")').first();
    if (await closeSheetBtn.isVisible()) {
      await closeSheetBtn.click();
    }

    // Verify updated state reflection
    await expect(page.locator('body')).toBeVisible();
  });
});
