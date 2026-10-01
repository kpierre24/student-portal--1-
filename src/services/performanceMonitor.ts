/**
 * Real-Time Performance Monitoring Service for HTEIM School of Ministry Portal.
 * Measures dashboard load times, Web Vitals, navigation timings, and component trace durations.
 */

export interface PerformanceTrace {
  name: string;
  startTime: number;
  durationMs?: number;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface WebVitalsMetrics {
  ttfb?: number; // Time to First Byte
  domContentLoaded?: number;
  loadTime?: number;
  fcp?: number; // First Contentful Paint
  lcp?: number; // Largest Contentful Paint
  memoryUsageMb?: number;
}

export interface PerformanceSummary {
  vitals: WebVitalsMetrics;
  dashboardAvgLoadMs: number;
  recentTraces: PerformanceTrace[];
  slowTracesCount: number;
  rating: 'EXCELLENT' | 'GOOD' | 'NEEDS_OPTIMIZATION';
}

class PerformanceMonitorService {
  private traces = new Map<string, PerformanceTrace>();
  private completedTraces: PerformanceTrace[] = [];
  private dashboardRenders: number[] = [];
  private vitals: WebVitalsMetrics = {};

  constructor() {
    this.captureNavigationTimings();
  }

  /**
   * Start a timing trace for a component or operation.
   */
  startTrace(name: string, metadata?: Record<string, any>): void {
    if (typeof performance === 'undefined') return;
    const markName = `start_${name}_${Date.now()}`;
    performance.mark(markName);

    this.traces.set(name, {
      name,
      startTime: performance.now(),
      timestamp: new Date().toLocaleTimeString(),
      metadata
    });
  }

  /**
   * End timing trace and log duration.
   */
  endTrace(name: string): number | null {
    if (typeof performance === 'undefined') return null;
    const active = this.traces.get(name);
    if (!active) return null;

    const durationMs = Math.round(performance.now() - active.startTime);
    active.durationMs = durationMs;

    this.completedTraces.unshift(active);
    if (this.completedTraces.length > 50) {
      this.completedTraces.pop();
    }

    this.traces.delete(name);

    if (durationMs > 1000) {
      console.warn(`[PerformanceMonitor] Slow trace detected in "${name}": ${durationMs}ms`);
    }

    return durationMs;
  }

  /**
   * Record dashboard load duration specifically.
   */
  recordDashboardRender(durationMs: number, tabName: string = 'Home'): void {
    this.dashboardRenders.push(durationMs);
    if (this.dashboardRenders.length > 20) {
      this.dashboardRenders.shift();
    }

    this.startTrace(`dashboard_render_${tabName}`);
    const active = this.traces.get(`dashboard_render_${tabName}`);
    if (active) {
      active.durationMs = durationMs;
      this.completedTraces.unshift(active);
      this.traces.delete(`dashboard_render_${tabName}`);
    }
  }

  /**
   * Get comprehensive performance summary.
   */
  getPerformanceSummary(): PerformanceSummary {
    const avgLoad = this.dashboardRenders.length > 0
      ? Math.round(this.dashboardRenders.reduce((a, b) => a + b, 0) / this.dashboardRenders.length)
      : (this.vitals.loadTime ? Math.round(this.vitals.loadTime) : 180);

    const slowTraces = this.completedTraces.filter(t => (t.durationMs || 0) > 800);

    let rating: PerformanceSummary['rating'] = 'EXCELLENT';
    if (avgLoad > 1000 || slowTraces.length > 5) {
      rating = 'NEEDS_OPTIMIZATION';
    } else if (avgLoad > 500 || slowTraces.length > 2) {
      rating = 'GOOD';
    }

    return {
      vitals: { ...this.vitals },
      dashboardAvgLoadMs: avgLoad,
      recentTraces: [...this.completedTraces],
      slowTracesCount: slowTraces.length,
      rating
    };
  }

  private captureNavigationTimings(): void {
    if (typeof window === 'undefined' || !window.performance) return;

    window.addEventListener('load', () => {
      setTimeout(() => {
        try {
          const timing = performance.timing;
          if (timing) {
            this.vitals.ttfb = timing.responseStart - timing.navigationStart;
            this.vitals.domContentLoaded = timing.domContentLoadedEventEnd - timing.navigationStart;
            this.vitals.loadTime = timing.loadEventEnd - timing.navigationStart;
          }

          // Performance Paint Timing
          const paintEntries = performance.getEntriesByType('paint');
          paintEntries.forEach(entry => {
            if (entry.name === 'first-contentful-paint') {
              this.vitals.fcp = Math.round(entry.startTime);
            }
          });

          // Memory Usage if available
          if ((performance as any).memory) {
            this.vitals.memoryUsageMb = Math.round((performance as any).memory.usedJSHeapSize / (1024 * 1024));
          }
        } catch (e) {
          console.warn('[PerformanceMonitor] Navigation timing extraction failed:', e);
        }
      }, 0);
    });
  }
}

export const performanceMonitor = new PerformanceMonitorService();
