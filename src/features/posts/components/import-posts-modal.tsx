import * as React from 'react';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/shared/components/modal';
import { postsService, type ImportPostsResult } from '../api/posts-service';
import { Loader2, Download, Upload, FileSpreadsheet, CheckCircle2, AlertTriangle } from 'lucide-react';

interface ImportPostsModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignId: string;
}

export function ImportPostsModal({ isOpen, onClose, campaignId }: ImportPostsModalProps) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportPostsResult | null>(null);

  const mutation = useMutation({
    mutationFn: (selectedFile: File) => postsService.importPosts(campaignId, selectedFile),
    onSuccess: (data) => {
      setResult(data);
      if (data.created > 0) {
        queryClient.invalidateQueries({ queryKey: ['posts', campaignId] });
      }
    },
  });

  const handleClose = () => {
    setFile(null);
    setResult(null);
    mutation.reset();
    onClose();
  };

  const handleDownloadTemplate = async () => {
    const blob = await postsService.downloadImportTemplate();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'modelo-importacao-posts.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setResult(null);
    setFile(e.target.files?.[0] ?? null);
  };

  const handleSubmit = () => {
    if (file) mutation.mutate(file);
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Importar Posts" className="max-w-lg w-full">
      <div className="space-y-5">
        <p className="text-sm text-zinc-500">
          Envie um arquivo .csv ou .json com os posts da campanha. Use o modelo abaixo como referência
          de colunas (data, hora, legenda e briefing).
        </p>

        <button
          type="button"
          onClick={handleDownloadTemplate}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm border border-white/10 text-zinc-300 hover:text-white hover:bg-white/5 transition-all"
        >
          <Download className="w-4 h-4" />
          Baixar modelo (.csv)
        </button>

        <div className="space-y-2">
          <label htmlFor="importFile" className="text-sm font-medium text-zinc-400 flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4" />
            Arquivo (.csv ou .json)
          </label>
          <input
            id="importFile"
            type="file"
            accept=".csv,.json"
            onChange={handleFileChange}
            className="w-full text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-white/5 file:text-zinc-300 hover:file:bg-white/10 file:transition-all bg-white/5 border border-white/10 rounded-xl px-4 py-3"
          />
        </div>

        {mutation.isError && (
          <p className="text-xs text-red-400 text-center">
            Erro ao importar arquivo. Verifique o formato e tente novamente.
          </p>
        )}

        {result && (
          <div className="space-y-3 bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-2 text-sm text-emerald-400 font-bold">
              <CheckCircle2 className="w-4 h-4" />
              {result.created} de {result.totalRows} posts criados com sucesso.
            </div>

            {result.errors.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-amber-400 font-bold">
                  <AlertTriangle className="w-4 h-4" />
                  {result.errors.length} linha(s) com erro:
                </div>
                <ul className="text-xs text-zinc-400 space-y-1 max-h-40 overflow-y-auto pl-6 list-disc">
                  {result.errors.map((error, index) => (
                    <li key={`${error.row}-${index}`}>
                      Linha {error.row}: {error.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3 pt-4 border-t border-white/5">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 py-3 rounded-xl font-bold text-zinc-400 hover:text-white hover:bg-white/5 transition-all text-sm"
          >
            {result ? 'Fechar' : 'Cancelar'}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!file || mutation.isPending}
            className="flex-[2] bg-brand-gradient hover:opacity-90 py-3 rounded-xl font-bold transition-all shadow-[0_0_20px_oklch(var(--primary)/0.3)] disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Importar
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
