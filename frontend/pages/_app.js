import React, { useState, useEffect } from 'react';
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
  const [darkMode, setDarkMode] = useState(false);

  // Check for system preference on first load
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isDarkPreferred = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setDarkMode(isDarkPreferred);
    }
  }, []);

  // Apply dark mode class to html element
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Toggle dark mode function for theme switch
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <AppStateProvider>
        <Component {...pageProps} toggleDarkMode={toggleDarkMode} darkMode={darkMode} />
      </AppStateProvider>
    </QueryClientProvider>
  );
}

export default FacetApp;
