import api from './axios';

export const getPayments = (params) =>
  api.get('/payments', { params }).then((r) => r.data);

export const recordPayment = (data) =>
  api.post('/payments', data).then((r) => r.data);

export const getInvoicePayments = (invoiceId) =>
  api.get(`/invoices/${invoiceId}/payments`).then((r) => r.data);
