import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AppRoutes from './routes/routes.tsx'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import "./i18n";

// Configure QueryClient with cache management
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Refetch on mount and window focus for production
      refetchOnMount: true,
      refetchOnWindowFocus: true,
      // Shorter stale time for production (30 seconds)
      staleTime: 30 * 1000,
      // Shorter garbage collection time (1 minute)
      gcTime: 60 * 1000,
    },
  },
})
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <div className="font-body">
        <AppRoutes />
      </div>
    </QueryClientProvider>
  </StrictMode>,
)
