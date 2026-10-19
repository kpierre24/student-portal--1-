import React from 'react';
import { Analytics } from '@vercel/analytics/next';
import { AppProviders } from './app/AppProviders';
import { AppRouter } from './app/AppRouter';

export default function App() {
  return (
    <AppProviders>
      <AppRouter />
      <Analytics />
    </AppProviders>
  );
}
