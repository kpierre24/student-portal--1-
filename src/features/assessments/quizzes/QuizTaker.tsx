import React from 'react';
import { QuizTakerView, QuizTakerViewProps } from '../../../components/QuizTakerView';

export type QuizTakerProps = QuizTakerViewProps;

export const QuizTaker: React.FC<QuizTakerProps> = (props) => {
  return <QuizTakerView {...props} />;
};
