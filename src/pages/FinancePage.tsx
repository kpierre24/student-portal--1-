import React, { Suspense } from 'react';
import { FinancePage as InstitutionalFinancePage } from '../features/finance/components/FinancePage';
import { PaymentTab } from '../components/PaymentTab';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { DashboardSkeleton } from '../components/DashboardSkeleton';

export interface FinancePageProps {
  appUser?: any;
  userRole?: string;
  availableStudents?: Array<{ name: string; email: string }>;
  currentStudentName?: string;
  payments?: any[];
  setPayments?: (payments: any[] | ((prev: any[]) => any[])) => void;
  onDeleteStudent?: (name: string) => void;
  onRestoreStudent?: (name: string) => void;
  [key: string]: any;
}

export const FinancePage: React.FC<FinancePageProps> = (props) => {
  const role = props.userRole || props.appUser?.role;
  const isStudent = role === 'student';

  return (
    <Suspense fallback={<DashboardSkeleton label="Loading Student Payment Statements & Tuition Invoices..." />}>
      <ErrorBoundary label="Payments Tab">
        <PaymentTab
          availableStudents={props.availableStudents || []}
          isAdmin={!isStudent}
          userRole={role}
          currentStudentName={props.currentStudentName || props.appUser?.studentName || props.appUser?.name}
          payments={props.payments || []}
          setPayments={props.setPayments || (() => {})}
          onDeleteStudent={props.onDeleteStudent || (() => {})}
          onRestoreStudent={props.onRestoreStudent || (() => {})}
          {...props}
        />
      </ErrorBoundary>
    </Suspense>
  );
};

export const PaymentsPage = FinancePage;
export default FinancePage;
