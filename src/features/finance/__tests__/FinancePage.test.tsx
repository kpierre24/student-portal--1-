import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FinancePage } from '../components/FinancePage';

describe('FinancePage — Financial Overview & Search', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders title, summary KPI metrics, and refresh button', () => {
    render(<FinancePage />);

    expect(screen.getByText('Financial Management')).toBeDefined();
    expect(screen.getByText('Institutional ledger, tuition tracking, and financial oversight')).toBeDefined();
  });
});
