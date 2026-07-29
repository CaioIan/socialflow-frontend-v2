import { AxiosError } from 'axios';

/** Corpo de erro padronizado pelo AllExceptionsFilter do backend. */
interface ApiErrorBody {
  statusCode?: number;
  error?: string;
  message?: string | string[];
  timestamp?: string;
  path?: string;
}

export type ApiError = AxiosError<ApiErrorBody>;

/**
 * Extrai a mensagem de erro da API para exibir ao usuário.
 * Cai no `fallback` quando o erro não vem da API (rede, bug de client, etc.),
 * evitando vazar stack trace ou detalhe interno na interface.
 */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  const message = (error as ApiError)?.response?.data?.message;

  if (Array.isArray(message)) {
    return message[0] ?? fallback;
  }

  return message || fallback;
}
