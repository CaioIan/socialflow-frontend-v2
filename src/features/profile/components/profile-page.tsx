import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Building2, ImageUp, Loader2, Mail, Shield, Trash2, User as UserIcon } from 'lucide-react';
import { GlassCard } from '@/shared/components/glass-card';
import { useToastStore } from '@/stores/use-toast-store';
import { useAuthStore } from '@/stores/use-auth-store';
import { profileService } from '../api/profile-service';
import { AvatarCropModal } from './avatar-crop-modal';

/** Mesmos limites do backend, para o erro aparecer antes de subir o arquivo. */
const TAMANHO_MAXIMO = 10 * 1024 * 1024;
const TIPOS_ACEITOS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const ROTULO_DO_PAPEL: Record<string, string> = {
  ADMIN: 'Administrador',
  DESIGNER: 'Designer',
  CLIENT: 'Cliente',
};

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const { addToast } = useToastStore();
  const { user, setUser } = useAuthStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [imagemEscolhida, setImagemEscolhida] = useState<string | undefined>(undefined);
  const [erro, setErro] = useState<string | undefined>(undefined);

  const { data: perfil, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: profileService.get,
  });

  // A URL de blob some da memória só quando revogada; sem isto, escolher várias
  // fotos seguidas vai acumulando.
  useEffect(() => {
    return () => {
      if (imagemEscolhida) URL.revokeObjectURL(imagemEscolhida);
    };
  }, [imagemEscolhida]);

  const sincronizarSessao = (avatarUrl: string | null) => {
    // O cabeçalho e o menu leem o avatar da sessão; sem atualizar aqui, a foto
    // nova só apareceria no próximo login.
    if (user) setUser({ ...user, avatarUrl });
    queryClient.invalidateQueries({ queryKey: ['profile'] });
  };

  const fecharRecorte = () => {
    if (imagemEscolhida) URL.revokeObjectURL(imagemEscolhida);
    setImagemEscolhida(undefined);
  };

  const enviar = useMutation({
    mutationFn: profileService.uploadAvatar,
    onSuccess: (atualizado) => {
      sincronizarSessao(atualizado.avatarUrl);
      addToast('Foto de perfil atualizada.', 'success');
      fecharRecorte();
    },
    onError: () => addToast('Não foi possível enviar a imagem.', 'error'),
  });

  const remover = useMutation({
    mutationFn: profileService.removeAvatar,
    onSuccess: () => {
      sincronizarSessao(null);
      addToast('Foto removida.', 'success');
    },
    onError: () => addToast('Não foi possível remover a foto.', 'error'),
  });

  const definirNotificacoes = useMutation({
    mutationFn: profileService.definirNotificacoes,
    onSuccess: (_, ligado) => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      addToast(
        ligado
          ? 'Você voltará a receber avisos por e-mail.'
          : 'Não enviaremos mais avisos por e-mail.',
        'success',
      );
    },
    onError: () => addToast('Não foi possível alterar a preferência.', 'error'),
  });

  function aoEscolher(arquivo: File | undefined) {
    if (!arquivo) return;

    if (!TIPOS_ACEITOS.includes(arquivo.type)) {
      setErro('Formato não aceito. Envie JPEG, PNG, WEBP ou GIF.');
      return;
    }

    if (arquivo.size > TAMANHO_MAXIMO) {
      setErro('A imagem precisa ter no máximo 10 MB.');
      return;
    }

    setErro(undefined);
    setImagemEscolhida(URL.createObjectURL(arquivo));
  }

  if (isLoading || !perfil) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-zinc-500">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p>Carregando perfil...</p>
      </div>
    );
  }

  const inicial = perfil.name?.charAt(0).toUpperCase() || perfil.email.charAt(0).toUpperCase();

  return (
    <div className="space-y-8 max-w-2xl">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-glow">Meu perfil</h1>
        <p className="text-zinc-500">
          Seus dados no SocialFlow. Só a foto pode ser alterada aqui — o resto é
          mantido por um administrador.
        </p>
      </header>

      <GlassCard className="p-8 space-y-8">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="w-28 h-28 shrink-0 rounded-3xl overflow-hidden border border-white/10 bg-brand-gradient flex items-center justify-center text-white text-4xl font-bold">
            {perfil.avatarUrl ? (
              <img
                src={perfil.avatarUrl}
                alt={`Foto de perfil de ${perfil.name || perfil.email}`}
                className="w-full h-full object-cover"
              />
            ) : (
              inicial
            )}
          </div>

          <div className="flex-1 w-full space-y-3">
            <input
              ref={inputRef}
              type="file"
              accept={TIPOS_ACEITOS.join(',')}
              className="hidden"
              onChange={(e) => {
                aoEscolher(e.target.files?.[0]);
                // Permite reescolher o mesmo arquivo depois de cancelar.
                e.target.value = '';
              }}
            />

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={remover.isPending}
                className="flex-1 py-3 px-4 rounded-2xl bg-brand-gradient text-white font-bold transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <ImageUp className="w-4 h-4" />
                {perfil.avatarUrl ? 'Trocar foto' : 'Escolher foto'}
              </button>

              {perfil.avatarUrl && (
                <button
                  type="button"
                  onClick={() => remover.mutate()}
                  disabled={remover.isPending}
                  className="py-3 px-4 rounded-2xl border border-red-500/25 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {remover.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  Remover
                </button>
              )}
            </div>

            {erro && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl py-2 px-3">
                {erro}
              </p>
            )}

            <p className="text-[11px] text-zinc-600">
              JPEG, PNG, WEBP ou GIF, até 10 MB. Você escolhe o enquadramento
              antes de salvar.
            </p>
          </div>
        </div>

        <div className="space-y-4 pt-6 border-t border-white/5">
          <Campo icone={UserIcon} rotulo="Nome" valor={perfil.name || 'Sem nome'} />
          <Campo icone={Mail} rotulo="E-mail" valor={perfil.email} />
          <Campo
            icone={Shield}
            rotulo="Perfil de acesso"
            valor={ROTULO_DO_PAPEL[perfil.role] ?? perfil.role}
          />
        </div>

        <div className="pt-6 border-t border-white/5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Bell className="w-4 h-4 text-zinc-500 shrink-0" />
                Avisos por e-mail
              </h2>
              <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed">
                {perfil.role === 'CLIENT' &&
                  'Avisamos quando chega arte nova para aprovar e quando um post vai ao ar.'}
                {perfil.role === 'DESIGNER' &&
                  'Avisamos quando um cliente pede ajuste em alguma arte sua.'}
                {perfil.role === 'ADMIN' &&
                  'Avisamos quando uma publicação falha ou o Instagram de um cliente é recusado.'}
              </p>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={perfil.emailNotifications}
              aria-label="Receber avisos por e-mail"
              disabled={definirNotificacoes.isPending}
              onClick={() => definirNotificacoes.mutate(!perfil.emailNotifications)}
              className={`relative shrink-0 w-12 h-7 rounded-full transition-colors disabled:opacity-50 ${
                perfil.emailNotifications ? 'bg-primary' : 'bg-white/10'
              }`}
            >
              <span
                className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${
                  perfil.emailNotifications ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {perfil.organizations.length > 0 && (
          <div className="space-y-3 pt-6 border-t border-white/5">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              {perfil.organizations.length === 1 ? 'Sua organização' : 'Suas organizações'}
            </h2>
            <div className="flex flex-wrap gap-2">
              {perfil.organizations.map((org) => (
                <div
                  key={org.organizationId}
                  className="flex items-center gap-2.5 pl-1.5 pr-3.5 py-1.5 rounded-full bg-white/5 border border-white/10"
                >
                  <div className="w-7 h-7 rounded-full overflow-hidden bg-white/5 flex items-center justify-center shrink-0">
                    {org.logoUrl ? (
                      <img src={org.logoUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Building2 className="w-3.5 h-3.5 text-zinc-500" />
                    )}
                  </div>
                  <span className="text-sm text-zinc-300">{org.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </GlassCard>

      <AvatarCropModal
        isOpen={!!imagemEscolhida}
        onClose={() => !enviar.isPending && fecharRecorte()}
        imagemUrl={imagemEscolhida}
        onConfirm={(recortada) => enviar.mutate(recortada)}
        isConfirming={enviar.isPending}
      />
    </div>
  );
}

function Campo({
  icone: Icone,
  rotulo,
  valor,
}: {
  icone: typeof UserIcon;
  rotulo: string;
  valor: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <Icone className="w-4 h-4 text-zinc-600 shrink-0" />
      <span className="text-xs text-zinc-500 w-32 shrink-0">{rotulo}</span>
      <span className="text-sm text-zinc-200 truncate">{valor}</span>
    </div>
  );
}
