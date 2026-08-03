import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, ImageUp, Loader2, Trash2 } from 'lucide-react';
import { Modal } from '@/shared/components/modal';
import { organizationsService } from '../api/organizations-service';
import { useToastStore } from '@/stores/use-toast-store';

/** Mesmos limites do backend, para o erro aparecer antes de subir o arquivo. */
const TAMANHO_MAXIMO = 10 * 1024 * 1024;
const TIPOS_ACEITOS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  organization: { id: string; name: string; logoUrl: string | null } | undefined;
}

export function OrganizationLogoModal({ isOpen, onClose, organization }: Props) {
  const queryClient = useQueryClient();
  const { addToast } = useToastStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [erro, setErro] = useState<string | undefined>(undefined);

  const invalidar = () => queryClient.invalidateQueries({ queryKey: ['organizations'] });

  const enviar = useMutation({
    mutationFn: organizationsService.uploadLogo,
    onSuccess: () => {
      invalidar();
      addToast('Foto de perfil atualizada.', 'success');
      onClose();
    },
    onError: () => addToast('Não foi possível enviar a imagem.', 'error'),
  });

  const remover = useMutation({
    mutationFn: organizationsService.removeLogo,
    onSuccess: () => {
      invalidar();
      addToast('Foto removida. A organização volta a usar o ícone padrão.', 'success');
      onClose();
    },
    onError: () => addToast('Não foi possível remover a foto.', 'error'),
  });

  const ocupado = enviar.isPending || remover.isPending;

  function aoEscolher(arquivo: File | undefined) {
    if (!arquivo || !organization) return;

    // Validar antes de subir: um 400 depois de esperar o upload de 10 MB é a
    // pior forma de descobrir que o formato não servia.
    if (!TIPOS_ACEITOS.includes(arquivo.type)) {
      setErro('Formato não aceito. Envie JPEG, PNG, WEBP ou GIF.');
      return;
    }

    if (arquivo.size > TAMANHO_MAXIMO) {
      setErro('A imagem precisa ter no máximo 10 MB.');
      return;
    }

    setErro(undefined);
    enviar.mutate({ id: organization.id, file: arquivo });
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Foto de perfil" className="max-w-sm">
      <div className="space-y-6">
        <p className="text-sm text-zinc-500">
          Como <span className="text-zinc-300 font-semibold">{organization?.name}</span> aparece
          nas listas do SocialFlow.
        </p>

        <div className="flex justify-center">
          <div className="w-28 h-28 rounded-3xl overflow-hidden border border-white/10 bg-white/5 flex items-center justify-center">
            {organization?.logoUrl ? (
              <img
                src={organization.logoUrl}
                alt={`Foto de perfil de ${organization.name}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <Building2 className="w-10 h-10 text-zinc-600" />
            )}
          </div>
        </div>

        {erro && (
          <p className="text-xs text-red-400 text-center bg-red-500/10 border border-red-500/20 rounded-xl py-2 px-3">
            {erro}
          </p>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={TIPOS_ACEITOS.join(',')}
          className="hidden"
          onChange={(e) => {
            aoEscolher(e.target.files?.[0]);
            // Permite reenviar o mesmo arquivo depois de um erro.
            e.target.value = '';
          }}
        />

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={ocupado}
            className="w-full py-3.5 rounded-2xl bg-brand-gradient text-white font-bold transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {enviar.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ImageUp className="w-4 h-4" />
            )}
            {organization?.logoUrl ? 'Trocar imagem' : 'Escolher imagem'}
          </button>

          {organization?.logoUrl && (
            <button
              type="button"
              onClick={() => organization && remover.mutate(organization.id)}
              disabled={ocupado}
              className="w-full py-3 rounded-2xl border border-red-500/25 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {remover.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              Remover foto
            </button>
          )}
        </div>

        <p className="text-[11px] text-zinc-600 text-center">
          JPEG, PNG, WEBP ou GIF, até 10 MB. A imagem é recortada em quadrado.
        </p>
      </div>
    </Modal>
  );
}
