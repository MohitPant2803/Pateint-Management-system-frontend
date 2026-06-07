import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

interface DoctorProfile {
  id: string;
  name: string;
  email: string;
  profilePicture?: string;
  role: string;
}

interface AuthContextType {
  token: string | null;
  doctor: DoctorProfile | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Configure backend API base URL
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
axios.defaults.baseURL = API_URL;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Set auth header helper
  const setAuthHeader = (jwtToken: string | null) => {
    if (jwtToken) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${jwtToken}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  };

  // Fetch profile details
  const fetchProfile = async (jwtToken: string) => {
    try {
      setAuthHeader(jwtToken);
      const res = await axios.get('/auth/profile');
      if (res.data.success) {
        setDoctor(res.data.data);
      } else {
        // Token invalid
        clearAuth();
      }
    } catch (error) {
      console.error('Error fetching doctor profile:', error);
      clearAuth();
    } finally {
      setLoading(false);
    }
  };

  const clearAuth = () => {
    localStorage.removeItem('token');
    setToken(null);
    setDoctor(null);
    setAuthHeader(null);
  };

  // Perform check on mount
  useEffect(() => {
    if (token) {
      fetchProfile(token);
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (newToken: string) => {
    setLoading(true);
    localStorage.setItem('token', newToken);
    setToken(newToken);
    await fetchProfile(newToken);
  };

  const logout = async () => {
    try {
      // Notify backend to log audit trail
      if (token) {
        setAuthHeader(token);
        await axios.post('/auth/logout').catch(() => {});
      }
    } catch (e) {
      // Ignore
    }
    clearAuth();
    window.location.href = '/login';
  };

  const value: AuthContextType = {
    token,
    doctor,
    isAuthenticated: !!doctor,
    loading,
    login,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
