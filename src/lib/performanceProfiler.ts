/**
 * Mobile Hardware Performance Profiler & Web Vitals Telemetry
 * Provides lightweight tracking for render durations, Long Tasks (>50ms),
 * and memory metrics on physical mobile devices.
 */

export interface PerformanceMetric {
  name: string;
  durationMs: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface HardwareProfileReport {
  deviceMemoryGb?: number;
  hardwareConcurrency?: number;
  connectionType?: string;
  isLowEndDevice: boolean;
  metrics: PerformanceMetric[];
  longTasksCount: number;
  averageRenderMs: number;
}

class MobilePerformanceProfiler {
  private metrics: PerformanceMetric[] = [];
  private longTasksCount = 0;
  private isObserverSupported = false;

  constructor() {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      this.isObserverSupported = true;
      this.initLongTaskObserver();
    }
  }

  private initLongTaskObserver() {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.longTasksCount++;
          if (entry.duration > 50) {
            this.recordMetric('long-task', entry.duration, {
              startTime: entry.startTime,
              name: entry.name,
            });
          }
        }
      });
      observer.observe({ entryTypes: ['longtask'] });
    } catch {
      // Not supported in all mobile browsers / environments
    }
  }

  public recordMetric(name: string, durationMs: number, metadata?: Record<string, any>) {
    this.metrics.push({
      name,
      durationMs: Math.round(durationMs * 100) / 100,
      timestamp: Date.now(),
      metadata,
    });

    // Keep history capped to avoid memory growth on mobile
    if (this.metrics.length > 200) {
      this.metrics.shift();
    }
  }

  public measureOperation<T>(name: string, operation: () => T, metadata?: Record<string, any>): T {
    const start = performance.now();
    try {
      const result = operation();
      const duration = performance.now() - start;
      this.recordMetric(name, duration, metadata);
      return result;
    } catch (err) {
      const duration = performance.now() - start;
      this.recordMetric(`${name}_error`, duration, { ...metadata, error: String(err) });
      throw err;
    }
  }

  public async measureAsyncOperation<T>(
    name: string,
    operation: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const start = performance.now();
    try {
      const result = await operation();
      const duration = performance.now() - start;
      this.recordMetric(name, duration, metadata);
      return result;
    } catch (err) {
      const duration = performance.now() - start;
      this.recordMetric(`${name}_error`, duration, { ...metadata, error: String(err) });
      throw err;
    }
  }

  public getHardwareProfile(): HardwareProfileReport {
    const nav = typeof navigator !== 'undefined' ? (navigator as any) : {};
    const deviceMemory = nav.deviceMemory as number | undefined;
    const concurrency = nav.hardwareConcurrency as number | undefined;
    const connection = nav.connection || nav.mozConnection || nav.webkitConnection;

    const isLowEndDevice = Boolean(
      (deviceMemory && deviceMemory <= 2) || (concurrency && concurrency <= 4)
    );

    const totalRenderDuration = this.metrics.reduce((acc, m) => acc + m.durationMs, 0);
    const averageRenderMs = this.metrics.length > 0 
      ? Math.round((totalRenderDuration / this.metrics.length) * 100) / 100 
      : 0;

    return {
      deviceMemoryGb: deviceMemory,
      hardwareConcurrency: concurrency,
      connectionType: connection?.effectiveType,
      isLowEndDevice,
      metrics: [...this.metrics],
      longTasksCount: this.longTasksCount,
      averageRenderMs,
    };
  }

  public clear() {
    this.metrics = [];
    this.longTasksCount = 0;
  }
}

export const mobileProfiler = new MobilePerformanceProfiler();
