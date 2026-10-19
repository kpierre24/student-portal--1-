import React from 'react';
import { Analytics } from '@vercel/analytics/react';
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
