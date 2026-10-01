import { Quiz, QuizVersion, QuizQuestion, QuizSettings } from '../types/quiz.types';

export class QuizVersionService {
  /**
   * Creates an initial version for a newly authored quiz.
   */
  static createInitialVersion(quiz: Quiz, authorId?: string): QuizVersion {
    const versionId = `ver_${quiz.id}_v1`;
    return {
      id: versionId,
      quizId: quiz.id,
      versionNumber: 1,
      title: quiz.title,
      description: quiz.description,
      instructions: quiz.instructions,
      questions: JSON.parse(JSON.stringify(quiz.questions || [])),
      totalPoints: quiz.totalPoints,
      settings: JSON.parse(JSON.stringify(quiz.settings || {})),
      createdAt: new Date().toISOString(),
      createdBy: authorId || quiz.createdBy,
      publishedAt: quiz.isPublished ? new Date().toISOString() : undefined,
      changeLog: 'Initial release',
      isPublished: quiz.isPublished,
      isImmutable: false
    };
  }

  /**
   * Spawns a new version if existing version has active attempts or is published.
   */
  static createNewVersion(
    currentQuiz: Quiz,
    newQuestions: QuizQuestion[],
    newSettings: QuizSettings,
    changeLog: string,
    authorId?: string
  ): { updatedQuiz: Quiz; newVersion: QuizVersion } {
    const existingVersions = currentQuiz.versions || [];
    const nextVersionNumber = existingVersions.length + 1;
    const versionId = `ver_${currentQuiz.id}_v${nextVersionNumber}`;

    const totalPoints = newQuestions.reduce((sum, q) => sum + (Number(q.weight) || 10), 0);

    const newVersion: QuizVersion = {
      id: versionId,
      quizId: currentQuiz.id,
      versionNumber: nextVersionNumber,
      title: currentQuiz.title,
      description: currentQuiz.description,
      instructions: currentQuiz.instructions,
      questions: JSON.parse(JSON.stringify(newQuestions)),
      totalPoints: totalPoints > 0 ? totalPoints : currentQuiz.totalPoints,
      settings: JSON.parse(JSON.stringify(newSettings)),
      createdAt: new Date().toISOString(),
      createdBy: authorId || currentQuiz.createdBy,
      publishedAt: currentQuiz.isPublished ? new Date().toISOString() : undefined,
      changeLog: changeLog || `Updated question set for version ${nextVersionNumber}`,
      isPublished: currentQuiz.isPublished,
      isImmutable: false
    };

    // Mark all previous versions as immutable
    const updatedVersions = existingVersions.map(v => ({
      ...v,
      isImmutable: true
    }));

    const updatedQuiz: Quiz = {
      ...currentQuiz,
      currentVersionId: versionId,
      questions: newQuestions,
      settings: newSettings,
      totalPoints: totalPoints > 0 ? totalPoints : currentQuiz.totalPoints,
      updatedAt: new Date().toISOString(),
      versions: [...updatedVersions, newVersion]
    };

    return { updatedQuiz, newVersion };
  }
}
