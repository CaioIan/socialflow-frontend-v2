import { useEffect, useRef, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image as ImageIcon, Loader2, Plus, Tag, Trash2, Type, Upload } from 'lucide-react';
import { Modal } from '@/shared/components/modal';
import { useToastStore } from '@/stores/use-toast-store';
import { organizationsService } from '@/features/organizations/api/organizations-service';
import { recortarImagem, RECORTE_MURAL } from '@/shared/lib/recortar-imagem';
import { muralService, type MuralBadge } from '../api/mural-service';
import { MuralItemCard } from './mural-item-card';

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
}

export function MuralItemModal({ isOpen, onClose }: Props) {
  const queryClient = useQueryClient();
  const { addToast } = useToastStore();
  const inputRef = useRef<HTMLInputElement>(null);

  const [tipo, setTipo] = useState<'CARD' | 'IMAGE'>('CARD');
  const [organizationId, setOrganizationId] = useState<string>('');
  const [markdown, setMarkdown] = useState('');
  const [corDeFundo, setCorDeFundo] = useState('#7c3aed');
  const [corDoTexto, setCorDoTexto] = useState('#ffffff');
  const [badges, setBadges] = useState<MuralBadge[]>([]);
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
        return await muralService.criarCard({
          markdown,
          backgroundColor: corDeFundo,
          textColor: corDoTexto,
          badges: badges.map((badge) => ({ ...badge, label: badge.label.trim() })),
          organizationId: org,
        });
      }

      if (!imagemEscolhida || !area) {
        throw new Error('Escolha uma imagem e ajuste o enquadramento');
      }

      // Recorta para 1280x720 antes de subir: o backend exige 16:9, e mandar o
      // original faria a validação recusar o que o usuário acabou de enquadrar.
      const recortada = await recortarImagem(imagemEscolhida, area, RECORTE_MURAL);
      return await muralService.criarImagem(recortada, org);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mural'] });
      addToast('Item publicado no mural.', 'success');
      fechar();
    },
    onError: (e) => setErro(e instanceof Error ? e.message : 'Não foi possível publicar'),
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
  const organizacaoSelecionada = organizacoes.find((org) => org.id === organizationId);

  return (
    <Modal isOpen={isOpen} onClose={() => !salvar.isPending && fechar()} title="Novo item do mural" className="max-w-3xl">
      <div className="space-y-6">
        {/* Tipo */}
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

        {/* Destino */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-zinc-400 uppercase tracking-wide">
            Quem vê este aviso
          </label>
          <select
            value={organizationId}
            onChange={(e) => setOrganizationId(e.target.value)}
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
                  imageUrl: null,
                  markdown: markdown || '_O aviso do SocialFlow aparece aqui conforme você escreve._',
                  backgroundColor: corDeFundo,
                  textColor: corDoTexto,
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
            disabled={!podeSalvar || salvar.isPending}
            className="flex-[2] bg-brand-gradient hover:opacity-90 py-3 rounded-xl font-bold transition-all shadow-[0_0_20px_oklch(var(--primary)/0.3)] disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2 text-sm"
          >
            {salvar.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Publicando...
              </>
            ) : (
              'Publicar no mural'
            )}
          </button>
        </div>
      </div>
    </Modal>
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
