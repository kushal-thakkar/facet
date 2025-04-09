import React, { createContext, useContext, useReducer, useEffect } from 'react';

// Initial state definition
const initialState = {
  connections: [],
  currentConnection: null,
  explorations: [],
  currentExploration: {
    filters: [],
    groupBy: [],
    agg: [],
    timeRange: {
      column: 'timestamp',
      range: 'last_7_days',
    },
    comparison: {
      enabled: false,
      range: 'none',
    },
    visualization: {
      type: 'preview',
      config: {},
    },
    limit: '100', // Default limit
    selectedFields: [], // Default selected fields
    sort: [], // Initialize sort as empty array
    granularity: 'auto', // Default granularity to auto
  },
  queryResults: null,
  metadata: {
    tables: {},
    columns: {},
    relationships: {},
  },
  preferences: {
    theme: 'light',
    defaultTimeRange: 'last_7_days',
    tablePageSize: 50,
  },
};

// Action types
const actionTypes = {
  SET_CONNECTIONS: 'SET_CONNECTIONS',
  SET_CURRENT_CONNECTION: 'SET_CURRENT_CONNECTION',
  SET_EXPLORATIONS: 'SET_EXPLORATIONS',
  SET_CURRENT_EXPLORATION: 'SET_CURRENT_EXPLORATION',
  UPDATE_CURRENT_EXPLORATION: 'UPDATE_CURRENT_EXPLORATION',
  SET_METADATA: 'SET_METADATA',
  UPDATE_METADATA: 'UPDATE_METADATA',
  SET_PREFERENCES: 'SET_PREFERENCES',
  UPDATE_PREFERENCES: 'UPDATE_PREFERENCES',
  UPDATE_QUERY_RESULTS: 'UPDATE_QUERY_RESULTS',
};

// Reducer function
function appStateReducer(state, action) {
  switch (action.type) {
    case actionTypes.SET_CONNECTIONS:
      return { ...state, connections: action.payload };
    case actionTypes.SET_CURRENT_CONNECTION:
      return { ...state, currentConnection: action.payload };
    case actionTypes.SET_EXPLORATIONS:
      return { ...state, explorations: action.payload };
    case actionTypes.SET_CURRENT_EXPLORATION:
      return { ...state, currentExploration: action.payload };
    case actionTypes.UPDATE_CURRENT_EXPLORATION:
      return {
        ...state,
        currentExploration: {
          ...state.currentExploration,
          ...action.payload,
        },
      };
    case actionTypes.SET_METADATA:
      return { ...state, metadata: action.payload };
    case actionTypes.UPDATE_METADATA:
      return {
        ...state,
        metadata: {
          ...state.metadata,
          ...action.payload,
        },
      };
    case actionTypes.SET_PREFERENCES:
      return { ...state, preferences: action.payload };
    case actionTypes.UPDATE_PREFERENCES:
      return {
        ...state,
        preferences: {
          ...state.preferences,
          ...action.payload,
        },
      };
    case actionTypes.UPDATE_QUERY_RESULTS:
      return { ...state, queryResults: action.payload };
    default:
      return state;
  }
}

// Create context
const AppStateContext = createContext();

// Provider component
export function AppStateProvider({ children }) {
  const [state, dispatch] = useReducer(appStateReducer, initialState);

  // Load saved state from localStorage on initial render
  useEffect(() => {
    try {
      const savedPreferences = localStorage.getItem('facet_preferences');
      if (savedPreferences) {
        dispatch({
          type: actionTypes.SET_PREFERENCES,
          payload: JSON.parse(savedPreferences),
        });
      }
    } catch (error) {
      console.error('Error loading saved preferences:', error);
    }
  }, []);

  // Save preferences to localStorage when they change
  useEffect(() => {
    try {
      localStorage.setItem('facet_preferences', JSON.stringify(state.preferences));
    } catch (error) {
      console.error('Error saving preferences:', error);
    }
  }, [state.preferences]);

  // Context value
  const value = {
    state,
    dispatch,
    actions: {
      setConnections: (connections) =>
        dispatch({
          type: actionTypes.SET_CONNECTIONS,
          payload: connections,
        }),
      setCurrentConnection: (connection) =>
        dispatch({
          type: actionTypes.SET_CURRENT_CONNECTION,
          payload: connection,
        }),
      setExplorations: (explorations) =>
        dispatch({
          type: actionTypes.SET_EXPLORATIONS,
          payload: explorations,
        }),
      setCurrentExploration: (exploration) =>
        dispatch({
          type: actionTypes.SET_CURRENT_EXPLORATION,
          payload: exploration,
        }),
      updateCurrentExploration: (updates) =>
        dispatch({
          type: actionTypes.UPDATE_CURRENT_EXPLORATION,
          payload: updates,
        }),
      setMetadata: (metadata) =>
        dispatch({
          type: actionTypes.SET_METADATA,
          payload: metadata,
        }),
      updateMetadata: (updates) =>
        dispatch({
          type: actionTypes.UPDATE_METADATA,
          payload: updates,
        }),
      setPreferences: (preferences) =>
        dispatch({
          type: actionTypes.SET_PREFERENCES,
          payload: preferences,
        }),
      updatePreferences: (updates) =>
        dispatch({
          type: actionTypes.UPDATE_PREFERENCES,
          payload: updates,
        }),
      updateQueryResults: (results) =>
        dispatch({
          type: actionTypes.UPDATE_QUERY_RESULTS,
          payload: results,
        }),
    },
  };

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

// Custom hook for using the context
export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
}
