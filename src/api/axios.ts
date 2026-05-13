import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true, // Envia e recebe cookies httpOnly automaticamente
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor de resposta: trata erros de autenticação
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Se receber 401 (Unauthorized), redireciona para login
    if (error.response?.status === 401) {
      // O store do Zustand será responsável por limpar o estado
      // Os cookies httpOnly serão limpos pelo backend no logout
    }
    return Promise.reject(error);
  }
);

export default api;
