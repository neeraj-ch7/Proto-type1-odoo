import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('bl_user');
      return stored ? JSON.parse(stored) : { id: 'dev-admin-id', role: 'admin', name: 'Admin User', email: 'admin@brightloop.com' };
    } catch {
      return { id: 'dev-admin-id', role: 'admin', name: 'Admin User', email: 'admin@brightloop.com' };
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('bl_token') || 'dev_token');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If DEV_AUTH is used, store dev role
    if (user?.role) {
      localStorage.setItem('bl_dev_role', user.role);
      localStorage.setItem('bl_dev_user_id', user.id || 'dev-admin-id');
    }
  }, [user]);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      const { token: jwtToken, user: userData } = res.data;
      localStorage.setItem('bl_token', jwtToken);
      localStorage.setItem('bl_user', JSON.stringify(userData));
      localStorage.setItem('bl_dev_role', userData.role);
      localStorage.setItem('bl_dev_user_id', userData.id);
      setToken(jwtToken);
      setUser(userData);
      return userData;
    } finally {
      setLoading(false);
    }
  };

  const register = async (email, password) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/register', { email, password });
      const { token: jwtToken, user: userData } = res.data;
      localStorage.setItem('bl_token', jwtToken);
      localStorage.setItem('bl_user', JSON.stringify(userData));
      localStorage.setItem('bl_dev_role', userData.role);
      localStorage.setItem('bl_dev_user_id', userData.id);
      setToken(jwtToken);
      setUser(userData);
      return userData;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('bl_token');
    localStorage.removeItem('bl_user');
    localStorage.removeItem('bl_dev_role');
    localStorage.removeItem('bl_dev_user_id');
    setToken(null);
    setUser(null);
  };

  // Switch role for quick testing between admin and staff in hackathon demo
  const switchRole = (newRole) => {
    const updated = { ...user, role: newRole };
    setUser(updated);
    localStorage.setItem('bl_user', JSON.stringify(updated));
    localStorage.setItem('bl_dev_role', newRole);
    localStorage.setItem('bl_dev_user_id', updated.id || 'dev-admin-id');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, switchRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
