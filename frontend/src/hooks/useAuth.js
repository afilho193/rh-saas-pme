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
      const { token, userId, companyId } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify({ id: userId, companyId }));
      setIsAuthenticated(true);
      setUser({ id: userId, companyId });
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  };

  const register = async (companyName, email, password) => {
    try {
      const response = await api.post('/auth/register', { companyName, email, password });
      const { token, userId, companyId } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify({ id: userId, companyId }));
      setIsAuthenticated(true);
      setUser({ id: userId, companyId });
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

  return { isAuthenticated, user, loading, login, register, logout };
};
