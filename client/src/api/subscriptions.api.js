import api from './axios';

export const getSubscriptions = (params) => api.get('/subscriptions', { params }).then((r) => r.data);
export const getSubscription = (id) => api.get(`/subscriptions/${id}`).then((r) => r.data);
export const createSubscription = (data) => api.post('/subscriptions', data).then((r) => r.data);
export const updateSubscriptionStatus = (id, status) =>
  api.patch(`/subscriptions/${id}/status`, { status }).then((r) => r.data);
export const createFromTemplate = (templateId, data) =>
  api.post(`/subscriptions/from-template/${templateId}`, data).then((r) => r.data);
export const getCustomers = () => api.get('/users', { params: { role: 'customer', limit: 100 } }).then((r) => r.data);

