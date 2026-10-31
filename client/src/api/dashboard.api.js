import api from './axios';

export const getDashboardSummary = (params) =>
  api.get('/dashboard/summary', { params }).then((r) => r.data);

export const exportDashboardCsv = (params) =>
  api
    .get('/dashboard/export', {
      params,
      responseType: 'blob',
    })
    .then((response) => {
      // Trigger browser download
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoices-export-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      return true;
    });
