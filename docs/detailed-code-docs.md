# Facet Code Documentation

This document provides detailed documentation for the codebase, including architecture, key components, and code organization.

## Architecture Overview

Facet follows a typical client-server architecture with a React.js frontend and a FastAPI backend.

### High-Level Architecture

```
+----------------+         +----------------+         +-------------------+
|                |         |                |         |                   |
|   Frontend     | <-----> |   Backend API  | <-----> |   Databases       |
|   (Next.js)    |         |   (FastAPI)    |         |   (PG/ClickHouse) |
|                |         |                |         |                   |
+----------------+         +----------------+         +-------------------+
```

## Backend Architecture

The backend follows a layered architecture:

1. **Routes Layer** (`/routers`): Defines API endpoints and handles HTTP requests/responses
2. **Service Layer** (`/services`): Contains business logic
3. **Database Layer** (`/database`): Manages database connections and queries
4. **Models Layer** (`/models`): Defines data structures using Pydantic

### Key Components

#### Routers

API routes are organized by functionality:

- `connections.py`: Manage database connections
- `metadata.py`: Retrieve database schema information
- `query.py`: Execute and manage queries
- `explorations.py`: Save and retrieve exploration configurations

#### Services

Services implement the business logic:

- `connection_service.py`: Handle database connection management
- `metadata_service.py`: Retrieve and format schema information
- `query_service.py`: Execute queries and process results
- `query_translator.py`: Translate UI query definitions to SQL
- `exploration_service.py`: Manage saved explorations

#### Database Connectors

Database connectors provide a unified interface for different database types:

- `base_connector.py`: Abstract base class defining the connector interface
- `postgres_connector.py`: PostgreSQL implementation
- `clickhouse_connector.py`: ClickHouse implementation
- `connector_factory.py`: Factory to create appropriate connectors

#### Models

Pydantic models define the data structures:

- `connection.py`: Database connection configuration
- `metadata.py`: Table and column metadata
- `query.py`: Query structure and parameters
- `explorations.py`: Saved exploration configuration

## Frontend Architecture

The frontend is built with Next.js and follows a component-based architecture.

### Key Components

#### Pages

- `index.js`: Main application page
- `_app.js`: Next.js application wrapper

#### Components

Components are organized by functionality:

**Layout:**
- `MainLayout.js`: Main application layout
- `Header.js`: Application header
- `Footer.js`: Application footer
- `SidePanel.js`: Sidebar navigation
- `InfoPanel.js`: Information display panel

**Connection:**
- `ConnectionForm.js`: Database connection form

**Exploration:**
- `ExplorationControls.js`: Query building controls
- `FilterBar.js`: Query filtering controls
- `GroupBySelector.js`: Dimension selection
- `MetricSelector.js`: Metric selection
- `ResultsArea.js`: Query results container
- `ResultsTable.js`: Tabular results display
- `ResultsChart.js`: Chart visualization
- `TimeRangeSelector.js`: Time range selection

#### Context

- `AppStateContext.js`: Global state management using React Context

## Code Style and Standards

### Python Code Style

The backend code follows these conventions:

- **Formatting**: [Black](https://black.readthedocs.io/) with a line length of 100 characters
- **Imports**: Sorted with [isort](https://pycqa.github.io/isort/) using Black-compatible settings
- **Linting**: [Flake8](https://flake8.pycqa.org/) for code quality checks
- **Type Checking**: [mypy](https://mypy.readthedocs.io/) for static type checking

Use the following commands to format and lint the code:

```bash
# From the backend directory:

# Format code
make format  # Runs black and isort

# Lint code
make lint  # Runs flake8

# Type checking
make typecheck  # Runs mypy

# Run all checks
make ci-check

# Install development tools
make install-dev
```

### JavaScript Code Style

The frontend code follows these conventions:

- **Formatting**: Prettier with default settings
- **Linting**: ESLint with the Next.js configuration

## Testing Strategy

### Backend Testing

Backend tests use pytest and are organized to mirror the application structure:

- Unit tests for services and utilities
- Integration tests for API endpoints
- Database connector tests with mock responses

### Frontend Testing

Frontend tests use Jest and React Testing Library:

- Component tests for UI components
- Context tests for state management

See the [Testing Guide](./testing-guide.md) for more details on testing.

## Database Schema

### PostgreSQL Schema

The PostgreSQL schema is designed to store connection information and saved explorations:

```sql
CREATE TABLE connections (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    host VARCHAR(255) NOT NULL,
    port INTEGER NOT NULL,
    database VARCHAR(255) NOT NULL,
    username VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE explorations (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    connection_id UUID REFERENCES connections(id),
    query JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## API Documentation

### Connections API

- `GET /api/connections`: List all saved connections
- `POST /api/connections`: Create a new connection
- `GET /api/connections/{connection_id}`: Get connection details
- `PUT /api/connections/{connection_id}`: Update a connection
- `DELETE /api/connections/{connection_id}`: Delete a connection
- `POST /api/connections/{connection_id}/test`: Test a connection

### Metadata API

- `GET /api/metadata/connections/{connection_id}/tables`: List tables for a connection
- `GET /api/metadata/connections/{connection_id}/tables/{table_name}`: Get table details

### Query API

- `POST /api/query/execute`: Execute a query
- `GET /api/query/{query_id}/status`: Check query status
- `GET /api/query/{query_id}/results`: Get query results

### Explorations API

- `GET /api/explorations`: List saved explorations
- `POST /api/explorations`: Save a new exploration
- `GET /api/explorations/{exploration_id}`: Get exploration details
- `PUT /api/explorations/{exploration_id}`: Update an exploration
- `DELETE /api/explorations/{exploration_id}`: Delete an exploration
