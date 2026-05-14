import axios from 'axios';

// Removemos a imposição do Content-Type application/json global pro formData não quebrar
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL?.replace(/\/+$/, ''),
  withCredentials: true,
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
