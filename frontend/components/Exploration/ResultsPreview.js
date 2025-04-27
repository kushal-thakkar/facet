import React from 'react';
import DataTable from './DataTable';

function ResultsPreview({ results, onPageChange }) {
  return (
    <DataTable
      results={results}
      onPageChange={onPageChange}
      emptyMessage="No data available for preview"
    />
  );
}

export default ResultsPreview;
