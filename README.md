# Facet - SQL Data Exploration Tool

Facet is a GUI-first SQL data exploration tool designed to enable engineers, product managers, and business users to quickly explore and visualize data without writing SQL queries. Inspired by Facebook's Scuba, Facet provides an intuitive interface for filtering, grouping, and visualizing data across various SQL databases.

## Features

- **Visual Query Building**: Create complex SQL queries using an intuitive interface
- **Multiple Database Support**: Connect to PostgreSQL and ClickHouse databases
- **Interactive Visualizations**: View your data as tables, line charts, bar charts, and pie charts
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

1. Create a virtual environment at the project root:
```bash
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r backend/requirements.txt  # For production dependencies only
```

3. Start the development server:
```bash
uvicorn main:app --reload
```

4. Access the API at http://localhost:8000

## Development Tools

### Code Formatting and Linting

The project uses both pre-commit hooks and manual commands for code quality:

#### Pre-commit Hooks

Pre-commit hooks automatically check code before each commit:

```bash
# Activate the virtual environment first
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install pre-commit in the virtual environment
pip install pre-commit

# Install pre-commit hooks
pre-commit install
```

The pre-commit hooks will automatically run on `git commit` and will:
- Format Python code with Black and isort
- Lint Python code with Flake8
- Type check Python code with MyPy
- Format JavaScript/React code with Prettier
- Lint JavaScript/React code with ESLint

To run all pre-commit checks manually:
```bash
pre-commit run --all-files
```

#### Additional Quality Checks

Some tools require manual execution:

##### Backend

```bash
# Install development dependencies
pip install -r backend/requirements-dev.txt

# Run tests
cd backend && make test  # Runs pytest

# Run all checks (format, lint, typecheck, and tests)
cd backend && make ci-check
```

##### Frontend

```bash
# Run tests
cd frontend && bun test
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

## Database Connections

Facet supports connecting to PostgreSQL and ClickHouse databases. Database connections are configured through a YAML configuration file.

### Configuration Setup

1. Copy the example configuration file:
   ```bash
   cp backend/config/db_connections.yaml.example backend/config/db_connections.yaml
   ```

2. Edit the `db_connections.yaml` file to add your database connections:
   ```yaml
   connections:
     - name: "PostgreSQL (Local)"
       type: "postgres"
       config:
         host: "postgres"
         port: 5432
         database: "facet"
         user: "facet"
         password: "facetpass"
         ssl: false
     
     - name: "Production Database"
       type: "postgres"
       config:
         host: "production-db.example.com"
         port: 5432
         database: "analytics"
         user: "analyst"
         password: "your-password"
         ssl: true
   ```

3. Restart the backend service to load the new connections:
   ```bash
   docker-compose -f docker-compose.dev.yml restart backend
   ```

## Acknowledgments

- Inspired by Facebook/Meta's Scuba tool
- Built with Next.js, React, Bun, FastAPI, and SQLAlchemy
- UI components based on Tailwind CSS
