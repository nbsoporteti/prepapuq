import { QueryClient } from '@tanstack/react-query';

// Defaults conservadores para un LMS:
// - staleTime 30s: la mayoría de datos no cambian segundo a segundo
// - retry 1: si falla un fetch, reintentar una vez; el error real lo expone el toast
// - refetchOnWindowFocus en true solo para queries que pidan datos en vivo
//   (configurable por query)
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      gcTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});
