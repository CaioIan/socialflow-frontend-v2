import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { campaignPlanningService, type PlanningStatus } from '../api/campaign-planning-service';
import { GlassCard } from '@/shared/components/glass-card';
import { useToastStore } from '@/stores/use-toast-store';
import {
  FileText,
  Send,
  CheckCircle,
  AlertCircle,
  Trash2,
  Loader2,
  Eye,
  Edit3,
  RefreshCw,
} from 'lucide-react';

interface CampaignPlanningPanelProps {
  campaignId: string;
  isAdmin: boolean;
}

const STATUS_CONFIG: Record<PlanningStatus, { label: string; color: string; bg: string; border: string }> = {
  DRAFT: { label: 'Rascunho', color: 'text-zinc-400', bg: 'bg-zinc-500/10', border: 'border-zinc-500/20' },
  AWAITING_APPROVAL: { label: 'Aguardando Aprovação', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  REVISION_REQUESTED: { label: 'Revisão Solicitada', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
  APPROVED: { label: 'Aprovado', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  POSTS_CREATED: { label: 'Posts Gerados', color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20' },
};

export function CampaignPlanningPanel({ campaignId, isAdmin }: CampaignPlanningPanelProps) {
  const queryClient = useQueryClient();
  const { addToast } = useToastStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editorContent, setEditorContent] = useState('');
  const [previewMode, setPreviewMode] = useState(false);
  const [revisionComment, setRevisionComment] = useState('');
  const [showRevisionInput, setShowRevisionInput] = useState(false);

  const { data: planning, isLoading } = useQuery({
    queryKey: ['campaign-planning', campaignId],
    queryFn: () => campaignPlanningService.get(campaignId),
  });

  const createMutation = useMutation({
    mutationFn: (content: string) => campaignPlanningService.create(campaignId, content),
    onSuccess: (data) => {
      queryClient.setQueryData(['campaign-planning', campaignId], data);
      setIsEditing(false);
      addToast('Planejamento salvo!', 'success');
    },
    onError: () => addToast('Erro ao salvar planejamento.', 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: (content: string) => campaignPlanningService.update(campaignId, content),
    onSuccess: (data) => {
      queryClient.setQueryData(['campaign-planning', campaignId], data);
      setIsEditing(false);
      addToast('Planejamento atualizado!', 'success');
    },
    onError: () => addToast('Erro ao atualizar planejamento.', 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => campaignPlanningService.delete(campaignId),
    onSuccess: () => {
      queryClient.setQueryData(['campaign-planning', campaignId], null);
      addToast('Planejamento excluído.', 'success');
    },
    onError: () => addToast('Erro ao excluir planejamento.', 'error'),
  });

  const submitMutation = useMutation({
    mutationFn: () => campaignPlanningService.submit(campaignId),
    onSuccess: (data) => {
      queryClient.setQueryData(['campaign-planning', campaignId], data);
      addToast('Enviado para aprovação do cliente!', 'success');
    },
    onError: () => addToast('Erro ao enviar para aprovação.', 'error'),
  });

  const approveMutation = useMutation({
    mutationFn: () => campaignPlanningService.approve(campaignId),
    onSuccess: (data) => {
      queryClient.setQueryData(['campaign-planning', campaignId], data);
      addToast('Planejamento aprovado! Posts serão gerados automaticamente.', 'success');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Erro ao aprovar planejamento.';
      addToast(msg, 'error');
    },
  });

  const revisionMutation = useMutation({
    mutationFn: (comment?: string) => campaignPlanningService.requestRevision(campaignId, comment),
    onSuccess: (data) => {
      queryClient.setQueryData(['campaign-planning', campaignId], data);
      setShowRevisionInput(false);
      setRevisionComment('');
      addToast('Revisão solicitada ao administrador.', 'success');
    },
    onError: () => addToast('Erro ao solicitar revisão.', 'error'),
  });

  const handleStartEditing = () => {
    setEditorContent(planning?.content ?? '');
    setIsEditing(true);
    setPreviewMode(false);
  };

  const handleSave = () => {
    const content = editorContent.trim();
    if (!content) return;
    if (planning) {
      updateMutation.mutate(content);
    } else {
      createMutation.mutate(content);
    }
  };

  const canEdit =
    isAdmin &&
    (!planning || planning.status === 'DRAFT' || planning.status === 'REVISION_REQUESTED' || planning.status === 'AWAITING_APPROVAL');

  const canSubmit = isAdmin && planning?.status === 'DRAFT';
  const canResubmit = isAdmin && planning?.status === 'REVISION_REQUESTED';
  const canDelete = isAdmin && !!planning;
  const canApprove = !isAdmin && planning?.status === 'AWAITING_APPROVAL';
  const canRequestRevision = !isAdmin && planning?.status === 'AWAITING_APPROVAL';

  if (isLoading) {
    return (
      <GlassCard className="p-8 flex items-center justify-center gap-3 text-zinc-500">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        <span className="text-sm">Carregando planejamento...</span>
      </GlassCard>
    );
  }

  if (!planning && !isAdmin) {
    return (
      <GlassCard className="p-12 text-center">
        <FileText className="w-10 h-10 text-zinc-700 mx-auto mb-4" />
        <p className="text-zinc-500 text-sm">Nenhum planejamento disponível para esta campanha ainda.</p>
      </GlassCard>
    );
  }

  if (!planning && isAdmin) {
    if (!isEditing) {
      return (
        <GlassCard className="p-12 text-center border-dashed">
          <FileText className="w-10 h-10 text-zinc-700 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-zinc-300 mb-2">Nenhum planejamento cadastrado</h3>
          <p className="text-zinc-500 text-sm mb-6">Escreva o planejamento da campanha em Markdown.</p>
          <button
            onClick={handleStartEditing}
            className="inline-flex items-center gap-2 bg-brand-gradient hover:opacity-90 px-6 py-3 rounded-2xl font-bold text-sm transition-all shadow-[0_0_20px_oklch(var(--primary)/0.3)]"
          >
            <Edit3 className="w-4 h-4" />
            Criar Planejamento
          </button>
        </GlassCard>
      );
    }
  }

  return (
    <GlassCard className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-gradient flex items-center justify-center text-white shadow-[0_0_15px_oklch(var(--primary)/0.3)]">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-white">Planejamento da Campanha</h3>
            {planning && (
              <div className={`inline-flex items-center gap-1.5 mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${STATUS_CONFIG[planning.status].bg} ${STATUS_CONFIG[planning.status].color} ${STATUS_CONFIG[planning.status].border}`}>
                {planning.status === 'AWAITING_APPROVAL' && <AlertCircle className="w-3 h-3" />}
                {planning.status === 'APPROVED' && <CheckCircle className="w-3 h-3" />}
                {STATUS_CONFIG[planning.status].label}
              </div>
            )}
          </div>
        </div>

        {/* Admin action buttons (not in editing mode) */}
        {isAdmin && !isEditing && planning && (
          <div className="flex items-center gap-2 flex-wrap">
            {canEdit && (
              <button
                onClick={handleStartEditing}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all text-xs font-bold"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Editar
              </button>
            )}
            {(canSubmit || canResubmit) && (
              <button
                onClick={() => submitMutation.mutate()}
                disabled={submitMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 hover:text-amber-300 border border-amber-500/30 transition-all text-xs font-bold disabled:opacity-50"
              >
                {submitMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                {canResubmit ? 'Reenviar para Aprovação' : 'Enviar para Aprovação'}
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => {
                  if (window.confirm('Excluir este planejamento? Esta ação não pode ser desfeita.')) {
                    deleteMutation.mutate();
                  }
                }}
                disabled={deleteMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 transition-all text-xs font-bold disabled:opacity-50"
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                Excluir
              </button>
            )}
          </div>
        )}
      </div>

      {/* Editor Mode (Admin) */}
      {isEditing ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <button
              onClick={() => setPreviewMode(false)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${!previewMode ? 'bg-primary/20 text-primary' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <Edit3 className="w-3 h-3" />
              Editar
            </button>
            <button
              onClick={() => setPreviewMode(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${previewMode ? 'bg-primary/20 text-primary' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <Eye className="w-3 h-3" />
              Preview
            </button>
          </div>

          {previewMode ? (
            <div className="min-h-[300px] bg-white/2 border border-white/5 rounded-2xl p-6 prose-planning">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{editorContent || '*Sem conteúdo*'}</ReactMarkdown>
            </div>
          ) : (
            <textarea
              value={editorContent}
              onChange={(e) => setEditorContent(e.target.value)}
              placeholder="# Planejamento de Conteúdo — Junho 2026&#10;&#10;## Objetivos&#10;&#10;- Aumentar engajamento em 20%&#10;..."
              className="w-full min-h-[300px] bg-white/2 border border-white/5 rounded-2xl p-5 text-sm text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono leading-relaxed resize-y transition-all"
            />
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setIsEditing(false)}
              className="flex-1 py-2.5 rounded-xl font-bold text-zinc-400 hover:text-white hover:bg-white/5 transition-all text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending || !editorContent.trim()}
              className="flex-[2] bg-brand-gradient hover:opacity-90 py-2.5 rounded-xl font-bold transition-all shadow-[0_0_20px_oklch(var(--primary)/0.3)] disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
            >
              {(createMutation.isPending || updateMutation.isPending) ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Planejamento'
              )}
            </button>
          </div>
        </div>
      ) : (
        planning && (
          <div className="bg-white/2 border border-white/5 rounded-2xl p-6 prose-planning">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{planning.content}</ReactMarkdown>
          </div>
        )
      )}

      {/* Client approval actions */}
      {!isAdmin && planning && (
        <div className="pt-4 border-t border-white/5">
          {planning.status === 'AWAITING_APPROVAL' && (
            <div className="space-y-4">
              {showRevisionInput ? (
                <div className="space-y-3">
                  <textarea
                    value={revisionComment}
                    onChange={(e) => setRevisionComment(e.target.value)}
                    placeholder="Descreva as alterações necessárias..."
                    rows={3}
                    className="w-full bg-white/2 border border-white/5 rounded-xl p-4 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => { setShowRevisionInput(false); setRevisionComment(''); }}
                      className="flex-1 py-2.5 rounded-xl font-bold text-zinc-400 hover:text-white hover:bg-white/5 transition-all text-sm"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => revisionMutation.mutate(revisionComment || undefined)}
                      disabled={revisionMutation.isPending}
                      className="flex-[2] bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border border-orange-500/30 py-2.5 rounded-xl font-bold transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {revisionMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                      Confirmar Solicitação
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-3">
                  {canApprove && (
                    <button
                      onClick={() => approveMutation.mutate()}
                      disabled={approveMutation.isPending}
                      className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black px-6 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-[0_0_25px_rgba(16,185,129,0.2)] disabled:opacity-50"
                    >
                      {approveMutation.isPending ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <CheckCircle className="w-5 h-5" />
                      )}
                      Aprovar Planejamento
                    </button>
                  )}
                  {canRequestRevision && (
                    <button
                      onClick={() => setShowRevisionInput(true)}
                      className="flex-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 px-6 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all"
                    >
                      <AlertCircle className="w-5 h-5" />
                      Solicitar Revisão
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {planning.status === 'APPROVED' && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center justify-center gap-3 text-emerald-400">
              <CheckCircle className="w-5 h-5" />
              <span className="font-bold text-sm uppercase tracking-wider">Planejamento aprovado!</span>
            </div>
          )}

          {planning.status === 'REVISION_REQUESTED' && (
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4 flex items-center justify-center gap-3 text-orange-400">
              <RefreshCw className="w-5 h-5" />
              <span className="font-bold text-sm uppercase tracking-wider">Revisão solicitada — aguardando correções</span>
            </div>
          )}

          {planning.status === 'POSTS_CREATED' && (
            <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 flex items-center justify-center gap-3 text-primary">
              <CheckCircle className="w-5 h-5" />
              <span className="font-bold text-sm uppercase tracking-wider">Posts gerados automaticamente!</span>
            </div>
          )}
        </div>
      )}

      {/* Admin status banners for non-editable states */}
      {isAdmin && !isEditing && planning && planning.status === 'AWAITING_APPROVAL' && (
        <div className="pt-4 border-t border-white/5">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-center gap-3 text-amber-400">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm font-medium">Aguardando aprovação do cliente. Você pode editar o conteúdo, mas precisará reenviar para aprovação.</p>
          </div>
        </div>
      )}

      {isAdmin && !isEditing && planning && planning.status === 'REVISION_REQUESTED' && (
        <div className="pt-4 border-t border-white/5">
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-3 text-orange-400">
              <RefreshCw className="w-5 h-5 shrink-0" />
              <p className="text-sm font-medium">O cliente solicitou revisão. Edite o planejamento e reenvie para aprovação.</p>
            </div>
            {planning.revisionComment && (
              <div className="ml-8 bg-orange-500/10 border border-orange-500/20 rounded-xl p-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-orange-500 mb-1">Mensagem do cliente</p>
                <p className="text-sm text-orange-200 leading-relaxed whitespace-pre-wrap">{planning.revisionComment}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </GlassCard>
  );
}
