import React from 'react';
import { ThemeProvider } from './ThemeContext';
import { AuthProvider } from './AuthContext';
import { NavigationProvider } from './NavigationContext';
import { GlobalModalProvider } from './GlobalModalContext';
import { NotificationProvider } from './NotificationContext';

export interface ApplicationStateProviderProps {
  children: React.ReactNode;
}

/**
 * Level 2: Application State Provider
 * Manages global application concerns:
 * - Current User & Auth
 * - Theme & Dark Mode
 * - Navigation & Routing
 * - Global Modal Registry
 * - System Notifications & Toasts
 */
export function ApplicationStateProvider({ children }: ApplicationStateProviderProps) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NavigationProvider>
          <GlobalModalProvider>
            <NotificationProvider>
              {children}
            </NotificationProvider>
          </GlobalModalProvider>
        </NavigationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default ApplicationStateProvider;
