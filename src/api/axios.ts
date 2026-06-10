import axios from 'axios';
import { useAuthStore } from '@/stores/use-auth-store';

// Removemos a imposição do Content-Type application/json global pro formData não quebrar
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL?.replace(/\/+$/, ''),
  withCredentials: true,
});

// Endpoints que não devem disparar o fluxo de refresh (evita loop infinito)
const AUTH_ENDPOINTS = ['/auth/login', '/auth/refresh'];

let isRefreshing = false;
let refreshQueue: Array<() => void> = [];

function onRefreshed() {
  refreshQueue.forEach((callback) => callback());
  refreshQueue = [];
}

// Interceptor de resposta: renova o access token automaticamente em caso de 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    const isAuthEndpoint = AUTH_ENDPOINTS.some((url) => originalRequest?.url?.includes(url));

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        // Já existe um refresh em andamento: aguarda ele terminar e tenta de novo
        return new Promise((resolve, reject) => {
          refreshQueue.push(() => {
            api(originalRequest).then(resolve, reject);
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await api.post('/auth/refresh');
        isRefreshing = false;
        onRefreshed();
        return api(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        refreshQueue = [];
        // Refresh token também expirou/inválido/inexistente: encerra a sessão.
        // Não forçamos navegação aqui (window.location causaria reload e loop
        // com o AuthBoot, que chama /auth/me a cada montagem). O ProtectedRoute
        // já redireciona para /login via React Router quando isAuthenticated vira false.
        useAuthStore.getState().logout();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
