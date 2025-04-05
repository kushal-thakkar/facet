# Facet Testing Guide

This document provides guidelines for testing the Facet application, including unit tests, integration tests, and end-to-end tests.

## Unit Testing

### Frontend Unit Tests

Frontend unit tests are implemented using Jest and React Testing Library. These tests focus on testing individual React components in isolation.

#### Running Frontend Tests

From the `frontend` directory:

```bash
# Run all tests
bun test

# Run tests in watch mode
bun test --watch

# Run tests with coverage report
bun test --coverage

# Run a specific test file
bun test -t "FilterBar"
```

#### Writing Frontend Tests

When writing frontend tests, follow these guidelines:

1. Place test files next to the component files with a `.test.js` suffix
2. Use React Testing Library's user-centered testing approach
3. Mock external dependencies using Jest's mocking capabilities
4. Test component behavior, not implementation details

Example test for a component:

```jsx
import { render, screen, fireEvent } from '@testing-library/react';
import MyComponent from './MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  it('handles button click', () => {
    const handleClick = jest.fn();
    render(<MyComponent onClick={handleClick} />);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### Backend Unit Tests

Backend unit tests are implemented using pytest. These tests focus on testing individual Python functions and classes in isolation.

#### Running Backend Tests

From the `backend` directory:

```bash
# Run all tests
pytest

# Run tests with coverage report
pytest --cov=app

# Run a specific test file
pytest tests/services/test_query_translator.py

# Run a specific test
pytest tests/services/test_query_translator.py::TestSQLTranslator::test_simple_query_postgresql

# Run tests with verbose output
pytest -v
```

#### Writing Backend Tests

When writing backend tests, follow these guidelines:

1. Organize tests in the `tests` directory, mirroring the `app` directory structure
2. Use fixtures for test setup and teardown
3. Mock external dependencies using pytest-mock or unittest.mock
4. Use pytest.mark to categorize tests (unit, integration, slow)

Example test for a service:

```python
import pytest
from app.services.my_service import MyService

@pytest.fixture
def my_service():
    return MyService()

def test_my_service_method(my_service):
    result = my_service.some_method('test')
    assert result == 'expected'
```

## Integration Testing

Integration tests verify that different parts of the application work together correctly.

### Backend Integration Tests

Backend integration tests focus on testing API endpoints and database interactions.

#### Running Integration Tests

```bash
# Run all integration tests
pytest -m integration

# Run integration tests for a specific module
pytest -m integration tests/routers/
```

#### Setting Up Integration Tests

For integration tests that require a database:

1. Use the `mockdb` service for simulated database responses
2. Use `pytest-asyncio` for testing async functions

Example integration test:

```python
import pytest
from httpx import AsyncClient
from app.main import app

@pytest.mark.integration
@pytest.mark.asyncio
async def test_get_tables_endpoint():
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/api/v1/metadata/connections/test-conn/tables")
        assert response.status_code == 200
        assert "tables" in response.json()
```

## End-to-End Testing

End-to-end tests verify the entire application workflow from the user's perspective.

### Cypress Tests

Cypress is used for end-to-end testing of the Facet application. Note: Cypress setup is not included in the default installation. To use Cypress, you'll need to:

1. Install Cypress:
```bash
cd frontend
bun add -d cypress
```

2. Add Cypress scripts to package.json:
```json
{
  "scripts": {
    "cypress:open": "bun cypress open",
    "cypress:run": "bun cypress run"
  }
}
```

#### Running Cypress Tests

From the `frontend` directory:

```bash
# Open Cypress test runner
bun run cypress:open

# Run Cypress tests headlessly
bun run cypress:run
```

#### Writing Cypress Tests

When writing Cypress tests, focus on user workflows:

1. Connect to a database
2. Select a table
3. Add filters and metrics
4. Run a query
5. Verify results
6. Save an exploration

Example Cypress test:

```javascript
describe('Query Workflow', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.get('[data-testid=connection-selector]').select('Test Connection');
  });

  it('should execute a simple query', () => {
    cy.get('[data-testid=table-list]').contains('events').click();
    cy.get('[data-testid=add-filter]').click();
    cy.get('[data-testid=field-selector]').select('status');
    cy.get('[data-testid=operator-selector]').select('equals');
    cy.get('[data-testid=value-input]').type('active');
    cy.get('[data-testid=apply-filter]').click();
    cy.get('[data-testid=run-query]').click();
    
    // Verify results
    cy.get('[data-testid=results-table]').should('be.visible');
    cy.get('[data-testid=results-table]').contains('active');
  });
});
```

## Performance Testing

Performance tests verify that the application meets performance requirements.

### Backend Performance Testing

Use `pytest-benchmark` for measuring the performance of backend components:

```bash
# Run benchmark tests
pytest --benchmark-only

# Compare with previous benchmark results
pytest --benchmark-compare=0001
```

Example benchmark test:

```python
def test_query_translator_performance(benchmark):
    # Setup
    translator = SQLTranslator('postgresql')
    query_model = complex_query_fixture()
    
    # Run benchmark
    result = benchmark(translator.translate, query_model)
    
    # Verify result
    assert "SELECT" in result
```

## Mock Database

The mock database server provides a simulated database environment for testing without requiring actual database connections.

### Starting the Mock Database

The mock database starts automatically with Docker Compose, but you can also run it separately:

```bash
cd backend/mockdb
python server.py
```

### Mock Database API

The mock database exposes these endpoints:

- `POST /api/query/execute` - Execute a simulated SQL query
- `POST /api/metadata/tables` - Get table metadata

### Mock Data Files

The mock database uses JSON files in the `data` directory:

- `metadata.json` - Table and column metadata
- `events_data.json` - Sample event data
- `users_data.json` - Sample user data

You can customize these files to test different scenarios.

## Continuous Integration

GitHub Actions workflows are set up to run tests on every pull request and push to the main branch.

### CI Workflow

The CI workflow includes:

1. Linting frontend and backend code
2. Running frontend unit tests
3. Running backend unit tests
4. Building Docker images
5. Running integration tests in a Docker environment

### Running CI Locally

You can run the same CI checks locally:

```bash
# Frontend checks
cd frontend
bun run lint
bun test

# Backend checks
cd backend
# Install development dependencies
pip install -r requirements-dev.txt

# Run code formatting
python -m black .
python -m isort .

# Run linting
python -m flake8

# Run type checking
python -m mypy .

# Run tests
pytest

# Or use the Makefile to run all checks
make ci-check
```

## Troubleshooting Tests

### Common Frontend Test Issues

- **Test fails with "Unable to find element"**: Check that you're using the correct query method (getByText, getByRole, etc.)
- **Mock function not called**: Verify that the component is correctly passing props to child components

### Common Backend Test Issues

- **Event loop issues**: Use `pytest.mark.asyncio` for async tests
- **Database connection errors**: Use mocks or the mock database for tests that require database access