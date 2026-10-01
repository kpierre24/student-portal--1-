import React from 'react';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { ApplicationStateProvider, useTheme, ThemeMode } from '../state/application';

export { useTheme, type ThemeMode };
export * from '../state/application';

export interface AppProvidersProps {
  children: React.ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ErrorBoundary label="App Core Provider">
      <ApplicationStateProvider>
        {children}
      </ApplicationStateProvider>
    </ErrorBoundary>
  );
}

export default AppProviders;
