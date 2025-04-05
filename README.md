# Facet - SQL Data Exploration Tool

Facet is a GUI-first SQL data exploration tool designed to enable engineers, product managers, and business users to quickly explore and visualize data without writing SQL queries. Inspired by Facebook's Scuba, Facet provides an intuitive interface for filtering, grouping, and visualizing data across various SQL databases.

## Features

- **Visual Query Building**: Create complex SQL queries using an intuitive interface
- **Multiple Database Support**: Connect to PostgreSQL and ClickHouse databases
- **Interactive Visualizations**: View your data as tables, line charts, bar charts, and pie charts
- **Metadata Browser**: Explore database tables, columns, and relationships
- **Saved Explorations**: Save and share your queries for future use
- **Export Options**: Export results as CSV, JSON, or the generated SQL

## Project Structure

```
facet/
├── frontend/              # Next.js frontend application
│   ├── components/        # React components
│   │   ├── Connection/    # Connection management components
│   │   ├── Exploration/   # Query building components
│   │   └── Layout/        # Layout components
│   ├── context/           # React context for state management
│   ├── pages/             # Next.js pages
│   └── styles/            # CSS and styling
├── backend/               # FastAPI backend application
│   ├── database/          # Database connectors
│   ├── models/            # Pydantic models
│   ├── routers/           # API routes
│   ├── services/          # Business logic
│   ├── mockdb/            # Mock database for testing
│   │   └── data/          # Sample data files
│   ├── scripts/           # Database initialization scripts
│   └── tests/             # Unit tests
└── docs/                  # Documentation
```

## Development Setup

### Prerequisites

- Docker and Docker Compose
- Bun (for local development outside Docker)
- Python 3.13+ (for local development outside Docker)

### Quick Start with Docker

1. Clone the repository:
```bash
git clone https://github.com/yourusername/facet.git
cd facet
```

2. Install docker and docker-compose

3. Start the development environment:
```bash
docker-compose -f docker-compose.dev.yml up
```

   If you need to reset the database (for example, if you don't see data in Postgres):
   ```bash
   docker-compose -f docker-compose.dev.yml down -v
   docker-compose -f docker-compose.dev.yml up
   ```

4. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

### Local Development

#### Frontend

1. Install dependencies:
```bash
cd frontend
bun install
```

2. Start the development server:
```bash
bun dev
```

3. Access the frontend at http://localhost:3000

#### Backend

1. Create a virtual environment:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt  # For production dependencies only
pip install -r requirements-dev.txt  # For development and testing
```

3. Start the development server:
```bash
uvicorn main:app --reload
```

4. Access the API at http://localhost:8000

## Development Tools

### Code Formatting and Linting

The project uses standardized formatting and linting tools:

#### Backend

```bash
# Format code
cd backend && make format  # Runs black and isort on Python code

# Lint code
cd backend && make lint  # Runs flake8 on Python code

# Type checking
cd backend && make typecheck  # Runs mypy on Python code

# Run all checks
cd backend && make ci-check  # Runs format, lint, typecheck, and tests

# Install development tools
cd backend && make install-dev  # Installs development dependencies
```

#### Frontend

```bash
# Format code
cd frontend && bun run format  # Runs prettier on JS, JSX, TS, TSX, JSON, and CSS files

# Check formatting without changing files
cd frontend && bun run format:check

# Lint code
cd frontend && bun run lint  # Runs ESLint on JS/TS files
```

## Testing

### Frontend Tests

Run the frontend tests:
```bash
cd frontend
bun test
```

Run tests with coverage:
```bash
bun test --coverage
```

### Backend Tests

Run the backend tests:
```bash
cd backend
pytest
```

Run tests with coverage:
```bash
pip install pytest-cov  # Install pytest-cov if not installed
pytest --cov=.
```

Note: Currently, there are some failing tests in the project that need to be fixed.

## Troubleshooting

### Database Initialization Issues

If you don't see any data in the PostgreSQL database after starting the containers, the initialization script might not have been executed. This can happen if the volume already exists but doesn't contain the required tables and data.

To resolve this issue:

```bash
# Remove containers and volumes, then restart
docker-compose -f docker-compose.dev.yml down -v
docker-compose -f docker-compose.dev.yml up
```

The `-v` flag ensures that volumes are removed, allowing the initialization scripts to run when the containers are recreated.

## Database Connection

Facet supports connecting to PostgreSQL and ClickHouse databases. To connect to a database:

1. Go to the application and click "Add Connection"
2. Select the database type
3. Enter the connection details (host, port, database name, username, password)
4. Test the connection
5. Save the connection

## Usage Guide

### Creating an Exploration

1. Select a connection from the dropdown in the header
2. Choose a table from the sidebar
3. Add filters to narrow down your data
4. Select dimensions to group by
5. Add metrics to aggregate
6. Run the query to see the results

### Visualizing Results

1. After running a query, use the visualization tabs to switch between:
   - Table view
   - Line chart
   - Bar chart
   - Pie chart
2. Configure the visualization by clicking "Show Chart Settings"
3. Export the results using the "Export" dropdown

### Saving Explorations

1. After creating an exploration, click the "Save" button
2. Enter a name for the exploration
3. Access saved explorations from the sidebar

## Acknowledgments

- Inspired by Facebook/Meta's Scuba tool
- Built with Next.js, React, Bun, FastAPI, and SQLAlchemy
- UI components based on Tailwind CSS
