import React from 'react';
import { QuizDashboard, QuizDashboardProps } from '../features/assessments/quizzes/QuizDashboard';

export type AdminQuizzesDashboardProps = QuizDashboardProps;

export const AdminQuizzesDashboard: React.FC<AdminQuizzesDashboardProps> = (props) => {
  return <QuizDashboard {...props} />;
};
