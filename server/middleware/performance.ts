
import { Request, Response, NextFunction } from 'express';

interface PerformanceMetrics {
  endpoint: string;
  method: string;
  responseTime: number;
  timestamp: Date;
  statusCode: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private readonly MAX_METRICS = 1000;

  addMetric(metric: PerformanceMetrics): void {
    this.metrics.push(metric);
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics.shift();
    }
  }

  getSlowRequests(threshold: number = 1000): PerformanceMetrics[] {
    return this.metrics.filter(m => m.responseTime > threshold);
  }

  getAverageResponseTime(): number {
    if (this.metrics.length === 0) return 0;
    return this.metrics.reduce((sum, m) => sum + m.responseTime, 0) / this.metrics.length;
  }
}

export const performanceMonitor = new PerformanceMonitor();

export const trackPerformance = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    
    performanceMonitor.addMetric({
      endpoint: req.path,
      method: req.method,
      responseTime,
      timestamp: new Date(),
      statusCode: res.statusCode
    });

    // Log slow requests
    if (responseTime > 500) {
      console.warn(`[Performance] Slow request: ${req.method} ${req.path} took ${responseTime}ms`);
    }
  });
  
  next();
};
