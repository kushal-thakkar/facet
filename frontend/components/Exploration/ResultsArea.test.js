import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ResultsArea from './ResultsArea';
import { AppStateProvider, useAppState } from '../../context/AppStateContext';

// Mock the ResultsTable and ResultsChart components
jest.mock('./ResultsTable', () => {
  return function MockResultsTable({ results }) {
    return <div data-testid="results-table">Table View: {results.data.length} rows</div>;
  };
});

jest.mock('./ResultsChart', () => {
  return function MockResultsChart({ results, type }) {
    return <div data-testid="results-chart">Chart View ({type}): {results.data.length} rows</div>;
  };
});

// Mock the AppStateContext
jest.mock('../../context/AppStateContext', () => {
  const originalModule = jest.requireActual('../../context/AppStateContext');
  return {
    ...originalModule,
    useAppState: jest.fn(),
  };
});

describe('ResultsArea Component', () => {
  const mockActions = {
    updateCurrentExploration: jest.fn(),
  };
  
  const mockState = {
    currentExploration: {
      visualization: {
        type: 'table',
      },
    },
  };
  
  const mockResults = {
    columns: [
      { name: 'id', displayName: 'ID', type: 'integer' },
      { name: 'name', displayName: 'Name', type: 'string' },
    ],
    data: [
      { id: 1, name: 'Test 1' },
      { id: 2, name: 'Test 2' },
    ],
    sql: 'SELECT * FROM test',
  };
  
  beforeEach(() => {
    useAppState.mockReturnValue({
      state: mockState,
      actions: mockActions,
    });
    
    // Mock document.getElementById to handle export menu toggle
    document.getElementById = jest.fn().mockImplementation(() => {
      return {
        classList: {
          toggle: jest.fn(),
        },
      };
    });
    
    // Mock URL.createObjectURL
    global.URL.createObjectURL = jest.fn();
    
    // Mock document.createElement for download links
    const mockLink = {
      href: '',
      setAttribute: jest.fn(),
      click: jest.fn(),
    };
    document.createElement = jest.fn().mockReturnValue(mockLink);
    document.body.appendChild = jest.fn();
    document.body.removeChild = jest.fn();
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  it('renders loading state correctly', () => {
    render(<ResultsArea isLoading={true} results={null} />);
    
    expect(screen.getByText('Loading results...')).toBeInTheDocument();
  });
  
  it('renders empty state when no results', () => {
    render(<ResultsArea isLoading={false} results={null} />);
    
    expect(screen.getByText(/Configure your exploration/i)).toBeInTheDocument();
  });
  
  it('renders error state when results contain error', () => {
    const errorResults = {
      error: 'Query failed',
      suggestions: ['Check your syntax', 'Verify your connection'],
    };
    
    render(<ResultsArea isLoading={false} results={errorResults} />);
    
    expect(screen.getByText('Query Error')).toBeInTheDocument();
    expect(screen.getByText('Query failed')).toBeInTheDocument();
    expect(screen.getByText('Check your syntax')).toBeInTheDocument();
    expect(screen.getByText('Verify your connection')).toBeInTheDocument();
  });
  
  it('renders table view by default', () => {
    render(<ResultsArea isLoading={false} results={mockResults} />);
    
    expect(screen.getByTestId('results-table')).toBeInTheDocument();
    expect(screen.getByText('Table View: 2 rows')).toBeInTheDocument();
  });
  
  it('switches to chart view when chart button is clicked', () => {
    render(<ResultsArea isLoading={false} results={mockResults} />);
    
    // Click line chart button
    fireEvent.click(screen.getByText('Line Chart'));
    
    // Check that updateCurrentExploration was called
    expect(mockActions.updateCurrentExploration).toHaveBeenCalledWith({
      visualization: {
        type: 'line',
      },
    });
  });
  
  it('shows export options when Export button is clicked', () => {
    render(<ResultsArea isLoading={false} results={mockResults} />);
    
    // Click export button
    fireEvent.click(screen.getByText('Export ▾'));
    
    // Check that menu toggle was called
    expect(document.getElementById).toHaveBeenCalledWith('export-menu');
  });
});