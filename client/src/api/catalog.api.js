import api from './axios';

// Products API
export const getProducts = (params) => api.get('/products', { params }).then((r) => r.data);
export const getProduct = (id) => api.get(`/products/${id}`).then((r) => r.data);
export const createProduct = (data) => api.post('/products', data).then((r) => r.data);
export const updateProduct = (id, data) => api.patch(`/products/${id}`, data).then((r) => r.data);
export const deleteProduct = (id) => api.delete(`/products/${id}`).then((r) => r.data);

// Plans API
export const getPlans = (params) => api.get('/plans', { params }).then((r) => r.data);
export const getPublicPlans = () => api.get('/plans/public').then((r) => r.data);
export const getPlan = (id) => api.get(`/plans/${id}`).then((r) => r.data);
export const createPlan = (data) => api.post('/plans', data).then((r) => r.data);
export const updatePlan = (id, data) => api.patch(`/plans/${id}`, data).then((r) => r.data);
export const updatePlanStatus = (id, action, endDate) =>
  api.patch(`/plans/${id}/status`, { action, endDate }).then((r) => r.data);
export const deletePlan = (id) => api.delete(`/plans/${id}`).then((r) => r.data);

// Taxes API
export const getTaxes = (params) => api.get('/taxes', { params }).then((r) => r.data);
export const getTax = (id) => api.get(`/taxes/${id}`).then((r) => r.data);
export const createTax = (data) => api.post('/taxes', data).then((r) => r.data);
export const updateTax = (id, data) => api.patch(`/taxes/${id}`, data).then((r) => r.data);
export const deleteTax = (id) => api.delete(`/taxes/${id}`).then((r) => r.data);

// Discounts API
export const getDiscounts = (params) => api.get('/discounts', { params }).then((r) => r.data);
export const getDiscount = (id) => api.get(`/discounts/${id}`).then((r) => r.data);
export const createDiscount = (data) => api.post('/discounts', data).then((r) => r.data);
export const updateDiscount = (id, data) => api.patch(`/discounts/${id}`, data).then((r) => r.data);
export const deleteDiscount = (id) => api.delete(`/discounts/${id}`).then((r) => r.data);

// Templates API
export const getTemplates = (params) => api.get('/templates', { params }).then((r) => r.data);
export const getTemplate = (id) => api.get(`/templates/${id}`).then((r) => r.data);
export const createTemplate = (data) => api.post('/templates', data).then((r) => r.data);
export const updateTemplate = (id, data) => api.patch(`/templates/${id}`, data).then((r) => r.data);
export const deleteTemplate = (id) => api.delete(`/templates/${id}`).then((r) => r.data);
