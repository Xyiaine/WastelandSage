
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AiEventGenerator from '../ai-event-generator';

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('AiEventGenerator', () => {
  test('renders generation controls', () => {
    renderWithProviders(<AiEventGenerator sessionId="test-session" />);
    
    expect(screen.getByText('AI Event Generator')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /generate event/i })).toBeInTheDocument();
  });

  test('shows validation errors for invalid inputs', async () => {
    renderWithProviders(<AiEventGenerator sessionId="" />);
    
    const generateButton = screen.getByRole('button', { name: /generate event/i });
    fireEvent.click(generateButton);
    
    await waitFor(() => {
      expect(screen.getByText(/session id is required/i)).toBeInTheDocument();
    });
  });
});
