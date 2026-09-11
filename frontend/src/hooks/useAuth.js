import { useState, useEffect } from 'react';
import api from '../utils/api';

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (token && storedUser) {
      setIsAuthenticated(true);
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, userId, companyId, role } = response.data;
      const nextUser = { id: userId, companyId, role: role || 'admin' };
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(nextUser));
      setIsAuthenticated(true);
      setUser(nextUser);
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  };

  const register = async (companyName, email, password) => {
    try {
      const response = await api.post('/auth/register', { companyName, email, password });
      const { token, userId, companyId, role } = response.data;
      const nextUser = { id: userId, companyId, role: role || 'admin' };
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(nextUser));
      setIsAuthenticated(true);
      setUser(nextUser);
      return true;
    } catch (error) {
      console.error('Registration failed:', error);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setUser(null);
  };

  // Sessions created before roles existed have no `role` in localStorage — treat anything
  // that isn't explicitly 'member' as admin, matching the backend's fallback for tokens
  // signed before this change.
  const isAdmin = user?.role !== 'member';

  return { isAuthenticated, user, loading, login, register, logout, isAdmin };
};
