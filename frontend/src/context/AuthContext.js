import React, { createContext, useState, useContext, useEffect } from 'react';
import { authService } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      if (authService.isAuthenticated()) {
        try {
          const userData = await authService.getProfile();
          setUser(userData);
        } catch (error) {
          console.error('Error al cargar perfil:', error);
          authService.logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (username, password) => {
    try {
      const response = await authService.login(username, password);
      const userData = await authService.getProfile();
      setUser(userData);
      return { success: true, user: userData };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Error al iniciar sesión',
      };
    }
  };
  
  const refreshUser = async () => {
    try {
      const userData = await authService.getProfile();
      setUser(userData);
      return userData;
    } catch (error) {
      console.error('Error al actualizar usuario:', error);
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const isAlumno = () => user?.tipo === 'alumno';
  const isDocente = () => user?.tipo === 'docente' || user?.tipo === 'admin';
  const isAdmin = () => user?.tipo === 'admin' || user?.is_superuser;

  const value = {
    user,
    loading,
    login,
    logout,
    refreshUser,
    isAuthenticated: !!user,
    isAlumno,
    isDocente,
    isAdmin,
    debeCambiarPassword: user?.debe_cambiar_password || false,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

