import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor de requisição: adiciona o token ao header Authorization
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor de resposta: salva o token quando recebido do login e trata erros
api.interceptors.response.use(
  (response) => {
    // Se a resposta contém um token (resposta de login), armazena em localStorage
    if (response.data?.token) {
      localStorage.setItem('accessToken', response.data.token);
    }
    if (response.data?.refreshToken) {
      localStorage.setItem('refreshToken', response.data.refreshToken);
    }
    return response;
  },
  (error) => {
    // Se receber 401 (Unauthorized), limpa os tokens
    if (error.response?.status === 401) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
    return Promise.reject(error);
  }
);

export default api;
