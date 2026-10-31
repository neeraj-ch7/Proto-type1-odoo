import api from './axios';

export const getInvoices = (params) => api.get('/invoices', { params }).then((r) => r.data);
export const getInvoice = (id) => api.get(`/invoices/${id}`).then((r) => r.data);
export const confirmInvoice = (id) => api.patch(`/invoices/${id}/confirm`).then((r) => r.data);
export const cancelInvoice = (id) => api.patch(`/invoices/${id}/cancel`).then((r) => r.data);
export const sendInvoice = (id) => api.patch(`/invoices/${id}/send`).then((r) => r.data);
export const runBilling = (data) => api.post('/billing/run', data).then((r) => r.data);
export const getInvoicePayments = (invoiceId) =>
  api.get(`/invoices/${invoiceId}/payments`).then((r) => r.data).catch(() => ({ items: [] }));
export const recordPayment = (data) => api.post('/payments', data).then((r) => r.data);

