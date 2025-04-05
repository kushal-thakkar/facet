import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FilterBar from './FilterBar';
import { AppStateProvider, useAppState } from '../../context/AppStateContext';

// Mock the AppStateContext
jest.mock('../../context/AppStateContext', () => {
  const originalModule = jest.requireActual('../../context/AppStateContext');
  return {
    ...originalModule,
    useAppState: jest.fn(),
  };
});

describe('FilterBar Component', () => {
  const mockActions = {
    updateCurrentExploration: jest.fn(),
  };
  
  const mockState = {
    currentExploration: {
      source: {
        table: 'events',
      },
      filters: [
        { column: 'status', operator: '=', value: 'active' },
      ],
    },
    metadata: {
      columns: {
        'events.status': {
          displayName: 'Status',
          dataType: 'string',
        },
        'events.timestamp': {
          displayName: 'Timestamp',
          dataType: 'timestamp',
        },
        'events.country': {
          displayName: 'Country',
          dataType: 'string',
        },
      },
    },
  };
  
  beforeEach(() => {
    useAppState.mockReturnValue({
      state: mockState,
      actions: mockActions,
    });
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  it('renders existing filters', () => {
    render(<FilterBar />);
    
    expect(screen.getByText(/status equals active/i)).toBeInTheDocument();
  });
  
  it('opens filter dialog when add filter button is clicked', () => {
    render(<FilterBar />);
    
    // Open dialog
    fireEvent.click(screen.getByText('+ Add Filter'));
    
    // Dialog should be open
    expect(screen.getByText('Add Filter')).toBeInTheDocument();
    expect(screen.getByText('Field')).toBeInTheDocument();
    expect(screen.getByText('Operator')).toBeInTheDocument();
  });
  
  it('adds a new filter when form is submitted', async () => {
    render(<FilterBar />);
    
    // Open dialog
    fireEvent.click(screen.getByText('+ Add Filter'));
    
    // Fill out form
    fireEvent.change(screen.getByLabelText('Field'), { target: { value: 'country' } });
    fireEvent.change(screen.getByLabelText('Operator'), { target: { value: '=' } });
    fireEvent.change(screen.getByLabelText('Value'), { target: { value: 'US' } });
    
    // Submit form
    fireEvent.click(screen.getByText('Add'));
    
    // Verify updateCurrentExploration was called with new filter
    expect(mockActions.updateCurrentExploration).toHaveBeenCalledWith({
      filters: [
        { column: 'status', operator: '=', value: 'active' },
        { column: 'country', operator: '=', value: 'US' },
      ],
    });
  });
  
  it('removes a filter when remove button is clicked', () => {
    render(<FilterBar />);
    
    // Find and click remove button
    const removeButton = screen.getByText('×');
    fireEvent.click(removeButton);
    
    // Verify updateCurrentExploration was called with empty filters
    expect(mockActions.updateCurrentExploration).toHaveBeenCalledWith({
      filters: [],
    });
  });
  
  it('shows appropriate input based on column type', async () => {
    render(<FilterBar />);
    
    // Open dialog
    fireEvent.click(screen.getByText('+ Add Filter'));
    
    // Select timestamp field
    fireEvent.change(screen.getByLabelText('Field'), { target: { value: 'timestamp' } });
    
    // Should show date input
    expect(screen.getByLabelText('Value')).toHaveAttribute('type', 'date');
    
    // Change to string field
    fireEvent.change(screen.getByLabelText('Field'), { target: { value: 'country' } });
    
    // Should show text input
    expect(screen.getByLabelText('Value')).toHaveAttribute('type', 'text');
  });
});