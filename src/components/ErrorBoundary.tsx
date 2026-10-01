import React, { Component, ErrorInfo } from 'react';
import { AlertCircle, RefreshCw, WifiOff, Database, Lock, ShieldAlert } from 'lucide-react';
import { classifyError } from '../lib/errorHandler';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Label shown in the fallback UI, e.g. "Attendance Tab" */
  label?: string;
  /** Optional callback when the user clicks "Try again" */
  onReset?: () => void;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // @ts-ignore
  override props: ErrorBoundaryProps;
  // @ts-ignore
  override state: ErrorBoundaryState = { hasError: false, error: null };

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.props = props;
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[ErrorBoundary] Caught in "${this.props.label ?? 'component'}":`, error, info.componentStack);
  }

  handleReset = () => {
    // @ts-ignore
    (this as any).setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const label = this.props.label ?? 'this section';
    const appError = classifyError(this.state.error, 'unknown');

    // Choose visual styling and icon based on error classification
    const styleMap = {
      network: {
        bg: 'bg-indigo-50 border-indigo-200 dark:bg-slate-950/30 dark:border-slate-800',
        text: 'text-indigo-900 dark:text-slate-200',
        subtext: 'text-indigo-700 dark:text-slate-400',
        icon: WifiOff,
        color: 'text-indigo-600 dark:text-slate-400',
        badge: 'bg-indigo-100 dark:bg-slate-900/60',
      },
      database: {
        bg: 'bg-amber-50 border-amber-200 dark:bg-amber-950/10 dark:border-amber-900',
        text: 'text-amber-900 dark:text-amber-200',
        subtext: 'text-amber-700 dark:text-amber-400',
        icon: Database,
        color: 'text-amber-600 dark:text-amber-400',
        badge: 'bg-amber-100 dark:bg-amber-900/60',
      },
      unauthorized: {
        bg: 'bg-rose-50 border-rose-200 dark:bg-rose-950/20 dark:border-rose-900',
        text: 'text-rose-900 dark:text-rose-200',
        subtext: 'text-rose-700 dark:text-rose-400',
        icon: Lock,
        color: 'text-rose-600 dark:text-rose-400',
        badge: 'bg-rose-100 dark:bg-rose-900/60',
      },
      authentication: {
        bg: 'bg-rose-50 border-rose-200 dark:bg-rose-950/20 dark:border-rose-900',
        text: 'text-rose-900 dark:text-rose-200',
        subtext: 'text-rose-700 dark:text-rose-400',
        icon: ShieldAlert,
        color: 'text-rose-600 dark:text-rose-400',
        badge: 'bg-rose-100 dark:bg-rose-900/60',
      },
      unknown: {
        bg: 'bg-rose-50 border-rose-200 dark:bg-rose-950/30 dark:border-rose-900',
        text: 'text-rose-900 dark:text-rose-200',
        subtext: 'text-rose-700 dark:text-rose-400',
        icon: AlertCircle,
        color: 'text-rose-600 dark:text-rose-400',
        badge: 'bg-rose-100 dark:bg-rose-900/60',
      }
    };

    const visual = styleMap[appError.type as keyof typeof styleMap] || styleMap.unknown;
    const Icon = visual.icon;

    return (
      <div
        role="alert"
        className={`flex flex-col items-center justify-center min-h-[280px] gap-4 p-8 text-center rounded-xl border ${visual.bg} m-4 animate-fadeIn`}
      >
        <div className={`w-12 h-12 rounded-full ${visual.badge} flex items-center justify-center`}>
          <Icon className={`w-6 h-6 ${visual.color}`} />
        </div>
        <div className="space-y-1.5 max-w-sm">
          <h3 className={`text-base font-black ${visual.text}`}>
            Unable to render {label}
          </h3>
          <p className={`text-xs ${visual.subtext} font-medium leading-relaxed`}>
            {appError.userMessage}
          </p>
          <p className="text-[10px] text-slate-400 font-medium">
            The rest of the portal is unaffected and running properly.
          </p>
        </div>
        <button
          type="button"
          onClick={this.handleReset}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-md hover:shadow-indigo-600/10 active:opacity-80 cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          Reload Section
        </button>
      </div>
    );
  }
}
