import { useEffect, useRef, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Download, Image as ImageIcon, Loader2, Plus, Tag, Trash2, Type, Upload, Users } from 'lucide-react';
import { Modal } from '@/shared/components/modal';
import { getApiErrorMessage } from '@/api/api-error';
import { useToastStore } from '@/stores/use-toast-store';
import { organizationsService } from '@/features/organizations/api/organizations-service';
import { recortarImagem, RECORTE_MURAL } from '@/shared/lib/recortar-imagem';
import {
  muralService,
  type MuralAudienceUser,
  type MuralBadge,
  type MuralItem,
} from '../api/mural-service';
import { MuralItemCard } from './mural-item-card';
import { ToggleSwitch } from '@/shared/components/toggle-switch';

/** Mesmos limites do backend, para o erro aparecer antes de subir o arquivo. */
const TAMANHO_MAXIMO = 5 * 1024 * 1024;
const TIPOS_ACEITOS = ['image/jpeg', 'image/png', 'image/webp'];
const RESOLUCAO_MINIMA = { largura: 800, altura: 450 };
const MAXIMO_DE_CARACTERES = 1200;
const MAXIMO_DE_BADGES = 4;

const CORES_SUGERIDAS = ['#7c3aed', '#0891b2', '#16a34a', '#db2777', '#ea580c', '#18181b'];

const CORES_DE_BADGE = [
  { nome: 'Vermelha', backgroundColor: '#dc2626', textColor: '#ffffff' },
  { nome: 'Cinza', backgroundColor: '#d4d4d8', textColor: '#18181b' },
  { nome: 'Violeta', backgroundColor: '#7c3aed', textColor: '#ffffff' },
  { nome: 'Azul', backgroundColor: '#2563eb', textColor: '#ffffff' },
  { nome: 'Verde', backgroundColor: '#16a34a', textColor: '#ffffff' },
  { nome: 'Âmbar', backgroundColor: '#f59e0b', textColor: '#18181b' },
] as const;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  item?: MuralItem & { audienceUserIds: string[] };
}

export function MuralItemModal({ isOpen, onClose, item }: Props) {
  const queryClient = useQueryClient();
  const { addToast } = useToastStore();
  const inputRef = useRef<HTMLInputElement>(null);

  const editando = Boolean(item);
  const [tipo, setTipo] = useState<'CARD' | 'IMAGE'>(item?.type ?? 'CARD');
  const [organizationId, setOrganizationId] = useState<string>(item?.organizationId ?? '');
  const [audienceUserIds, setAudienceUserIds] = useState<string[]>(item?.audienceUserIds ?? []);
  const [designersOnly, setDesignersOnly] = useState(item?.designersOnly ?? false);
  const [markdown, setMarkdown] = useState(item?.markdown ?? '');
  const [corDeFundo, setCorDeFundo] = useState(item?.backgroundColor ?? '#7c3aed');
  const [corDoTexto, setCorDoTexto] = useState(item?.textColor ?? '#ffffff');
  const [badges, setBadges] = useState<MuralBadge[]>(item?.badges.map((badge) => ({ ...badge })) ?? []);
  const [showMoreEnabled, setShowMoreEnabled] = useState(item?.showMoreEnabled ?? false);
  const [showMoreBackgroundColor, setShowMoreBackgroundColor] = useState(
    item?.showMoreBackgroundColor ?? '#ffffff',
  );
  const [showMoreTextColor, setShowMoreTextColor] = useState(
    item?.showMoreTextColor ?? '#18181b',
  );
  const [showMoreIconColor, setShowMoreIconColor] = useState(
    item?.showMoreIconColor ?? '#18181b',
  );
  const [installButtonEnabled, setInstallButtonEnabled] = useState(
    item?.installButtonEnabled ?? false,
  );
  const [erro, setErro] = useState<string | undefined>(undefined);

  const [imagemEscolhida, setImagemEscolhida] = useState<string | undefined>(undefined);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | undefined>(undefined);

  const { data: organizacoes = [] } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => organizationsService.getAll(),
    enabled: isOpen,
  });

  const { data: usuarios = [], isLoading: carregandoUsuarios } = useQuery({
    queryKey: ['mural-audience-users', organizationId],
    queryFn: () => muralService.listarDestinatarios(organizationId),
    enabled: isOpen && Boolean(organizationId),
  });

  const { data: designers = [], isLoading: carregandoDesigners } = useQuery({
    queryKey: ['mural-audience-designers'],
    queryFn: muralService.listarDesigners,
    enabled: isOpen && designersOnly && !organizationId,
  });

  // A URL de blob só sai da memória quando revogada.
  useEffect(() => {
    return () => {
      if (imagemEscolhida) URL.revokeObjectURL(imagemEscolhida);
    };
  }, [imagemEscolhida]);

  const limpar = () => {
    if (imagemEscolhida) URL.revokeObjectURL(imagemEscolhida);
    setImagemEscolhida(undefined);
    setMarkdown('');
    setBadges([]);
    setAudienceUserIds([]);
    setErro(undefined);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  };

  const fechar = () => {
    limpar();
    onClose();
  };

  const salvar = useMutation({
    mutationFn: async () => {
      const org = organizationId || null;

      if (tipo === 'CARD') {
        const dados = {
          markdown,
          backgroundColor: corDeFundo,
          textColor: corDoTexto,
          badges: badges.map((badge) => ({ ...badge, label: badge.label.trim() })),
          organizationId: org,
          audienceUserIds,
          showMoreEnabled,
          showMoreBackgroundColor,
          showMoreTextColor,
          showMoreIconColor,
          installButtonEnabled,
          designersOnly,
        };

        return item
          ? await muralService.atualizarCard(item.id, dados)
          : await muralService.criarCard(dados);
      }

      if (!imagemEscolhida && item) {
        return await muralService.atualizarImagem(
          item.id,
          null,
          org,
          audienceUserIds,
          designersOnly,
        );
      }

      if (!imagemEscolhida || !area) {
        throw new Error('Escolha uma imagem e ajuste o enquadramento');
      }

      // Recorta para 1280x720 antes de subir: o backend exige 16:9, e mandar o
      // original faria a validação recusar o que o usuário acabou de enquadrar.
      const recortada = await recortarImagem(imagemEscolhida, area, RECORTE_MURAL);
      return item
        ? await muralService.atualizarImagem(
            item.id,
            recortada,
            org,
            audienceUserIds,
            designersOnly,
          )
        : await muralService.criarImagem(recortada, org, audienceUserIds, designersOnly);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mural'] });
      addToast(editando ? 'Item atualizado no mural.' : 'Item publicado no mural.', 'success');
      fechar();
    },
    onError: (e) =>
      setErro(
        getApiErrorMessage(
          e,
          editando
            ? 'Não foi possível salvar as alterações do mural.'
            : 'Não foi possível publicar o item no mural.',
        ),
      ),
  });

  async function aoEscolherArquivo(arquivo?: File) {
    if (!arquivo) return;

    if (!TIPOS_ACEITOS.includes(arquivo.type)) {
      setErro('A imagem precisa ser JPEG, PNG ou WebP');
      return;
    }
    if (arquivo.size > TAMANHO_MAXIMO) {
      setErro('A imagem precisa ter no máximo 5 MB');
      return;
    }

    const url = URL.createObjectURL(arquivo);

    // Confere a resolução antes de abrir o recorte: recusar depois que a pessoa
    // já enquadrou é desperdiçar o trabalho dela.
    const dimensoes = await new Promise<{ w: number; h: number }>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => reject(new Error('Não foi possível ler a imagem'));
      img.src = url;
    }).catch(() => null);

    if (!dimensoes) {
      URL.revokeObjectURL(url);
      setErro('Não foi possível ler a imagem — o arquivo parece corrompido');
      return;
    }

    if (dimensoes.w < RESOLUCAO_MINIMA.largura || dimensoes.h < RESOLUCAO_MINIMA.altura) {
      URL.revokeObjectURL(url);
      setErro(
        `A imagem precisa ter no mínimo ${RESOLUCAO_MINIMA.largura}x${RESOLUCAO_MINIMA.altura}. ` +
          `Esta tem ${dimensoes.w}x${dimensoes.h} e ficaria borrada na tela.`,
      );
      return;
    }

    if (imagemEscolhida) URL.revokeObjectURL(imagemEscolhida);
    setImagemEscolhida(url);
    setErro(undefined);
  }

  const podeSalvar =
    tipo === 'CARD'
      ? markdown.trim().length > 0 &&
        markdown.length <= MAXIMO_DE_CARACTERES &&
        badges.every((badge) => badge.label.trim().length > 0)
      : Boolean(imagemEscolhida && area);
  const imagemPodeSerSalva = tipo === 'IMAGE' && (editando || Boolean(imagemEscolhida && area));
  const formularioPodeSerSalvo = tipo === 'IMAGE' ? imagemPodeSerSalva : podeSalvar;
  const organizacaoSelecionada = organizacoes.find((org) => org.id === organizationId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !salvar.isPending && fechar()}
      title={editando ? 'Editar item do mural' : 'Novo item do mural'}
      className="max-w-3xl"
    >
      <div className="space-y-6">
        {/* Tipo */}
        {!editando ? (
          <div className="flex gap-1 bg-white/5 p-2 rounded-2xl border border-white/10">
            {([
              { chave: 'CARD', rotulo: 'Escrever aviso', icone: Type },
              { chave: 'IMAGE', rotulo: 'Enviar imagem', icone: ImageIcon },
            ] as const).map(({ chave, rotulo, icone: Icone }) => (
              <button
                key={chave}
                type="button"
                onClick={() => {
                  setTipo(chave);
                  setErro(undefined);
                }}
                className={`flex-1 px-4 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                  tipo === chave
                    ? 'bg-brand-gradient text-white shadow-lg'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                }`}
              >
                <Icone className="w-4 h-4" />
                {rotulo}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-300">
            {tipo === 'CARD' ? <Type className="h-4 w-4 text-primary" /> : <ImageIcon className="h-4 w-4 text-primary" />}
            {tipo === 'CARD' ? 'Editando aviso em texto' : 'Editando aviso em imagem'}
          </div>
        )}

        {/* Destino */}
        <div className="space-y-2">
          <label htmlFor="mural-organization" className="text-xs font-bold text-zinc-400 uppercase tracking-wide">
            Quem vê este aviso
          </label>
          <select
            id="mural-organization"
            value={organizationId}
            onChange={(e) => {
              setOrganizationId(e.target.value);
              // IDs escolhidos numa empresa nunca podem vazar para outra.
              setAudienceUserIds([]);
            }}
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50"
          >
            <option value="">Todas as empresas (aviso global)</option>
            {organizacoes.map((org) => (
              <option key={org.id} value={org.id}>
                Somente {org.name}
              </option>
            ))}
          </select>
        </div>

        <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-zinc-400">
                <Users className="h-3.5 w-3.5 text-primary" />
                Somente designers
              </span>
              <p className="mt-1 text-xs leading-relaxed text-zinc-600">
                Exibe o aviso apenas para a equipe de design do SocialFlow. A organização é opcional e clientes não verão este conteúdo.
              </p>
            </div>
            <ToggleSwitch
              checked={designersOnly}
              ariaLabel="Exibir aviso somente para designers"
              onClick={() => {
                setDesignersOnly((atual) => !atual);
                setAudienceUserIds([]);
              }}
            />
          </div>
        </section>

        {(organizationId || designersOnly) && (
          <SeletorDeDestinatarios
            usuarios={
              organizationId
                ? designersOnly
                  ? usuarios.filter((usuario) => usuario.role === 'DESIGNER')
                  : usuarios
                : designers
            }
            selecionados={audienceUserIds}
            carregando={organizationId ? carregandoUsuarios : carregandoDesigners}
            designersOnly={designersOnly}
            organizationSelected={Boolean(organizationId)}
            onChange={setAudienceUserIds}
          />
        )}

        {tipo === 'CARD' ? (
          <div className="space-y-5">
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wide">
                  Aviso
                </label>
                <span
                  className={`text-xs ${
                    markdown.length > MAXIMO_DE_CARACTERES ? 'text-red-400' : 'text-zinc-600'
                  }`}
                >
                  {markdown.length}/{MAXIMO_DE_CARACTERES}
                </span>
              </div>
              <textarea
                value={markdown}
                onChange={(e) => setMarkdown(e.target.value)}
                rows={6}
                placeholder={'## Nova pauta disponível\n\nRevise os conteúdos da próxima campanha e envie sua aprovação pelo SocialFlow.'}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-primary/50 resize-y"
              />
              <p className="text-xs text-zinc-600">
                Aceita markdown: <code>**negrito**</code>, <code>*itálico*</code>,{' '}
                <code>## título</code>, listas e links.
              </p>
            </div>

            <EditorDeBadges badges={badges} onChange={setBadges} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SeletorDeCor rotulo="Cor do card" valor={corDeFundo} onChange={setCorDeFundo} />
              <SeletorDeCor rotulo="Cor do texto" valor={corDoTexto} onChange={setCorDoTexto} />
            </div>

            <section className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.025] p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-zinc-400">
                    <ArrowRight className="h-3.5 w-3.5 text-primary" />
                    Botão Ver mais
                  </span>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-600">
                    Opcional. Quando ativado, o aviso completo abre por este botão, mesmo se o texto for curto.
                  </p>
                </div>
                <ToggleSwitch
                  checked={showMoreEnabled}
                  ariaLabel="Exibir botão Ver mais"
                  onClick={() => setShowMoreEnabled((atual) => !atual)}
                />
              </div>

              {showMoreEnabled && (
                <div className="grid grid-cols-1 gap-4 border-t border-white/5 pt-4 sm:grid-cols-3">
                  <SeletorDeCor
                    rotulo="Cor do botão Ver mais"
                    valor={showMoreBackgroundColor}
                    onChange={setShowMoreBackgroundColor}
                  />
                  <SeletorDeCor
                    rotulo="Cor do texto Ver mais"
                    valor={showMoreTextColor}
                    onChange={setShowMoreTextColor}
                  />
                  <SeletorDeCor
                    rotulo="Cor do ícone Ver mais"
                    valor={showMoreIconColor}
                    onChange={setShowMoreIconColor}
                  />
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-zinc-400">
                    <Download className="h-3.5 w-3.5 text-primary" />
                    Botão Instalar SocialFlow
                  </span>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-600">
                    Adiciona ao card uma ação exclusiva para instalar o SocialFlow neste dispositivo.
                  </p>
                  <span className="mt-3 inline-flex items-center gap-2 rounded-lg bg-brand-gradient px-3 py-2 text-[11px] font-bold text-white shadow-lg">
                    <Download className="h-3.5 w-3.5" />
                    Gradiente oficial do SocialFlow
                  </span>
                </div>
                <ToggleSwitch
                  checked={installButtonEnabled}
                  ariaLabel="Exibir botão Instalar SocialFlow"
                  onClick={() => setInstallButtonEnabled((atual) => !atual)}
                />
              </div>
            </section>

            <div className="space-y-2">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wide">
                Como vai ficar
              </span>
              <MuralItemCard
                item={{
                  id: 'previa',
                  type: 'CARD',
                  organizationId: organizacaoSelecionada?.id ?? null,
                  organizationName: organizacaoSelecionada?.name ?? null,
                  organizationLogoUrl: organizacaoSelecionada?.logoUrl ?? null,
                  audienceCount: audienceUserIds.length,
                  imageUrl: null,
                  markdown: markdown || '_O aviso do SocialFlow aparece aqui conforme você escreve._',
                  backgroundColor: corDeFundo,
                  textColor: corDoTexto,
                  showMoreEnabled,
                  showMoreBackgroundColor,
                  showMoreTextColor,
                  showMoreIconColor,
                  installButtonEnabled,
                  designersOnly,
                  badges: badges.filter((badge) => badge.label.trim().length > 0),
                  createdAt: '',
                }}
                showOrganizationBadge={Boolean(organizacaoSelecionada)}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                void aoEscolherArquivo(e.target.files?.[0]);
                e.target.value = '';
              }}
            />

            {imagemEscolhida ? (
              <>
                <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black/40">
                  <Cropper
                    image={imagemEscolhida}
                    crop={crop}
                    zoom={zoom}
                    // 16/9 fixo: é o formato que o card de texto também ocupa.
                    aspect={16 / 9}
                    onCropChange={setCrop}
                    onZoomChange={setZoom}
                    onCropComplete={(_, pixels) => setArea(pixels)}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={1}
                    max={3}
                    step={0.01}
                    value={zoom}
                    onChange={(e) => setZoom(Number(e.target.value))}
                    aria-label="Aproximar"
                    className="flex-1 accent-primary"
                  />
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="text-xs font-bold text-zinc-400 hover:text-white transition-colors shrink-0"
                  >
                    Trocar imagem
                  </button>
                </div>
              </>
            ) : item?.imageUrl ? (
              <div className="space-y-3">
                <div className="relative w-full aspect-video overflow-hidden rounded-2xl border border-white/10 bg-black/40">
                  <img
                    src={item.imageUrl}
                    alt="Imagem atual do aviso"
                    className="h-full w-full object-cover"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-zinc-300 transition-colors hover:border-primary/40 hover:text-white"
                >
                  <Upload className="h-4 w-4" />
                  Trocar imagem
                </button>
                <p className="text-center text-[11px] text-zinc-600">
                  Se não escolher outra imagem, a atual será mantida.
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="w-full bg-white/5 border-2 border-dashed border-white/10 hover:border-primary/40 hover:bg-white/[0.07] rounded-2xl px-4 py-12 text-center transition-all"
              >
                <Upload className="w-6 h-6 text-zinc-600 mx-auto mb-2" />
                <span className="text-sm text-zinc-400 block font-medium">
                  Escolher imagem
                </span>
                <span className="text-xs text-zinc-600 block mt-1">
                  16:9 · recomendado 1280×720 · mínimo 800×450 · até 5 MB
                </span>
              </button>
            )}
          </div>
        )}

        {erro && (
          <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl py-2.5 px-3">
            {erro}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={fechar}
            disabled={salvar.isPending}
            className="flex-1 py-3 rounded-xl font-bold text-zinc-400 hover:text-white hover:bg-white/5 transition-all text-sm disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => salvar.mutate()}
            disabled={!formularioPodeSerSalvo || salvar.isPending}
            className="flex-[2] bg-brand-gradient hover:opacity-90 py-3 rounded-xl font-bold transition-all shadow-[0_0_20px_oklch(var(--primary)/0.3)] disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2 text-sm"
          >
            {salvar.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {editando ? 'Salvando...' : 'Publicando...'}
              </>
            ) : (
              editando ? 'Salvar alterações' : 'Publicar no mural'
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function SeletorDeDestinatarios({
  usuarios,
  selecionados,
  carregando,
  designersOnly,
  organizationSelected,
  onChange,
}: {
  usuarios: MuralAudienceUser[];
  selecionados: string[];
  carregando: boolean;
  designersOnly: boolean;
  organizationSelected: boolean;
  onChange: (ids: string[]) => void;
}) {
  const alternar = (userId: string) => {
    onChange(
      selecionados.includes(userId)
        ? selecionados.filter((id) => id !== userId)
        : [...selecionados, userId],
    );
  };

  return (
    <section className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.025] p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-zinc-400">
            <Users className="h-3.5 w-3.5 text-primary" />
            Pessoas específicas (opcional)
          </span>
          <p className="mt-1 text-xs leading-relaxed text-zinc-600">
            {designersOnly
              ? organizationSelected
                ? 'Sem selecionar ninguém, todos os designers da organização verão o aviso.'
                : 'Sem selecionar ninguém, todos os designers do SocialFlow verão o aviso.'
              : 'Sem selecionar ninguém, todos os usuários da organização verão o aviso.'}
          </p>
        </div>

        {selecionados.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="shrink-0 text-xs font-bold text-zinc-500 transition-colors hover:text-white"
          >
            Limpar seleção
          </button>
        )}
      </div>

      {carregando ? (
        <div className="flex items-center gap-2 py-4 text-xs text-zinc-500" role="status">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          Carregando usuários da organização...
        </div>
      ) : usuarios.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/10 px-3 py-4 text-xs text-zinc-600">
          {designersOnly
            ? organizationSelected
              ? 'Nenhum designer ativo está vinculado a esta organização.'
              : 'Nenhum designer ativo foi encontrado no SocialFlow.'
            : 'Nenhum usuário ativo está vinculado a esta organização.'}
        </p>
      ) : (
        <>
          <p className="rounded-lg bg-black/20 px-3 py-2 text-xs text-zinc-400" role="status">
            {selecionados.length === 0
              ? designersOnly
                ? organizationSelected
                  ? `Todos os ${usuarios.length} designers da organização poderão ver.`
                  : `Todos os ${usuarios.length} designers do SocialFlow poderão ver.`
                : `Todos os ${usuarios.length} usuários da organização poderão ver.`
              : `Somente ${selecionados.length} ${selecionados.length === 1 ? 'pessoa poderá' : 'pessoas poderão'} ver.`}
          </p>

          <div className="max-h-52 space-y-1 overflow-y-auto pr-1" aria-label="Destinatários do aviso">
            {usuarios.map((usuario) => {
              const marcado = selecionados.includes(usuario.id);
              const nome = usuario.name?.trim() || usuario.email;

              return (
                <label
                  key={usuario.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
                    marcado
                      ? 'border-primary/40 bg-primary/10'
                      : 'border-transparent hover:border-white/10 hover:bg-white/[0.03]'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={marcado}
                    onChange={() => alternar(usuario.id)}
                    aria-label={`Selecionar ${nome}`}
                    className="h-4 w-4 shrink-0 accent-primary"
                  />

                  <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-gradient text-xs font-bold text-white">
                    {usuario.avatarUrl ? (
                      <img src={usuario.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      nome.charAt(0).toUpperCase()
                    )}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-zinc-200">{nome}</span>
                    <span className="block truncate text-[11px] text-zinc-600">{usuario.email}</span>
                  </span>

                  <span className="shrink-0 text-[10px] font-bold uppercase text-zinc-600">
                    {usuario.role === 'CLIENT' ? 'Cliente' : usuario.role === 'DESIGNER' ? 'Designer' : 'Admin'}
                  </span>
                </label>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}

function EditorDeBadges({
  badges,
  onChange,
}: {
  badges: MuralBadge[];
  onChange: (badges: MuralBadge[]) => void;
}) {
  const adicionar = () => {
    if (badges.length >= MAXIMO_DE_BADGES) return;
    const cor = CORES_DE_BADGE[badges.length % CORES_DE_BADGE.length];
    onChange([
      ...badges,
      {
        label: '',
        backgroundColor: cor.backgroundColor,
        textColor: cor.textColor,
      },
    ]);
  };

  const atualizar = (index: number, badge: MuralBadge) => {
    onChange(badges.map((atual, i) => (i === index ? badge : atual)));
  };

  return (
    <section className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.025] p-4">
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-zinc-400">
            <Tag className="w-3.5 h-3.5 text-primary" />
            Badges do aviso
          </span>
          <p className="text-xs text-zinc-600 mt-1">
            Marcações curtas que aparecem antes do título.
          </p>
        </div>
        <button
          type="button"
          onClick={adicionar}
          disabled={badges.length >= MAXIMO_DE_BADGES}
          className="inline-flex w-full shrink-0 items-center justify-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-zinc-300 transition-colors hover:border-primary/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-35 sm:w-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          Adicionar badge
        </button>
      </div>

      {badges.length === 0 ? (
        <button
          type="button"
          onClick={adicionar}
          className="w-full rounded-xl border border-dashed border-white/10 py-4 text-xs text-zinc-600 transition-colors hover:border-primary/30 hover:text-zinc-400"
        >
          Nenhuma badge. Use uma para destacar status, canal ou prazo da publicação.
        </button>
      ) : (
        <div className="space-y-3">
          {badges.map((badge, index) => (
            <div
              key={index}
              className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 rounded-xl border border-white/5 bg-black/20 p-3"
            >
              <div className="space-y-2 min-w-0">
                <div className="space-y-1">
                  <input
                    type="text"
                    value={badge.label}
                    maxLength={40}
                    onChange={(e) => atualizar(index, { ...badge, label: e.target.value })}
                    aria-label={`Texto da badge ${index + 1}`}
                    placeholder={index === 0 ? 'Ex.: Aprovação pendente' : 'Ex.: Publica hoje'}
                    className={`w-full min-w-0 rounded-lg border bg-black/30 px-3 py-2 text-sm text-white placeholder:text-zinc-700 focus:outline-none ${
                      badge.label.trim().length === 0
                        ? 'border-amber-500/30 focus:border-amber-500/60'
                        : 'border-white/10 focus:border-primary/50'
                    }`}
                  />
                  <span className="block text-right text-[10px] tabular-nums text-zinc-700">
                    {badge.label.length}/40
                  </span>
                </div>

                <div className="flex flex-wrap gap-2" aria-label={`Cor da badge ${index + 1}`}>
                  {CORES_DE_BADGE.map((cor) => {
                    const selecionada =
                      badge.backgroundColor === cor.backgroundColor && badge.textColor === cor.textColor;
                    return (
                      <button
                        key={cor.nome}
                        type="button"
                        onClick={() =>
                          atualizar(index, {
                            ...badge,
                            backgroundColor: cor.backgroundColor,
                            textColor: cor.textColor,
                          })
                        }
                        aria-label={`Usar badge ${cor.nome.toLowerCase()}`}
                        aria-pressed={selecionada}
                        title={cor.nome}
                        className={`h-7 min-w-7 rounded-md border px-2 text-[10px] font-bold transition-transform hover:scale-105 ${
                          selecionada ? 'ring-2 ring-primary ring-offset-2 ring-offset-zinc-950' : 'border-white/15'
                        }`}
                        style={{ backgroundColor: cor.backgroundColor, color: cor.textColor }}
                      >
                        Aa
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="button"
                onClick={() => onChange(badges.filter((_, i) => i !== index))}
                aria-label={`Remover badge ${index + 1}`}
                title="Remover badge"
                className="self-start rounded-lg p-2 text-zinc-600 transition-colors hover:bg-red-500/10 hover:text-red-400"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          <p className="text-[11px] text-zinc-700">
            {badges.length}/{MAXIMO_DE_BADGES} badges
          </p>
        </div>
      )}
    </section>
  );
}

function SeletorDeCor({
  rotulo,
  valor,
  onChange,
}: {
  rotulo: string;
  valor: string;
  onChange: (cor: string) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-bold text-zinc-400 uppercase tracking-wide">{rotulo}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          aria-label={rotulo}
          className="w-10 h-10 rounded-lg border border-white/10 bg-transparent cursor-pointer shrink-0"
        />
        <input
          type="text"
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 min-w-0 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-primary/50"
        />
      </div>
      <div className="flex gap-1.5 flex-wrap">
        {CORES_SUGERIDAS.map((cor) => (
          <button
            key={cor}
            type="button"
            onClick={() => onChange(cor)}
            aria-label={`Usar ${cor}`}
            style={{ backgroundColor: cor }}
            className="w-6 h-6 rounded-md border border-white/20 transition-transform hover:scale-110"
          />
        ))}
      </div>
    </div>
  );
}
