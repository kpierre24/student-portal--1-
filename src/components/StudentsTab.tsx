import React from 'react';
import { StudentsPage } from '../features/students';
import { StudentSummary, ClassDay } from '../types';

export type StudentSummaryData = StudentSummary;

export interface StudentsTabProps {
  students: StudentSummaryData[];
  classDays?: ClassDay[];
  onSelectStudentForTranscript?: (student: StudentSummaryData) => void;
  onSelectStudentForCertificate?: (student: StudentSummaryData) => void;
  onSelectStudentForEmail?: (student: StudentSummaryData) => void;
  onDeleteStudent?: (studentName: string) => void;
  atRiskThreshold?: number;
  satisfactoryThreshold?: number;
  onStudentsChange?: (updatedStudents: StudentSummaryData[]) => void;
  appRole?: string;
  [key: string]: any;
}

export const StudentsTab: React.FC<StudentsTabProps> = ({
  students,
  classDays,
  onSelectStudentForTranscript,
  onStudentsChange,
}) => {
  return (
    <StudentsPage
      initialStudents={students}
      classDays={classDays}
      onSelectStudentForTranscript={onSelectStudentForTranscript}
      onStudentsChange={onStudentsChange}
    />
  );
};
