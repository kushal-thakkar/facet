import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { AppStateProvider, useAppState } from './AppStateContext';

// Setup proper DOM mocks for tests
beforeAll(() => {
  // Mock getComputedStyle
  Object.defineProperty(window, 'getComputedStyle', {
    value: () => ({
      getPropertyValue: () => '',
    }),
  });

  // Setup DOM element
  document.body.innerHTML = '<div id="root"></div>';
});

// Test component that uses the AppState context
const TestComponent = () => {
  const { state, actions } = useAppState();
  
  const handleAddConnection = () => {
    actions.setConnections([
      ...state.connections, 
      { id: 'test-conn', name: 'Test Connection', type: 'postgres' }
    ]);
  };
  
  const handleChangeCurrentExploration = () => {
    actions.updateCurrentExploration({
      filters: [{ column: 'test', operator: '=', value: 'value' }]
    });
  };
  
  return (
    <div>
      <div data-testid="connections-count">{state.connections.length}</div>
      <div data-testid="current-connection">{state.currentConnection?.name || 'None'}</div>
      <div data-testid="filters-count">{state.currentExploration.filters.length}</div>
      <button data-testid="add-connection" onClick={handleAddConnection}>Add Connection</button>
      <button data-testid="change-exploration" onClick={handleChangeCurrentExploration}>Add Filter</button>
    </div>
  );
};

describe('AppStateContext', () => {
  it('provides initial state', () => {
    render(
      <AppStateProvider>
        <TestComponent />
      </AppStateProvider>
    );
    
    expect(screen.getByTestId('connections-count')).toHaveTextContent('0');
    expect(screen.getByTestId('current-connection')).toHaveTextContent('None');
    expect(screen.getByTestId('filters-count')).toHaveTextContent('0');
  });
  
  it('updates connections when setConnections is called', () => {
    render(
      <AppStateProvider>
        <TestComponent />
      </AppStateProvider>
    );
    
    // Before action
    expect(screen.getByTestId('connections-count')).toHaveTextContent('0');
    
    // Trigger action
    act(() => {
      screen.getByTestId('add-connection').click();
    });
    
    // After action
    expect(screen.getByTestId('connections-count')).toHaveTextContent('1');
  });
  
  it('updates current exploration when updateCurrentExploration is called', () => {
    render(
      <AppStateProvider>
        <TestComponent />
      </AppStateProvider>
    );
    
    // Before action
    expect(screen.getByTestId('filters-count')).toHaveTextContent('0');
    
    // Trigger action
    act(() => {
      screen.getByTestId('change-exploration').click();
    });
    
    // After action
    expect(screen.getByTestId('filters-count')).toHaveTextContent('1');
  });
  
  it('throws an error when useAppState is used outside AppStateProvider', () => {
    // Silence the error logs for this test
    const consoleSpy = jest.spyOn(console, 'error');
    consoleSpy.mockImplementation(() => {});
    
    expect(() => {
      render(<TestComponent />);
    }).toThrow('useAppState must be used within an AppStateProvider');
    
    consoleSpy.mockRestore();
  });
});