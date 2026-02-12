import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AppRoutes from './routes/routes.tsx'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import "./i18n";
import ErrorBoundary from './components/ErrorBoundary';

// Global error handlers to catch unhandled promise rejections and errors
window.addEventListener('error', (event) => {
  console.error('Global error caught:', event.error);
  // Prevent default browser error handling
  event.preventDefault();
  // Log to console for debugging
  if (import.meta.env.DEV) {
    console.error('Error details:', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error
    });
  }
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  // Prevent default browser error handling
  event.preventDefault();
  // Log to console for debugging
  if (import.meta.env.DEV) {
    console.error('Promise rejection details:', {
      reason: event.reason,
      promise: event.promise
    });
  }
  // Don't crash the app - let React Query handle it
});

// Configure QueryClient with cache management and retry logic
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Refetch on mount and window focus for production
      refetchOnMount: true,
      refetchOnWindowFocus: false, // Disable to reduce unnecessary requests
      // Longer stale time to reduce API calls (2 minutes)
      staleTime: 2 * 60 * 1000,
      // Longer garbage collection time (5 minutes)
      gcTime: 5 * 60 * 1000,
      // Retry failed requests
      retry: 3, // Retry up to 3 times (increased from 2)
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
      // Don't throw errors, return them instead
      throwOnError: false,
      // Add network error handling
      networkMode: 'online',
    },
    mutations: {
      // Retry mutations on failure
      retry: 1,
      throwOnError: false,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <div className="font-body">
          <AppRoutes />
        </div>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
)
