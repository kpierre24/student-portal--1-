import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { Analytics } from '@vercel/analytics/next';
import fs from 'fs';
import path from 'path';

describe('Vercel Analytics Integration', () => {
  it('renders <Analytics /> component without errors', () => {
    const { container } = render(<Analytics />);
    expect(container).toBeDefined();
  });

  it('allows Vercel Analytics domains in CSP meta tag in index.html', () => {
    const indexHtml = fs.readFileSync(path.resolve(__dirname, '../../index.html'), 'utf-8');
    expect(indexHtml).toContain('https://va.vercel-scripts.com');
    expect(indexHtml).toContain('https://*.vercel-insights.com');
  });

  it('configures CSP and @vercel/analytics alias in vite.config.ts', () => {
    const viteConfig = fs.readFileSync(path.resolve(__dirname, '../../vite.config.ts'), 'utf-8');
    expect(viteConfig).toContain('@vercel/analytics/next');
    expect(viteConfig).toContain('https://va.vercel-scripts.com');
    expect(viteConfig).toContain('https://*.vercel-insights.com');
  });
});
