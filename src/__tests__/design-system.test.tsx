import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Input,
  Select,
  Tabs,
  EmptyState,
  LoadingState,
  ErrorState,
  Skeleton,
  MetricCard,
  StatusCard,
  ActionCard,
} from '../components/ui';

describe('Phase 0 Design System Primitives', () => {
  it('renders Button with variants, sizes, and handles clicks', () => {
    const handleClick = vi.fn();
    const { container } = render(
      <Button variant="primary" size="md" onClick={handleClick}>
        Submit Application
      </Button>
    );

    const button = container.querySelector('button');
    expect(button).toBeDefined();
    if (button) fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders Card with subcomponents and padding presets', () => {
    render(
      <Card variant="default" padding="md">
        <CardHeader>
          <CardTitle>Curriculum Module</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Theology & Systematic Doctrine</p>
        </CardContent>
      </Card>
    );

    expect(screen.getByText('Curriculum Module')).toBeDefined();
    expect(screen.getByText('Theology & Systematic Doctrine')).toBeDefined();
  });

  it('renders Badge with semantic variants and accessibility', () => {
    render(<Badge variant="success">Satisfactory (85%)</Badge>);
    expect(screen.getByText('Satisfactory (85%)')).toBeDefined();
  });

  it('renders Input with labels, helper text, and handles changes', () => {
    const handleChange = vi.fn();
    render(
      <Input
        label="Student Email"
        helperText="Enter your official student email"
        placeholder="student@hteim.edu"
        onChange={handleChange}
      />
    );

    expect(screen.getByLabelText('Student Email')).toBeDefined();
    expect(screen.getByText('Enter your official student email')).toBeDefined();
    const input = screen.getByPlaceholderText('student@hteim.edu');
    fireEvent.change(input, { target: { value: 'jdoe@hteim.edu' } });
    expect(handleChange).toHaveBeenCalled();
  });

  it('renders Select with options and labels', () => {
    render(
      <Select
        label="Cohort Semester"
        options={[
          { value: 'fall-2026', label: 'Fall 2026' },
          { value: 'spring-2027', label: 'Spring 2027' },
        ]}
      />
    );

    expect(screen.getByLabelText('Cohort Semester')).toBeDefined();
    expect(screen.getByText('Fall 2026')).toBeDefined();
  });

  it('renders Tabs and triggers tab selection', () => {
    const handleChange = vi.fn();
    render(
      <Tabs
        tabs={[
          { id: 'attendance', label: 'Attendance' },
          { id: 'grades', label: 'Academic Grades' },
        ]}
        activeTab="attendance"
        onChange={handleChange}
      />
    );

    const gradesTab = screen.getByText('Academic Grades');
    fireEvent.click(gradesTab);
    expect(handleChange).toHaveBeenCalledWith('grades');
  });

  it('renders EmptyState, LoadingState, and ErrorState', () => {
    const handleRetry = vi.fn();
    const { container } = render(
      <div>
        <EmptyState title="No Outstanding Tuitions" description="All accounts are balanced." />
        <LoadingState label="Hydrating ministry database…" />
        <ErrorState title="Connection Failed" onRetry={handleRetry} />
      </div>
    );

    expect(screen.getByText('No Outstanding Tuitions')).toBeDefined();
    expect(screen.getByText('Hydrating ministry database…')).toBeDefined();
    expect(screen.getByText('Connection Failed')).toBeDefined();

    const retryBtn = container.querySelector('button');
    if (retryBtn) fireEvent.click(retryBtn);
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });

  it('renders Skeleton primitives with aria-hidden', () => {
    const { container } = render(<Skeleton className="w-24 h-6" />);
    const skeletonEl = container.firstChild as HTMLElement;
    expect(skeletonEl.getAttribute('aria-hidden')).toBe('true');
  });

  it('renders MetricCard with label, value, and change trend', () => {
    render(
      <MetricCard
        label="Attendance Rate"
        value="92.4%"
        change="+4.2%"
        changeType="increase"
        caption="vs. previous month"
      />
    );

    expect(screen.getByText('Attendance Rate')).toBeDefined();
    expect(screen.getByText('92.4%')).toBeDefined();
    expect(screen.getByText('+4.2%')).toBeDefined();
  });

  it('renders StatusCard with status badge and progress indicator', () => {
    render(
      <StatusCard
        status="active"
        title="Spring 2026 Term"
        subtitle="School of Ministry"
        progress={80}
      />
    );

    expect(screen.getByText('Spring 2026 Term')).toBeDefined();
    expect(screen.getByText('ACTIVE')).toBeDefined();
  });

  it('renders ActionCard and fires click callback', () => {
    const handleClick = vi.fn();
    const { container } = render(
      <ActionCard
        title="Check In Attendance"
        description="Mark manual roster check-in"
        icon={<span data-testid="test-icon">icon</span>}
        onClick={handleClick}
      />
    );

    expect(screen.getByText('Check In Attendance')).toBeDefined();
    const clickable = container.firstChild as HTMLElement;
    fireEvent.click(clickable);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
