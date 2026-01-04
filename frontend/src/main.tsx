import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AppRoutes from './routes/routes.tsx'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import "./i18n";

const queryClient = new QueryClient()
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <div className="font-body">
        <AppRoutes />
      </div>
    </QueryClientProvider>
  </StrictMode>,
)
