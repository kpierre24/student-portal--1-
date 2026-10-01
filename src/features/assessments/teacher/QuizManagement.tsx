import React from 'react';
import { Plus, HelpCircle, CheckCircle, Clock, Users, Trash2, Edit3 } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { CustomAssignment } from '../../../types';

export interface QuizManagementProps {
  quizzes: CustomAssignment[];
  onCreateQuiz?: () => void;
  onEditQuiz?: (quiz: CustomAssignment) => void;
  onDeleteQuiz?: (quizId: string) => void;
  className?: string;
}

export const QuizManagement: React.FC<QuizManagementProps> = ({
  quizzes = [],
  onCreateQuiz,
  onEditQuiz,
  onDeleteQuiz,
  className = '',
}) => {
  const quizList = quizzes.filter((q) => q.type === 'quiz');

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] dark:text-slate-400">
            ONLINE QUIZZES & TESTS
          </h3>
          <p className="text-xs text-[var(--color-text-muted)]">
            Create automated multiple-choice and short-essay quizzes for student evaluation.
          </p>
        </div>

        {onCreateQuiz && (
          <Button
            size="sm"
            variant="primary"
            onClick={onCreateQuiz}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Create Quiz
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {quizList.map((quiz) => {
          const questionsCount = quiz.quizData?.questions?.length || 0;
          const totalPoints = quiz.quizData?.totalPoints || quiz.maxPoints || 100;
          const isPublished = quiz.quizData?.isPublished !== false;

          return (
            <Card
              key={quiz.id}
              className="flex flex-col justify-between space-y-4 hover:border-[var(--color-primary)]/40 transition-all shadow-xs"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant={isPublished ? 'success' : 'neutral'} size="sm">
                    {isPublished ? 'Published' : 'Draft'}
                  </Badge>
                  {quiz.quizData?.timeLimitMinutes && (
                    <span className="flex items-center gap-1 text-xs text-[var(--color-text-muted)] font-medium">
                      <Clock className="h-3 w-3" />
                      {quiz.quizData.timeLimitMinutes}m limit
                    </span>
                  )}
                </div>

                <h4 className="text-base font-bold text-[var(--color-text)] dark:text-slate-100 font-sans line-clamp-1">
                  {quiz.title}
                </h4>

                <p className="text-xs text-[var(--color-text-muted)] dark:text-slate-400 line-clamp-2">
                  {quiz.description || 'Module curriculum assessment.'}
                </p>

                <p className="text-xs font-semibold text-[var(--color-primary)] dark:text-sky-400">
                  {questionsCount} Questions • {totalPoints} Points
                </p>
              </div>

              <div className="pt-2 border-t border-[var(--color-border)]/60 flex items-center justify-between gap-2 dark:border-slate-800">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEditQuiz?.(quiz)}
                  leftIcon={<Edit3 className="h-3.5 w-3.5" />}
                  className="flex-1"
                >
                  Edit
                </Button>

                {onDeleteQuiz && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDeleteQuiz(quiz.id)}
                    className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
