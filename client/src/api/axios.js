import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('bl_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Support dev auth headers when present in localStorage
  const devRole = localStorage.getItem('bl_dev_role');
  const devUserId = localStorage.getItem('bl_dev_user_id');
  if (devRole && devUserId) {
    config.headers['x-dev-role'] = devRole;
    config.headers['x-dev-user-id'] = devUserId;
  }

  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('bl_token');
      localStorage.removeItem('bl_user');
      localStorage.removeItem('bl_dev_role');
      localStorage.removeItem('bl_dev_user_id');
      if (typeof window !== 'undefined' && window.location.pathname !== '/login' && window.location.pathname !== '/') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
