import React from 'react';
import DataTable from './DataTable';

function ResultsPreview({ results }) {
  return <DataTable results={results} emptyMessage="No data available for preview" />;
}

export default ResultsPreview;
