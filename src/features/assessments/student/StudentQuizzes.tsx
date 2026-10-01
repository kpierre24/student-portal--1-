import React from 'react';
import { HelpCircle, Clock, CheckCircle2, ArrowRight, Award, AlertCircle } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { AddToCalendarButton } from '../../../components/AddToCalendarButton';
import { CustomAssignment } from '../../../types';

export interface StudentQuizzesProps {
  quizzes: CustomAssignment[];
  onTakeQuiz?: (quiz: CustomAssignment) => void;
  className?: string;
}

export const StudentQuizzes: React.FC<StudentQuizzesProps> = ({
  quizzes = [],
  onTakeQuiz,
  className = '',
}) => {
  const publishedQuizzes = quizzes.filter(
    (q) => q.type === 'quiz' && q.quizData && q.quizData.isPublished !== false
  );

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] dark:text-slate-400">
          ONLINE QUIZZES & EXAMS
        </h3>
        <Badge variant="info" size="sm">
          {publishedQuizzes.length} Available
        </Badge>
      </div>

      {publishedQuizzes.length === 0 ? (
        <Card className="text-center py-10">
          <HelpCircle className="h-10 w-10 text-slate-400 mx-auto mb-2 opacity-60" />
          <h4 className="text-base font-bold text-[var(--color-text)]">No Quizzes Active</h4>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Check back later for new module quizzes from your instructor.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {publishedQuizzes.map((quiz) => {
            const questionCount = quiz.quizData?.questions?.length || 0;
            const timeLimit = quiz.quizData?.timeLimitMinutes;

            const quizDate = quiz.quizData?.availableUntil || quiz.quizData?.dueDate || quiz.dueDate || new Date().toISOString().split('T')[0];

            return (
              <Card
                key={quiz.id}
                className="flex flex-col justify-between space-y-4 hover:border-[var(--color-primary)]/40 transition-all shadow-xs"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="primary" size="sm">
                      Quiz
                    </Badge>
                    {timeLimit && (
                      <span className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
                        <Clock className="h-3.5 w-3.5" />
                        {timeLimit} mins
                      </span>
                    )}
                  </div>

                  <h4 className="text-base font-bold text-[var(--color-text)] dark:text-slate-100 font-sans">
                    {quiz.title}
                  </h4>

                  <p className="text-xs text-[var(--color-text-muted)] dark:text-slate-400 line-clamp-2">
                    {quiz.description || 'Complete this assessment to test your understanding of the curriculum.'}
                  </p>

                  <p className="text-xs font-semibold text-[var(--color-primary)] dark:text-sky-400">
                    {questionCount} Questions
                  </p>
                </div>

                <div className="pt-2 border-t border-[var(--color-border)]/60 dark:border-slate-800 flex items-center gap-2">
                  <AddToCalendarButton
                    event={{
                      id: quiz.id,
                      title: `Quiz: ${quiz.title}`,
                      description: quiz.description || 'Module Quiz Examination for HTEIM School of Ministry',
                      location: 'HTEIM Student Portal Online',
                      date: quizDate,
                      courseCode: quiz.moduleTrack || 'SOM'
                    }}
                    className="shrink-0"
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    fullWidth
                    onClick={() => onTakeQuiz?.(quiz)}
                    rightIcon={<ArrowRight className="h-4 w-4" />}
                  >
                    Start Quiz
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
