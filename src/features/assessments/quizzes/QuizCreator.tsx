import React from 'react';
import { QuizCreatorModal, QuizCreatorModalProps } from '../../../components/QuizCreatorModal';

export type QuizCreatorProps = QuizCreatorModalProps;

export const QuizCreator: React.FC<QuizCreatorProps> = (props) => {
  return <QuizCreatorModal {...props} />;
};
