import {
  Quiz,
  QuizVersion,
  QuizAttempt,
  QuizGrade,
  QuizLifecycleStatus,
  QuizValidationResult,
  AttemptStatus
} from '../types/quiz.types';
import { UserRole } from '../../../../types/rbac';

export class QuizLifecycleService {
  /**
   * Derives the dynamic operational status of a quiz given current time and settings.
   */
  static getEffectiveQuizStatus(quiz: Quiz, now: Date = new Date()): QuizLifecycleStatus {
    if (quiz.archivedAt) {
      return 'ARCHIVED';
    }

    if (!quiz.isPublished || quiz.status === 'DRAFT') {
      return 'DRAFT';
    }

    const currentTime = now.getTime();

    // Check scheduled start
    if (quiz.availableFrom) {
      const startTime = new Date(quiz.availableFrom).getTime();
      if (!isNaN(startTime) && currentTime < startTime) {
        return 'SCHEDULED';
      }
    }

    // Check closed deadline
    if (quiz.availableUntil || quiz.dueDate) {
      const endTime = new Date(quiz.availableUntil || quiz.dueDate!).getTime();
      if (!isNaN(endTime) && currentTime > endTime) {
        return 'CLOSED';
      }
    }

    return 'OPEN';
  }

  /**
   * Checks whether a quiz can be published.
   */
  static canPublishQuiz(quiz: Partial<Quiz>, validation: QuizValidationResult): { allowed: boolean; reason?: string } {
    if (!validation.isValid) {
      return {
        allowed: false,
        reason: `Cannot publish quiz with ${validation.errors.length} validation error(s). Please resolve all errors first.`
      };
    }

    if (!quiz.questions || quiz.questions.length === 0) {
      return { allowed: false, reason: 'Quiz must contain at least one question.' };
    }

    return { allowed: true };
  }

  /**
   * Checks whether a quiz or version can be modified in place.
   * Rule: If a published version already has active or completed attempts, that version is IMMUTABLE.
   * Modifying it must spawn a new QuizVersion.
   */
  static canEditInPlace(version: QuizVersion, attemptsCount = 0): boolean {
    if (version.isImmutable || attemptsCount > 0) {
      return false;
    }
    return true;
  }

  /**
   * Checks whether a student or guest can start a new attempt.
   */
  static canStartAttempt(
    quiz: Quiz,
    existingAttempts: QuizAttempt[] = [],
    isStudentOrGuest = true
  ): { allowed: boolean; reason?: string; remainingAttempts?: number } {
    const status = this.getEffectiveQuizStatus(quiz);

    if (status === 'DRAFT') {
      return { allowed: false, reason: 'This quiz is currently in draft mode and not accepting attempts.' };
    }

    if (status === 'SCHEDULED') {
      return { allowed: false, reason: `This quiz is scheduled to open on ${quiz.availableFrom}.` };
    }

    if (status === 'CLOSED' || status === 'ARCHIVED') {
      return { allowed: false, reason: 'This quiz submission window has closed.' };
    }

    // Check for an already active in-progress attempt
    const activeAttempt = existingAttempts.find(a => a.status === 'IN_PROGRESS' || a.status === 'SUBMITTING');
    if (activeAttempt) {
      return {
        allowed: true,
        reason: 'An active attempt is already in progress. Resuming attempt.'
      };
    }

    // Check attempt limits
    const maxAttempts = quiz.settings?.maxAttempts || (quiz.settings?.allowMultipleAttempts === false ? 1 : undefined);
    const completedAttempts = existingAttempts.filter(
      a => a.status === 'SUBMITTED' || a.status === 'AUTO_SUBMITTED' || a.status === 'GRADED' || a.status === 'RELEASED'
    );

    if (maxAttempts !== undefined && completedAttempts.length >= maxAttempts) {
      return {
        allowed: false,
        reason: `You have reached the maximum allowed attempts (${maxAttempts}) for this assessment.`,
        remainingAttempts: 0
      };
    }

    const remaining = maxAttempts !== undefined ? maxAttempts - completedAttempts.length : undefined;

    return { allowed: true, remainingAttempts: remaining };
  }

  /**
   * Checks whether an in-progress attempt can be submitted.
   */
  static canSubmitAttempt(
    attempt: QuizAttempt,
    quiz?: Quiz
  ): { allowed: boolean; reason?: string } {
    if (attempt.status === 'SUBMITTED' || attempt.status === 'AUTO_SUBMITTED' || attempt.status === 'GRADED' || attempt.status === 'RELEASED') {
      return { allowed: false, reason: 'This attempt has already been submitted.' };
    }

    if (attempt.status === 'EXPIRED' || attempt.status === 'ABANDONED') {
      return { allowed: false, reason: 'This attempt has expired and can no longer accept submissions.' };
    }

    // Check authoritative expiration
    if (attempt.expiresAt) {
      const expTime = new Date(attempt.expiresAt).getTime();
      // Allow a 15-second network grace period
      if (Date.now() > expTime + 15000) {
        return { allowed: false, reason: 'The time limit for this attempt has expired.' };
      }
    }

    return { allowed: true };
  }

  /**
   * Checks whether an attempt is eligible for teacher grading or manual override.
   */
  static canGradeAttempt(
    attempt: QuizAttempt,
    role: UserRole
  ): { allowed: boolean; reason?: string } {
    const isStaff = role === 'admin' || role === 'teacher' || role === 'super_admin' || role === 'lecturer';
    if (!isStaff) {
      return { allowed: false, reason: 'Access denied: Only faculty members can grade student submissions.' };
    }

    if (attempt.status === 'IN_PROGRESS' || attempt.status === 'NOT_STARTED') {
      return { allowed: false, reason: 'Cannot grade an attempt that is still in progress.' };
    }

    return { allowed: true };
  }

  /**
   * Checks whether a grade can be moderated.
   */
  static canModerateGrade(
    grade: Partial<QuizGrade>,
    role: UserRole
  ): { allowed: boolean; reason?: string } {
    const isModerator = role === 'admin' || role === 'super_admin' || role === 'registrar';
    if (!isModerator) {
      return { allowed: false, reason: 'Access denied: Only administrators or registrars can moderate grades.' };
    }
    return { allowed: true };
  }

  /**
   * Checks whether a grade can be released to the student.
   */
  static canReleaseGrade(
    attempt: QuizAttempt,
    role: UserRole
  ): { allowed: boolean; reason?: string } {
    const isAuthorized = role === 'admin' || role === 'teacher' || role === 'super_admin' || role === 'lecturer';
    if (!isAuthorized) {
      return { allowed: false, reason: 'Access denied: Only faculty or administrators can release grades.' };
    }

    if (attempt.status === 'IN_PROGRESS' || attempt.status === 'NOT_STARTED') {
      return { allowed: false, reason: 'Cannot release grades for an unfinished attempt.' };
    }

    return { allowed: true };
  }

  /**
   * Checks whether an attempt can be administratively reopened (e.g. for student hardship).
   */
  static canReopenAttempt(
    attempt: QuizAttempt,
    role: UserRole
  ): { allowed: boolean; reason?: string } {
    const isElevated = role === 'admin' || role === 'super_admin';
    if (!isElevated) {
      return { allowed: false, reason: 'Access denied: Only administrators can reopen closed quiz attempts.' };
    }

    return { allowed: true };
  }
}
