// pages/_app.js
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '../styles/globals.css';
import { AppStateProvider } from '../context/AppStateContext';

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30000,
    },
  },
});

function FacetApp({ Component, pageProps }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AppStateProvider>
        <Component {...pageProps} />
      </AppStateProvider>
    </QueryClientProvider>
  );
}

export default FacetApp;