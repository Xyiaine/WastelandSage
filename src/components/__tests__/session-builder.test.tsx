
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import SessionBuilder from '../session-builder';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        {component}
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('SessionBuilder Component', () => {
  test('renders session phases correctly', () => {
    renderWithProviders(<SessionBuilder />);
    
    expect(screen.getByText('Session Builder')).toBeInTheDocument();
    expect(screen.getByText('Phase 1/5')).toBeInTheDocument();
  });

  test('allows phase navigation', async () => {
    renderWithProviders(<SessionBuilder />);
    
    const phaseButton = screen.getByTestId('button-phase-world-building');
    fireEvent.click(phaseButton);
    
    await waitFor(() => {
      expect(phaseButton).toHaveClass('bg-rust-500');
    });
  });

  test('validates required fields before phase progression', () => {
    renderWithProviders(<SessionBuilder />);
    
    // Try to advance without filling required fields
    const nextButton = screen.getByRole('button', { name: /next/i });
    fireEvent.click(nextButton);
    
    // Should show validation errors
    expect(screen.getByText(/please fix the following issues/i)).toBeInTheDocument();
  });
});
