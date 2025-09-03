/**
 * Loading States - Comprehensive loading UI components
 * 
 * Provides consistent loading experiences across the application
 * with skeleton states, spinners, and progress indicators
 */

import React from 'react';
import { Card, CardContent } from './ui/card';
import { Skeleton } from './ui/skeleton';
import { Button } from './ui/button';
import { Loader2, RefreshCw } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  testId?: string;
}

export function LoadingSpinner({ size = 'md', text, testId = 'loading-spinner' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6', 
    lg: 'w-8 h-8'
  };

  return (
    <div className="flex items-center justify-center gap-2 p-4" data-testid={testId}>
      <Loader2 className={`${sizeClasses[size]} animate-spin text-primary`} />
      {text && <span className="text-sm text-muted-foreground">{text}</span>}
    </div>
  );
}

interface LoadingButtonProps {
  children: React.ReactNode;
  isLoading?: boolean;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
  testId?: string;
  onClick?: () => void;
  disabled?: boolean;
}

export function LoadingButton({ 
  children, 
  isLoading = false, 
  variant = 'default',
  size = 'default',
  testId,
  onClick,
  disabled
}: LoadingButtonProps) {
  return (
    <Button
      variant={variant}
      size={size}
      onClick={onClick}
      disabled={disabled || isLoading}
      data-testid={testId}
    >
      {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      {children}
    </Button>
  );
}

export function NodeGraphSkeleton() {
  return (
    <div className="w-full h-96 border-2 border-dashed border-muted-foreground/25 rounded-lg bg-muted/10 flex items-center justify-center" data-testid="skeleton-node-graph">
      <div className="text-center space-y-2">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mx-auto" />
        <p className="text-sm text-muted-foreground">Loading scenario graph...</p>
      </div>
    </div>
  );
}

export function TimelineSkeleton() {
  return (
    <div className="space-y-4" data-testid="skeleton-timeline">
      {[...Array(3)].map((_, index) => (
        <Card key={index}>
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <Skeleton className="w-8 h-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-full" />
              </div>
              <Skeleton className="w-16 h-6" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function SessionBuilderSkeleton() {
  return (
    <div className="space-y-6" data-testid="skeleton-session-builder">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-24" />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(4)].map((_, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <Skeleton className="h-4 w-1/4 mb-2" />
              <Skeleton className="h-6 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="flex justify-end">
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  );
}

export function ScenarioListSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="skeleton-scenario-list">
      {[...Array(6)].map((_, index) => (
        <Card key={index}>
          <CardContent className="p-6">
            <Skeleton className="h-6 w-3/4 mb-3" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-2/3 mb-4" />
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-8 w-16" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  testId?: string;
}

export function EmptyState({ icon, title, description, action, testId = 'empty-state' }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center" data-testid={testId}>
      {icon && <div className="mb-4 text-muted-foreground">{icon}</div>}
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      {description && (
        <p className="text-muted-foreground mb-4 max-w-sm">{description}</p>
      )}
      {action && (
        <LoadingButton onClick={action.onClick} testId="button-empty-state-action">
          {action.label}
        </LoadingButton>
      )}
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  testId?: string;
}

export function ErrorState({ 
  title = "Something went wrong",
  description = "We encountered an error. Please try again.",
  onRetry,
  testId = "error-state"
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center" data-testid={testId}>
      <div className="text-destructive mb-4">
        <RefreshCw className="w-12 h-12" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground mb-4 max-w-sm">{description}</p>
      {onRetry && (
        <LoadingButton onClick={onRetry} variant="outline" testId="button-retry">
          Try Again
        </LoadingButton>
      )}
    </div>
  );
}

interface ProgressLoadingProps {
  progress: number; // 0-100
  text?: string;
  testId?: string;
}

export function ProgressLoading({ progress, text, testId = "progress-loading" }: ProgressLoadingProps) {
  return (
    <div className="flex flex-col items-center gap-4 p-8" data-testid={testId}>
      <div className="w-full max-w-sm">
        <div className="bg-muted rounded-full h-2 mb-2">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>0%</span>
          <span>{Math.round(progress)}%</span>
          <span>100%</span>
        </div>
      </div>
      {text && <p className="text-sm text-muted-foreground text-center">{text}</p>}
    </div>
  );
}

interface InfiniteScrollLoaderProps {
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
  testId?: string;
}

export function InfiniteScrollLoader({ hasMore, isLoading, onLoadMore, testId = "infinite-scroll-loader" }: InfiniteScrollLoaderProps) {
  if (!hasMore && !isLoading) return null;

  return (
    <div className="flex justify-center py-8" data-testid={testId}>
      {isLoading ? (
        <LoadingSpinner text="Loading more..." />
      ) : (
        <LoadingButton
          onClick={onLoadMore}
          variant="outline"
          testId="button-load-more"
        >
          Load More
        </LoadingButton>
      )}
    </div>
  );
}

interface ComponentLoadingProps {
  children: React.ReactNode;
  isLoading: boolean;
  skeleton?: React.ReactNode;
  error?: string | null;
  onRetry?: () => void;
}

export function ComponentLoading({ 
  children, 
  isLoading, 
  skeleton,
  error,
  onRetry 
}: ComponentLoadingProps) {
  if (error) {
    return <ErrorState description={error} onRetry={onRetry} />;
  }

  if (isLoading) {
    return skeleton ? <>{skeleton}</> : <LoadingSpinner />;
  }

  return <>{children}</>;
}