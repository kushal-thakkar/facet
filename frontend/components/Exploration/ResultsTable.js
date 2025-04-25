import React from 'react';
import DataTable from './DataTable';

function ResultsTable({ results }) {
  return <DataTable results={results} emptyMessage="No data available for table" />;
}

export default ResultsTable;
