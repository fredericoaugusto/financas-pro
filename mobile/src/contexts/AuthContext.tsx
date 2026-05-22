import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

interface User {
  id: number;
  name: string;
  email: string;
}

interface AuthContextData {
  user: User | null;
  token: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Ao montar, tenta recuperar token salvo
  useEffect(() => {
    loadStoredData();
  }, []);

  const loadStoredData = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('@FinancasPro:token');
      if (storedToken) {
        setToken(storedToken);
        try {
          const res = await api.get('/auth/user');
          setUser(res.data?.data || res.data?.user || res.data);
        } catch {
          // Token expirado — limpa tudo
          await AsyncStorage.removeItem('@FinancasPro:token');
          setToken(null);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    
    const newToken = res.data?.data?.token || res.data?.token || res.data?.access_token;
    if (!newToken) throw new Error('Token não recebido da API.');

    await AsyncStorage.setItem('@FinancasPro:token', newToken);
    setToken(newToken);

    // Busca dados do usuário
    const userRes = await api.get('/auth/user');
    setUser(userRes.data?.data || userRes.data?.user || userRes.data);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {} // ignora erro se token já expirou
    await AsyncStorage.removeItem('@FinancasPro:token');
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await api.get('/auth/user');
      setUser(res.data?.data || res.data?.user || res.data);
    } catch {}
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, signIn, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
