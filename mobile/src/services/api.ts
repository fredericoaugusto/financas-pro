import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const getBaseUrl = () => {
  if (Platform.OS === 'web') {
    // Para funcionar corretamente se você estiver rodando em um servidor remoto
    const host = typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1';
    return `http://${host}:8000/api`;
  }
  if (Platform.OS === 'ios') return 'http://127.0.0.1:8000/api';
  return 'http://10.0.2.2:8000/api'; // Android Emulator
};

const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Interceptador de Requisição
// Sempre que o app fizer um pedido para a API, este código vai rodar antes.
api.interceptors.request.use(
  async (config) => {
    // Busca o token salvo no celular (criado após o login)
    const token = await AsyncStorage.getItem('@FinancasPro:token');
    
    // Se existir um token, injeta no cabeçalho Authorization
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
