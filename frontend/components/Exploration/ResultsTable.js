import React from 'react';
import DataTable from './DataTable';

function ResultsTable({ results, onPageChange }) {
  return (
    <DataTable
      results={results}
      onPageChange={onPageChange}
      emptyMessage="No data available for table"
    />
  );
}

export default ResultsTable;
