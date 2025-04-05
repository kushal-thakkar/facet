# Detailed Code Documentation

## Frontend

Context and State Management:

AppStateContext.js: Central state management for the application


Layout Components:

MainLayout.js: Main application layout with panels
Header.js: Application header with connection selector
SidePanel.js: Navigation for tables and saved queries
InfoPanel.js: Metadata and help information
Footer.js: Query status and performance information


Exploration Components:

ExplorationControls.js: Container for filter, group by, and metrics
FilterBar.js: UI for creating and managing filters
GroupBySelector.js: UI for selecting dimensions to group by
MetricSelector.js: UI for defining metrics and aggregations
TimeRangeSelector.js: UI for selecting time ranges


Results Components:

ResultsArea.js: Container for result visualizations
ResultsTable.js: Data grid with pagination and sorting
ResultsChart.js: Chart visualization options


Connection Components:

ConnectionForm.js: Form for creating and editing connections


Pages:

index.js: Main application page
_app.js: Next.js application wrapper



## Backend

Database Connectors:

base_connector.py: Abstract base class for database connectors
postgres_connector.py: PostgreSQL implementation
clickhouse_connector.py: ClickHouse implementation
connector_factory.py: Factory for creating appropriate connectors


Data Models:

connection.py: Database connection models
query.py: Query definition and result models
metadata.py: Table/column metadata models
exploration.py: Saved exploration models


API Routers:

connections.py: Endpoints for managing connections
metadata.py: Endpoints for retrieving database metadata
query.py: Endpoints for executing and analyzing queries
explorations.py: Endpoints for saving and loading explorations


Services:

connection_service.py: Logic for connection management
metadata_service.py: Logic for metadata extraction and management
query_service.py: Logic for query execution
query_translator.py: Translation from JSON query model to SQL
exploration_service.py: Logic for exploration management


Main Application:

main.py: FastAPI application entry point
