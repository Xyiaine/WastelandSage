/**
 * Loading State Components - Consistent loading indicators
 * 
 * Provides various loading states for different UI contexts:
 * - Skeleton loaders for content placeholders
 * - Spinner components for actions
 * - Progressive loading for large datasets
 * - Error states with retry functionality
 */

import React from 'react';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// Basic spinner component
interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Spinner({ size = 'md', className }: SpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <Loader2 
      className={cn('animate-spin', sizeClasses[size], className)}
      data-testid="spinner-loading"
    />
  );
}

// Loading button state
interface LoadingButtonProps {
  loading: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  disabled?: boolean;
  testId?: string;
}

export function LoadingButton({ 
  loading, 
  children, 
  onClick, 
  variant = 'default',
  size = 'default',
  className,
  disabled,
  testId
}: LoadingButtonProps) {
  return (
    <Button
      variant={variant}
      size={size}
      onClick={onClick}
      disabled={loading || disabled}
      className={className}
      data-testid={testId}
    >
      {loading && <Spinner size="sm" className="mr-2" />}
      {children}
    </Button>
  );
}

// Session card skeleton
export function SessionCardSkeleton() {
  return (
    <Card className=\"w-full\" data-testid=\"skeleton-session-card\">
      <CardHeader>
        <Skeleton className=\"h-6 w-3/4\" />
        <Skeleton className=\"h-4 w-1/2\" />
      </CardHeader>
      <CardContent>
        <div className=\"space-y-2\">
          <Skeleton className=\"h-4 w-full\" />
          <Skeleton className=\"h-4 w-2/3\" />
        </div>
        <div className=\"flex justify-between items-center mt-4\">
          <Skeleton className=\"h-6 w-16\" />
          <Skeleton className=\"h-8 w-20\" />
        </div>
      </CardContent>
    </Card>
  );
}

// Node graph skeleton
export function NodeGraphSkeleton() {
  return (
    <div className=\"w-full h-96 bg-muted/30 rounded-lg flex items-center justify-center\" data-testid=\"skeleton-node-graph\">
      <div className=\"text-center space-y-2\">
        <Spinner size=\"lg\" />
        <p className=\"text-sm text-muted-foreground\">Loading scenario graph...</p>
      </div>
    </div>
  );
}

// Timeline skeleton
export function TimelineSkeleton() {
  return (
    <div className=\"space-y-4\" data-testid=\"skeleton-timeline\">
      {Array.from({ length: 3 }).map((_, index) => (
        <Card key={index}>
          <CardContent className=\"p-4\">
            <div className=\"flex items-start space-x-3\">
              <Skeleton className=\"w-8 h-8 rounded-full\" />
              <div className=\"flex-1 space-y-2\">
                <Skeleton className=\"h-4 w-1/3\" />
                <Skeleton className=\"h-4 w-full\" />
                <Skeleton className=\"h-4 w-2/3\" />
              </div>
              <Skeleton className=\"w-16 h-6\" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// AI generation loading
interface AIGenerationLoadingProps {
  type: 'event' | 'npc';
  progress?: number;
}

export function AIGenerationLoading({ type, progress }: AIGenerationLoadingProps) {
  const messages = {
    event: [
      'Analyzing session context...',
      'Generating narrative elements...',
      'Creating story connections...',
      'Finalizing event details...'
    ],
    npc: [
      'Designing character personality...',
      'Determining motivations...',
      'Generating backstory...',
      'Adding finishing touches...'
    ]
  };

  const currentStep = progress ? Math.floor(progress * messages[type].length) : 0;
  const currentMessage = messages[type][Math.min(currentStep, messages[type].length - 1)];

  return (
    <div className=\"text-center space-y-4 p-6\" data-testid={`loading-ai-${type}`}>
      <div className=\"relative\">
        <Spinner size=\"lg\" className=\"mx-auto\" />
        {progress !== undefined && (
          <div className=\"absolute -bottom-2 left-1/2 transform -translate-x-1/2\">
            <div className=\"w-16 h-1 bg-muted rounded-full overflow-hidden\">
              <div 
                className=\"h-full bg-primary transition-all duration-300 ease-out\"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>
      <div className=\"space-y-2\">
        <h3 className=\"font-semibold\">Generating {type === 'event' ? 'Event' : 'NPC'}</h3>
        <p className=\"text-sm text-muted-foreground\">{currentMessage}</p>
      </div>
    </div>
  );
}

// Error state with retry
interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  showRetry?: boolean;
}

export function ErrorState({ 
  title = 'Something went wrong',
  message = 'An error occurred while loading this content.',
  onRetry,
  retryLabel = 'Try Again',
  showRetry = true
}: ErrorStateProps) {
  return (
    <div className=\"text-center space-y-4 p-6\" data-testid=\"error-state\">
      <div className=\"mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center\">
        <AlertCircle className=\"w-6 h-6 text-destructive\" />
      </div>
      <div className=\"space-y-2\">
        <h3 className=\"font-semibold text-destructive\">{title}</h3>
        <p className=\"text-sm text-muted-foreground\">{message}</p>
      </div>
      {showRetry && onRetry && (
        <Button 
          variant=\"outline\" 
          onClick={onRetry}
          data-testid=\"button-retry\"
        >
          <RefreshCw className=\"w-4 h-4 mr-2\" />
          {retryLabel}
        </Button>
      )}
    </div>
  );
}

// Empty state
interface EmptyStateProps {
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  icon?: React.ReactNode;
}

export function EmptyState({ title, description, action, icon }: EmptyStateProps) {
  return (
    <div className=\"text-center space-y-4 p-6\" data-testid=\"empty-state\">
      {icon && (
        <div className=\"mx-auto w-12 h-12 bg-muted/50 rounded-full flex items-center justify-center\">
          {icon}
        </div>
      )}
      <div className=\"space-y-2\">
        <h3 className=\"font-semibold\">{title}</h3>
        {description && (
          <p className=\"text-sm text-muted-foreground\">{description}</p>
        )}
      </div>
      {action && (
        <Button onClick={action.onClick} data-testid=\"button-action\">
          {action.label}
        </Button>
      )}
    </div>
  );
}

// Progressive loading for large lists
interface ProgressiveListProps {
  items: any[];
  renderItem: (item: any, index: number) => React.ReactNode;
  loading: boolean;
  loadMore?: () => void;
  hasMore?: boolean;
  loadingMore?: boolean;
  batchSize?: number;
}

export function ProgressiveList({
  items,
  renderItem,
  loading,
  loadMore,
  hasMore = false,
  loadingMore = false,
  batchSize = 10
}: ProgressiveListProps) {
  const [visibleCount, setVisibleCount] = React.useState(batchSize);

  React.useEffect(() => {
    if (items.length > 0 && visibleCount < items.length) {
      const timer = setTimeout(() => {
        setVisibleCount(prev => Math.min(prev + batchSize, items.length));
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [items.length, visibleCount, batchSize]);

  if (loading && items.length === 0) {
    return (
      <div className=\"space-y-4\">
        {Array.from({ length: batchSize }).map((_, index) => (
          <SessionCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  return (
    <div className=\"space-y-4\" data-testid=\"progressive-list\">
      {items.slice(0, visibleCount).map(renderItem)}
      
      {visibleCount < items.length && (
        <div className=\"text-center py-4\">
          <Spinner size=\"sm\" />
        </div>
      )}
      
      {hasMore && loadMore && (
        <div className=\"text-center py-4\">
          <LoadingButton
            loading={loadingMore}
            onClick={loadMore}
            variant=\"outline\"
            testId=\"button-load-more\"
          >
            Load More
          </LoadingButton>
        </div>
      )}
    </div>
  );
}