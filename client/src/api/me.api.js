import api from './axios';

export const getMySubscriptions = (params) =>
  api.get('/me/subscriptions', { params }).then((r) => r.data);

export const getMyInvoices = (params) =>
  api.get('/me/invoices', { params }).then((r) => r.data);

export const getMyInvoice = (id) =>
  api.get(`/me/invoices/${id}`).then((r) => r.data);
