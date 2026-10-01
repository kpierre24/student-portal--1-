import React from 'react';
import { ExaminationsPageProps } from '../types';
import { ExamsTab } from '../../../components/ExamsTab';

export const ExaminationsPage: React.FC<ExaminationsPageProps> = (props) => {
  return <ExamsTab {...(props as any)} />;
};

export default ExaminationsPage;
