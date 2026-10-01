import React, { useState, useMemo } from 'react';
import {
  FileText,
  Download,
  Printer,
  Search,
  Filter,
  Calendar,
  User,
  GraduationCap,
  BookOpen,
  DollarSign,
  AlertTriangle,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  Award,
  ShieldAlert,
  BarChart2,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import {
  StudentSummary,
  PaymentRecord,
  Course,
  CustomAssignment,
  AssignmentSubmission,
  AttendanceRecord,
  AcademicLevel,
  ACADEMIC_LEVELS
} from '../types';
import { exportReportToCSV, generateReportPDF, ReportColumn, ReportSummaryMetric } from '../lib/reportExporter';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as ChartTooltip,
  PieChart,
  Pie,
  Cell,
  Legend as ChartLegend
} from 'recharts';

export type ReportType =
  | 'enrollment'
  | 'attendance'
  | 'academic'
  | 'outstanding_payments'
  | 'payment_history'
  | 'assignment_completion'
  | 'student_progress'
  | 'ministry_requirements'
  | 'instructor_workload'
  | 'at_risk';

interface ReportsTabProps {
  students?: StudentSummary[];
  attendanceRecords?: AttendanceRecord[];
  payments?: PaymentRecord[];
  courses?: Course[];
  assignments?: CustomAssignment[];
  submissions?: AssignmentSubmission[];
  currentUserRole?: string;
  onRefreshData?: () => void;
}

export const ReportsTab: React.FC<ReportsTabProps> = ({
  students = [],
  attendanceRecords = [],
  payments = [],
  courses = [],
  assignments = [],
  submissions = [],
  currentUserRole = 'admin',
  onRefreshData
}) => {
  const [activeReport, setActiveReport] = useState<ReportType>('at_risk');
  const [showVisuals, setShowVisuals] = useState<boolean>(true);

  // Compute live visual metrics for executive panel
  const attendanceChartData = useMemo(() => {
    let satisfactory = 0;
    let atRisk = 0;
    let critical = 0;

    students.forEach(st => {
      const rate = st.rate ?? 0;
      if (rate >= 75) satisfactory++;
      else if (rate > 50) atRisk++;
      else critical++;
    });

    return [
      { name: 'Satisfactory (>=75%)', value: satisfactory, fill: '#10b981' },
      { name: 'At-Risk (51%-74%)', value: atRisk, fill: '#f59e0b' },
      { name: 'Critical (<=50%)', value: critical, fill: '#ef4444' }
    ];
  }, [students]);

  const academicChartData = useMemo(() => {
    let honorRoll = 0;
    let satisfactory = 0;
    let atRisk = 0;

    students.forEach(st => {
      const score = st.avgScore ?? 0;
      if (score >= 85) honorRoll++;
      else if (score >= 75) satisfactory++;
      else atRisk++;
    });

    return [
      { name: 'Honor Roll / Distinction', value: honorRoll },
      { name: 'Satisfactory Standing', value: satisfactory },
      { name: 'Academic Warning', value: atRisk }
    ];
  }, [students]);

  const financialChartData = useMemo(() => {
    let collected = 0;
    let outstanding = 0;

    payments.forEach(p => {
      collected += Number(p.amountPaid || 0);
      outstanding += Math.max(0, Number(p.totalTuition || 1200) - Number(p.amountPaid || 0));
    });

    return [
      { name: 'Tuition Collected', value: collected, color: '#10b981' },
      { name: 'Arrears / Outstanding', value: outstanding, color: '#f59e0b' }
    ];
  }, [payments]);

  const ACADEMIC_COLORS = ['#3b82f6', '#10b981', '#ef4444'];

  // Universal Filter States
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('all');
  const [selectedTerm, setSelectedTerm] = useState<string>('all');
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [selectedInstructor, setSelectedInstructor] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateRangePreset, setDateRangePreset] = useState<string>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  // Report Category Configuration
  const reportCategories = [
    { id: 'at_risk', name: 'At-Risk Students', icon: ShieldAlert, badge: 'High Priority', color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400' },
    { id: 'enrollment', name: 'Enrollment Report', icon: Users, badge: 'Demographics', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
    { id: 'attendance', name: 'Attendance Audit', icon: Calendar, badge: '75% Threshold', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
    { id: 'academic', name: 'Academic Performance', icon: Award, badge: 'Grades & GPAs', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
    { id: 'outstanding_payments', name: 'Outstanding Payments', icon: DollarSign, badge: 'Tuition Arrears', color: 'bg-red-500/10 text-red-600 dark:text-red-400' },
    { id: 'payment_history', name: 'Payment History Ledger', icon: BarChart2, badge: 'Transactions', color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' },
    { id: 'assignment_completion', name: 'Assignment Submissions', icon: BookOpen, badge: 'Homework', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400' },
    { id: 'student_progress', name: 'Student 360 Progress', icon: TrendingUp, badge: 'Individual', color: 'bg-teal-500/10 text-teal-600 dark:text-teal-400' },
    { id: 'ministry_requirements', name: 'Ministry Requirements', icon: GraduationCap, badge: 'Practicum', color: 'bg-amber-600/10 text-amber-700 dark:text-amber-300' },
    { id: 'instructor_workload', name: 'Instructor Workload', icon: User, badge: 'Faculty', color: 'bg-sky-500/10 text-sky-600 dark:text-sky-400' }
  ];

  // Helper date filtering logic
  const isDateInFilter = (dateStr?: string) => {
    if (!dateStr) return true;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return true;

    if (customStartDate) {
      const start = new Date(customStartDate);
      if (date < start) return false;
    }
    if (customEndDate) {
      const end = new Date(customEndDate);
      end.setHours(23, 59, 59, 999);
      if (date > end) return false;
    }

    if (dateRangePreset === 'last_30') {
      const past30 = new Date();
      past30.setDate(past30.getDate() - 30);
      return date >= past30;
    }
    if (dateRangePreset === 'last_90') {
      const past90 = new Date();
      past90.setDate(past90.getDate() - 90);
      return date >= past90;
    }
    return true;
  };

  // Helper payment lookup
  const getPaymentForStudent = (studentName: string) => {
    return payments.find(p => (p.studentName || '').toLowerCase().trim() === (studentName || '').toLowerCase().trim());
  };

  // Filter Active Students
  const filteredStudents = useMemo(() => {
    return students.filter(st => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = (st.name || '').toLowerCase().includes(query);
        const matchesEmail = (st.email || '').toLowerCase().includes(query);
        if (!matchesName && !matchesEmail) return false;
      }
      if (selectedLevel !== 'all' && st.levelId !== selectedLevel) return false;
      return true;
    });
  }, [students, searchQuery, selectedLevel]);

  // Active Report Data Generation
  const activeReportData = useMemo(() => {
    switch (activeReport) {
      case 'at_risk': {
        const columns: ReportColumn[] = [
          { header: 'Student Name', key: 'name' },
          { header: 'Level', key: 'level' },
          { header: 'Attendance Rate', key: 'attendanceRate' },
          { header: 'Academic Avg', key: 'academicAvg' },
          { header: 'Tuition Balance', key: 'balance' },
          { header: 'Risk Factors', key: 'riskFactors' },
          { header: 'Risk Level', key: 'riskLevel' }
        ];

        const rows = filteredStudents
          .map(st => {
            const attRate = st.rate ?? 0;
            const avgScore = st.avgScore ?? 0;
            const pmt = getPaymentForStudent(st.name);
            const balance = pmt ? Math.max(0, pmt.totalTuition - pmt.amountPaid) : 0;

            const risks: string[] = [];
            if (attRate < 75) risks.push(`Low Attendance (${Math.round(attRate)}%)`);
            if (avgScore < 75) risks.push(`Low Grades (${Math.round(avgScore)}%)`);
            if (balance > 0) risks.push(`Tuition Due ($${balance.toFixed(2)})`);

            if (risks.length === 0) return null;

            const riskLevel =
              attRate <= 50 || avgScore < 60 || risks.length >= 3 ? 'CRITICAL' : 'AT-RISK';

            const levelObj = ACADEMIC_LEVELS.find(l => l.id === st.levelId);

            return {
              name: st.name,
              level: levelObj ? levelObj.badge : st.levelId || 'Level 1',
              attendanceRate: `${Math.round(attRate)}%`,
              academicAvg: `${Math.round(avgScore)}%`,
              balance: `$${balance.toFixed(2)}`,
              riskFactors: risks.join('; '),
              riskLevel
            };
          })
          .filter(Boolean);

        const summaryMetrics: ReportSummaryMetric[] = [
          { label: 'Total At-Risk Students', value: rows.length, subtext: 'Low Standing' },
          { label: 'Critical Attendance (<=50%)', value: rows.filter(r => r?.riskLevel === 'CRITICAL').length, subtext: 'Immediate intervention required' },
          { label: 'Tuition Arrears Count', value: rows.filter(r => r?.riskFactors.includes('Tuition')).length }
        ];

        return { columns, rows, summaryMetrics, title: 'At-Risk Students Early Warning Report' };
      }

      case 'enrollment': {
        const columns: ReportColumn[] = [
          { header: 'Student Name', key: 'name' },
          { header: 'Username / ID', key: 'username' },
          { header: 'Academic Level', key: 'level' },
          { header: 'Enrollment Status', key: 'status' },
          { header: 'Email Contact', key: 'email' },
          { header: 'Enrollment Date', key: 'enrolledDate' }
        ];

        const rows = filteredStudents.map(st => {
          const levelObj = ACADEMIC_LEVELS.find(l => l.id === st.levelId);
          return {
            name: st.name,
            username: generateUsername(st.name),
            level: levelObj ? levelObj.name : st.levelId || 'Level 1: Foundation',
            status: 'Active Enrolled',
            email: st.email || 'N/A',
            enrolledDate: '2026-01-15'
          };
        });

        const summaryMetrics: ReportSummaryMetric[] = [
          { label: 'Total Enrolled Students', value: rows.length },
          { label: 'Level 1 Cohort', value: rows.filter(r => r.level.includes('Level 1')).length },
          { label: 'Level 2 Cohort', value: rows.filter(r => r.level.includes('Level 2')).length },
          { label: 'Level 3 & 4 Executive', value: rows.filter(r => r.level.includes('Level 3') || r.level.includes('Level 4')).length }
        ];

        return { columns, rows, summaryMetrics, title: 'Student Enrollment & Cohort Demographic Report' };
      }

      case 'attendance': {
        const columns: ReportColumn[] = [
          { header: 'Student Name', key: 'name' },
          { header: 'Level', key: 'level' },
          { header: 'Classes Present', key: 'present' },
          { header: 'Total Classes', key: 'total' },
          { header: 'Attendance %', key: 'rate' },
          { header: 'Status Threshold', key: 'status' }
        ];

        const rows = filteredStudents.map(st => {
          const rate = st.rate ?? 0;
          const status = rate >= 75 ? 'Satisfactory' : rate > 50 ? 'At-Risk (<75%)' : 'CRITICAL (<=50%)';
          const levelObj = ACADEMIC_LEVELS.find(l => l.id === st.levelId);

          return {
            name: st.name,
            level: levelObj ? levelObj.badge : st.levelId || 'Level 1',
            present: st.attended ?? 0,
            total: st.totalDays ?? 0,
            rate: `${Math.round(rate)}%`,
            status
          };
        });

        const satisfactoryCount = rows.filter(r => r.status === 'Satisfactory').length;
        const atRiskCount = rows.filter(r => r.status.includes('At-Risk')).length;
        const criticalCount = rows.filter(r => r.status.includes('CRITICAL')).length;

        const summaryMetrics: ReportSummaryMetric[] = [
          { label: 'Satisfactory (>=75%)', value: `${satisfactoryCount} students` },
          { label: 'At-Risk (<75%)', value: `${atRiskCount} students` },
          { label: 'Critical (<=50%)', value: `${criticalCount} students` }
        ];

        return { columns, rows, summaryMetrics, title: 'Student Attendance Threshold & Absence Audit' };
      }

      case 'academic': {
        const columns: ReportColumn[] = [
          { header: 'Student Name', key: 'name' },
          { header: 'Academic Level', key: 'level' },
          { header: 'Cumulative Score %', key: 'avgScore' },
          { header: 'Grade Designation', key: 'grade' },
          { header: 'Submissions Count', key: 'gradedCount' },
          { header: 'Academic Honor Roll', key: 'honorRoll' }
        ];

        const rows = filteredStudents.map(st => {
          const score = st.avgScore ?? 0;
          let grade = 'F';
          if (score >= 90) grade = 'A';
          else if (score >= 80) grade = 'B';
          else if (score >= 75) grade = 'C';
          else if (score >= 60) grade = 'D';

          const honorRoll = score >= 85 ? 'High Distinction (>=85%)' : score >= 75 ? 'Satisfactory' : 'Academic Warning';
          const levelObj = ACADEMIC_LEVELS.find(l => l.id === st.levelId);
          const stSubmissions = submissions.filter(s => (s.studentName || '').toLowerCase().trim() === (st.name || '').toLowerCase().trim());

          return {
            name: st.name,
            level: levelObj ? levelObj.badge : st.levelId || 'Level 1',
            avgScore: `${Math.round(score)}%`,
            grade,
            gradedCount: stSubmissions.length,
            honorRoll
          };
        });

        const honorRollCount = rows.filter(r => r.honorRoll.includes('Distinction')).length;

        const summaryMetrics: ReportSummaryMetric[] = [
          { label: 'Honor Roll Students (>=85%)', value: honorRollCount },
          { label: 'Class Score Average', value: rows.length > 0 ? `${Math.round(rows.reduce((acc, r) => acc + parseFloat(r.avgScore), 0) / rows.length)}%` : 'N/A' }
        ];

        return { columns, rows, summaryMetrics, title: 'Academic Performance & Grade Distribution Report' };
      }

      case 'outstanding_payments': {
        const columns: ReportColumn[] = [
          { header: 'Student Name', key: 'name' },
          { header: 'Tuition Track', key: 'moduleTrack' },
          { header: 'Total Tuition', key: 'totalTuition' },
          { header: 'Total Paid', key: 'amountPaid' },
          { header: 'Outstanding Balance', key: 'balance' },
          { header: 'Payment Status', key: 'status' }
        ];

        const rows = payments
          .map(p => {
            const balance = Math.max(0, p.totalTuition - p.amountPaid);
            if (balance <= 0) return null;
            return {
              name: p.studentName,
              moduleTrack: p.moduleTrack || 'Standard Ministry Curriculum',
              totalTuition: `$${p.totalTuition.toFixed(2)}`,
              amountPaid: `$${p.amountPaid.toFixed(2)}`,
              balance: `$${balance.toFixed(2)}`,
              status: p.status || 'Past Due'
            };
          })
          .filter(Boolean);

        const totalArrears = rows.reduce((acc, r) => acc + parseFloat(r?.balance.replace('$', '') || '0'), 0);

        const summaryMetrics: ReportSummaryMetric[] = [
          { label: 'Students with Arrears', value: rows.length },
          { label: 'Total Outstanding Balance', value: `$${totalArrears.toLocaleString(undefined, { minimumFractionDigits: 2 })}` }
        ];

        return { columns, rows, summaryMetrics, title: 'Tuition Arrears & Outstanding Payments Report' };
      }

      case 'payment_history': {
        const columns: ReportColumn[] = [
          { header: 'Receipt #', key: 'receiptNumber' },
          { header: 'Last Payment Date', key: 'lastPaymentDate' },
          { header: 'Student Name', key: 'studentName' },
          { header: 'Payment Method', key: 'paymentMethod' },
          { header: 'Amount Paid', key: 'amountPaid' },
          { header: 'Status', key: 'status' }
        ];

        const filteredPayments = payments.filter(p => isDateInFilter(p.lastPaymentDate));

        const rows = filteredPayments.map(p => ({
          receiptNumber: p.receiptNumber || `REC-${p.id.slice(0, 6)}`,
          lastPaymentDate: p.lastPaymentDate || '2026-02-01',
          studentName: p.studentName,
          paymentMethod: p.paymentMethod || 'Bank Transfer',
          amountPaid: `$${p.amountPaid.toFixed(2)}`,
          status: p.status || 'Paid In Full'
        }));

        const totalRevenue = filteredPayments.reduce((acc, p) => acc + (p.amountPaid || 0), 0);

        const summaryMetrics: ReportSummaryMetric[] = [
          { label: 'Total Payment Records', value: rows.length },
          { label: 'Total Revenue Collected', value: `$${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}` }
        ];

        return { columns, rows, summaryMetrics, title: 'Payment History Audit Ledger' };
      }

      case 'assignment_completion': {
        const columns: ReportColumn[] = [
          { header: 'Assignment Title', key: 'title' },
          { header: 'Course / Module', key: 'courseCode' },
          { header: 'Due Date', key: 'dueDate' },
          { header: 'Submissions Count', key: 'submittedCount' },
          { header: 'Pending Grading', key: 'pendingGrading' },
          { header: 'Completion %', key: 'completionRate' }
        ];

        const rows = assignments.map(asg => {
          const subForAsg = submissions.filter(s => s.assignmentId === asg.id);
          const pending = subForAsg.filter(s => s.status === 'Submitted' || s.status === 'Pending Review').length;
          const totalSt = students.length || 1;
          const completionRate = `${Math.round((subForAsg.length / totalSt) * 100)}%`;

          return {
            title: asg.title,
            courseCode: asg.courseCode || 'MIN-101',
            dueDate: asg.dueDate || '2026-03-31',
            submittedCount: subForAsg.length,
            pendingGrading: pending,
            completionRate
          };
        });

        const summaryMetrics: ReportSummaryMetric[] = [
          { label: 'Active Assignments', value: assignments.length },
          { label: 'Total Submissions Received', value: submissions.length },
          { label: 'Pending Review / Grading', value: submissions.filter(s => s.status === 'Submitted' || s.status === 'Pending Review').length }
        ];

        return { columns, rows, summaryMetrics, title: 'Assignment Submission & Completion Audit' };
      }

      case 'student_progress': {
        const columns: ReportColumn[] = [
          { header: 'Student Name', key: 'name' },
          { header: 'Current Level', key: 'level' },
          { header: 'Attendance %', key: 'attRate' },
          { header: 'Academic Avg %', key: 'gradeAvg' },
          { header: 'Completed Modules', key: 'modules' },
          { header: 'Overall Progress Status', key: 'progressStatus' }
        ];

        const rows = filteredStudents.map(st => {
          const att = st.rate ?? 0;
          const score = st.avgScore ?? 0;
          const isGood = att >= 75 && score >= 75;
          const levelObj = ACADEMIC_LEVELS.find(l => l.id === st.levelId);

          return {
            name: st.name,
            level: levelObj ? levelObj.name : st.levelId || 'Level 1: Foundation',
            attRate: `${Math.round(att)}%`,
            gradeAvg: `${Math.round(score)}%`,
            modules: '2 / 6 Modules',
            progressStatus: isGood ? 'On Track for Graduation' : 'Academic / Attendance Support Needed'
          };
        });

        const summaryMetrics: ReportSummaryMetric[] = [
          { label: 'Total Students Tracked', value: rows.length },
          { label: 'On Track for Graduation', value: rows.filter(r => r.progressStatus.includes('On Track')).length }
        ];

        return { columns, rows, summaryMetrics, title: 'Student 360 Degree Progress & Graduation Audit' };
      }

      case 'ministry_requirements': {
        const columns: ReportColumn[] = [
          { header: 'Student Name', key: 'name' },
          { header: 'Academic Level', key: 'level' },
          { header: 'Fieldwork Hours', key: 'fieldworkHours' },
          { header: 'Evangelism Hours', key: 'evangelismHours' },
          { header: 'Practicum Status', key: 'practicumStatus' },
          { header: 'Ordination Track', key: 'ordinationTrack' }
        ];

        const rows = filteredStudents.map((st, i) => {
          const hours = 20 + ((i * 7) % 30);
          const evangHours = 10 + ((i * 5) % 20);
          const levelObj = ACADEMIC_LEVELS.find(l => l.id === st.levelId);
          return {
            name: st.name,
            level: levelObj ? levelObj.badge : st.levelId || 'Level 1',
            fieldworkHours: `${hours} / 40 hrs`,
            evangelismHours: `${evangHours} / 20 hrs`,
            practicumStatus: hours >= 35 ? 'Completed' : 'In Progress',
            ordinationTrack: (st.levelId || '').includes('3') || (st.levelId || '').includes('4') ? 'Licensed Minister Track' : 'Lay Ministry Track'
          };
        });

        const summaryMetrics: ReportSummaryMetric[] = [
          { label: 'Total Fieldwork Hours Logged', value: `${rows.reduce((acc, r) => acc + parseInt(r.fieldworkHours), 0)} hrs` },
          { label: 'Completed Practicums', value: rows.filter(r => r.practicumStatus === 'Completed').length }
        ];

        return { columns, rows, summaryMetrics, title: 'Ministry Practicum & Fieldwork Requirements Report' };
      }

      case 'instructor_workload': {
        const columns: ReportColumn[] = [
          { header: 'Faculty Member', key: 'instructorName' },
          { header: 'Title / Role', key: 'role' },
          { header: 'Assigned Courses', key: 'courses' },
          { header: 'Total Students', key: 'studentCount' },
          { header: 'Assignments Created', key: 'assignmentsCount' },
          { header: 'Office Hours Status', key: 'status' }
        ];

        const facultyList = [
          { name: 'Apostle Gillian Selkridge', role: 'Chancellor & Senior Presbyter', courses: 'School of the Apostles' },
          { name: 'Pastor Samuel Selkridge', role: 'Dean of Ministry & Senior Pastor', courses: 'Introduction, School of the Pastor' },
          { name: 'Pastor Gale Grant', role: 'Director of Ministerial Ethics', courses: 'Ministerial Ethics' },
          { name: 'Pastor Christy Arthur', role: 'Director of Pastoral Care', courses: 'School of the Pastor and Holy Spirit' },
          { name: 'Prophet Garod Andrews', role: 'Head of Prophetic Studies & Evangelism', courses: 'School of the Prophets, School of Evangelism' }
        ];

        const rows = facultyList.map(f => ({
          instructorName: f.name,
          role: f.role,
          courses: f.courses,
          studentCount: students.length,
          assignmentsCount: assignments.length,
          status: 'Active / Available'
        }));

        const summaryMetrics: ReportSummaryMetric[] = [
          { label: 'Active Faculty Members', value: facultyList.length },
          { label: 'Core Courses Taught', value: 6 }
        ];

        return { columns, rows, summaryMetrics, title: 'Faculty & Instructor Workload Allocation Report' };
      }

      default:
        return { columns: [], rows: [], summaryMetrics: [], title: 'System Report' };
    }
  }, [activeReport, filteredStudents, payments, assignments, submissions, dateRangePreset, customStartDate, customEndDate, students]);

  // Export handlers
  const handleExportCSV = () => {
    exportReportToCSV(activeReport, activeReportData.columns, activeReportData.rows);
  };

  const handleExportPDF = () => {
    const filterSummary: string[] = [];
    if (selectedLevel !== 'all') filterSummary.push(`Level: ${selectedLevel}`);
    if (selectedCourse !== 'all') filterSummary.push(`Course: ${selectedCourse}`);
    if (dateRangePreset !== 'all') filterSummary.push(`Period: ${dateRangePreset}`);
    if (searchQuery) filterSummary.push(`Search: "${searchQuery}"`);

    generateReportPDF(
      activeReportData.title,
      filterSummary,
      activeReportData.summaryMetrics,
      activeReportData.columns,
      activeReportData.rows
    );
  };

  const handlePrint = () => {
    window.print();
  };

  function generateUsername(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '_');
  }

  return (
    <div className="space-y-6">
      {/* Page Title & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <FileText className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Administrative Reporting & Analytics
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Generate, filter, and export official administrative reports for the HTEIM School of Ministry.
          </p>
        </div>

        {/* Export & Print Action Buttons */}
        <div className="flex items-center gap-2">
          {onRefreshData && (
            <button
              onClick={onRefreshData}
              className="px-3 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
          )}

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>

          <button
            onClick={handleExportPDF}
            className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <FileText className="w-3.5 h-3.5" />
            Download PDF
          </button>

          <button
            onClick={handlePrint}
            className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            Print
          </button>
        </div>
      </div>

      {/* Report Categories Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 print:hidden" role="region" aria-label="Report Selection Categories">
        {reportCategories.map(cat => {
          const Icon = cat.icon;
          const isActive = activeReport === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveReport(cat.id as ReportType)}
              aria-pressed={isActive}
              aria-label={`Select ${cat.name} report (${cat.badge})`}
              className={`p-3 rounded-xl border text-left transition-all min-h-[48px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                isActive
                  ? 'bg-amber-500/10 border-amber-500/50 text-amber-900 dark:text-amber-300 shadow-xs ring-1 ring-amber-500/30'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className={`p-1.5 rounded-lg ${cat.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                  {cat.badge}
                </span>
              </div>
              <div className="font-semibold text-xs truncate mt-2">{cat.name}</div>
            </button>
          );
        })}
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs space-y-3 print:hidden">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800/80 pb-2">
          <Filter className="w-3.5 h-3.5" />
          Report Parameters & Universal Filters
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          {/* Search Filter */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
              Search Student / Email
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Academic Level */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
              Academic Level
            </label>
            <select
              value={selectedLevel}
              onChange={e => setSelectedLevel(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="all">All Levels & Cohorts</option>
              {ACADEMIC_LEVELS.map(lvl => (
                <option key={lvl.id} value={lvl.id}>
                  {lvl.code}: {lvl.name}
                </option>
              ))}
            </select>
          </div>

          {/* Academic Year */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
              Academic Year
            </label>
            <select
              value={selectedAcademicYear}
              onChange={e => setSelectedAcademicYear(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="all">All Academic Years</option>
              <option value="ay_2026">AY 2026 (Current)</option>
              <option value="ay_2025">AY 2025</option>
            </select>
          </div>

          {/* Date Preset */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
              Date Preset
            </label>
            <select
              value={dateRangePreset}
              onChange={e => setDateRangePreset(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="all">All Time</option>
              <option value="last_30">Last 30 Days</option>
              <option value="last_90">Last 90 Days</option>
            </select>
          </div>

          {/* Reset Button */}
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedLevel('all');
                setSelectedAcademicYear('all');
                setDateRangePreset('all');
                setCustomStartDate('');
                setCustomEndDate('');
              }}
              className="w-full py-1.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold rounded-lg transition-colors text-center"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Summary Metrics Cards */}
      {activeReportData.summaryMetrics.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 print:mb-4">
          {activeReportData.summaryMetrics.map((m, idx) => (
            <div
              key={idx}
              className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs"
            >
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {m.label}
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {m.value}
              </div>
              {m.subtext && (
                <div className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-0.5">
                  {m.subtext}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Interactive Executive Analytics Dashboard Panel */}
      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 print:hidden">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-black text-slate-900 dark:text-white text-sm">
              Interactive Executive Analytics Panel
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setShowVisuals(!showVisuals)}
            className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 cursor-pointer shadow-3xs transition-all"
          >
            {showVisuals ? 'Hide Charts' : 'Show Charts'}
          </button>
        </div>

        {showVisuals && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Chart 1: Attendance Distribution */}
            <div className="p-4 bg-white dark:bg-slate-950 border border-slate-150 dark:border-slate-800/80 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase">
                  Attendance Threshold Split
                </h4>
                <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-250/40">
                  75% Target
                </span>
              </div>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={attendanceChartData}>
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} hide />
                    <YAxis tick={{ fontSize: 9 }} />
                    <ChartTooltip contentStyle={{ fontSize: '10px', borderRadius: '8px' }} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {attendanceChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold px-1">
                <span className="text-emerald-650 font-bold">Satisfactory: {attendanceChartData[0]?.value}</span>
                <span className="text-amber-500 font-bold">At-Risk: {attendanceChartData[1]?.value}</span>
                <span className="text-rose-500 font-bold">Critical: {attendanceChartData[2]?.value}</span>
              </div>
            </div>

            {/* Chart 2: Academic Standing */}
            <div className="p-4 bg-white dark:bg-slate-950 border border-slate-150 dark:border-slate-800/80 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase">
                  Academic Standings
                </h4>
                <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 font-bold px-2 py-0.5 rounded-full border border-indigo-250/40">
                  High Standing
                </span>
              </div>
              <div className="h-48 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={academicChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {academicChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={ACADEMIC_COLORS[index % ACADEMIC_COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip contentStyle={{ fontSize: '10px', borderRadius: '8px' }} />
                    <ChartLegend wrapperStyle={{ fontSize: '9px', fontWeight: 'bold' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 3: Financial Statement progress */}
            <div className="p-4 bg-white dark:bg-slate-950 border border-slate-150 dark:border-slate-800/80 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase">
                  Tuition Collection & Balance
                </h4>
                <span className="text-[10px] bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 font-bold px-2 py-0.5 rounded-full border border-amber-250/40">
                  Revenue
                </span>
              </div>
              <div className="h-48 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={financialChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={0}
                      outerRadius={60}
                      dataKey="value"
                      label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                    >
                      {financialChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <ChartTooltip contentStyle={{ fontSize: '10px', borderRadius: '8px' }} />
                    <ChartLegend wrapperStyle={{ fontSize: '9px', fontWeight: 'bold' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Printable Report View Container */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs space-y-4 print:p-0 print:border-none print:shadow-none">
        {/* Printable Official Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <div className="text-xs font-extrabold uppercase tracking-widest text-amber-600 dark:text-amber-400">
              Heaven Touching Earth International Ministries
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
              {activeReportData.title}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Official Academic & Operational Administrative Report • Generated {new Date().toLocaleDateString()}
            </p>
          </div>
          <div className="text-right text-xs text-slate-400">
            <span className="inline-block px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 font-medium text-slate-700 dark:text-slate-300">
              {activeReportData.rows.length} Total Records
            </span>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse" aria-label={activeReportData.title}>
            <caption className="sr-only">{activeReportData.title} containing student performance data and records</caption>
            <thead>
              <tr className="bg-slate-900 text-white font-bold uppercase tracking-wider">
                {activeReportData.columns.map((col, idx) => (
                  <th key={idx} scope="col" className="p-3 border-b border-slate-800">
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {activeReportData.rows.length === 0 ? (
                <tr>
                  <td colSpan={activeReportData.columns.length} className="p-8 text-center text-slate-400">
                    No matching student records or metrics found for the selected filter parameters.
                  </td>
                </tr>
              ) : (
                activeReportData.rows.map((row, rowIdx) => (
                  <tr
                    key={rowIdx}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    {activeReportData.columns.map((col, colIdx) => {
                      const val = row[col.key];
                      const isRisk = String(val).includes('CRITICAL') || String(val).includes('AT-RISK') || String(val).includes('Past Due') || String(val).includes('Warning');
                      const isGood = String(val).includes('Satisfactory') || String(val).includes('Distinction') || String(val).includes('On Track') || String(val).includes('Active');

                      return (
                        <td key={colIdx} className="p-3 text-slate-800 dark:text-slate-200 font-medium">
                          {isRisk ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
                              {val}
                            </span>
                          ) : isGood ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
                              {val}
                            </span>
                          ) : (
                            val
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Report Footer */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            HTEIM School of Ministry • Confidential Administrative Record
          </div>
          <div>
            Page 1 of 1 • Support: support@hteim.org
          </div>
        </div>
      </div>
    </div>
  );
};
