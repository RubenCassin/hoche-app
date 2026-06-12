import { QueryClient } from '@tanstack/react-query';

// Shared singleton so non-React code (e.g. the scoring screen after a match)
// can invalidate cached queries like stats + history.
export const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});
