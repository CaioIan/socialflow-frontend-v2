import * as React from 'react';
import { useState } from 'react';
import { useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/shared/components/modal';
import api from '@/api/axios';
import { Loader2, Upload, CheckCircle, AlertTriangle } from 'lucide-react';

interface ReplaceAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  assetId?: string;
  currentAssetUrl?: string; // Fallback: search by URL if assetId not available
  assetType: 'FEED' | 'STORIES';
  postId: string;
  campaignId: string;
  orgId: string;
  currentImageUrl?: string;
}

export function ReplaceAssetModal({
  isOpen,
  onClose,
  assetId: initialAssetId,
  currentAssetUrl,
  assetType,
  postId,
  campaignId,
  orgId,
  currentImageUrl,
}: ReplaceAssetModalProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isResolvingId, setIsResolvingId] = useState(false);
  const [resolvedAssetId, setResolvedAssetId] = useState<string | null>(
    initialAssetId && isValidUUID(initialAssetId) ? initialAssetId : null
  );

  // Helper to validate UUID format
  function isValidUUID(id: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  }

  // Try to resolve assetId from URL if not provided
  React.useEffect(() => {
    if (!isOpen) return;

    console.log('Modal opened with:', { initialAssetId, currentAssetUrl, postId });

    // If initialAssetId is provided and is valid UUID, use it directly
    if (initialAssetId && isValidUUID(initialAssetId)) {
      console.log('Using provided asset ID:', initialAssetId);
      setResolvedAssetId(initialAssetId);
      return;
    }

    // Try to resolve from URL
    if (currentAssetUrl && !resolvedAssetId) {
      setIsResolvingId(true);
      console.log('Resolving asset from URL:', currentAssetUrl);
      
      api.get(`/posts/${postId}`)
        .then((response: any) => {
          const post = response.data;
          console.log('Post data received, assets:', post.assets);
          const foundAsset = post.assets?.find((a: any) => a.cloudinaryUrl === currentAssetUrl);
          console.log('Found asset:', foundAsset);
          if (foundAsset?.id && isValidUUID(foundAsset.id)) {
            console.log('Resolved valid asset ID:', foundAsset.id);
            setResolvedAssetId(foundAsset.id);
          } else {
            console.error('Found asset but invalid ID format:', foundAsset?.id);
            if (post.assets?.length === 0) {
              console.error('No assets found in post - backend may not be creating them');
            }
          }
        })
        .catch(err => console.error('Failed to resolve asset ID:', err))
        .finally(() => setIsResolvingId(false));
    }
  }, [isOpen]);

  const mutation = useMutation({
    mutationFn: async (file: File) => {
      if (!resolvedAssetId || !isValidUUID(resolvedAssetId)) {
        throw new Error(`Invalid asset ID: ${resolvedAssetId}`);
      }
      const formData = new FormData();
      formData.append('file', file);

      console.log('Uploading with asset ID:', resolvedAssetId);

      const response = await api.patch(`/assets/${resolvedAssetId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    },
    onSuccess: (data) => {
      console.log('Asset replaced successfully. Updating caches...', { campaignId, postId, resolvedAssetId });

      // Atualizar o cache da página de detalhes do post
      queryClient.setQueryData(['post', postId], (oldData: any) => {
        if (!oldData) return oldData;

        const updatedAssets = oldData.assets.map((asset: any) => 
          asset.id === resolvedAssetId ? { ...asset, cloudinaryUrl: data.cloudinaryUrl, createdAt: new Date().toISOString() } : asset
        );

        return { ...oldData, assets: updatedAssets };
      });

      // Atualizar o cache do grid de posts
      queryClient.setQueryData(['posts', orgId, campaignId], (oldData: any) => {
        console.log('Updating posts cache for campaignId:', campaignId, 'Old data:', oldData);
        if (!Array.isArray(oldData)) return oldData;

        const updated = oldData.map((post: any) => {
          if (post.id !== postId) return post;

          const updatedAssets = post.assets.map((asset: any) => 
            asset.id === resolvedAssetId ? { ...asset, cloudinaryUrl: data.cloudinaryUrl, createdAt: new Date().toISOString() } : asset
          );

          return { ...post, assets: updatedAssets };
        });
        console.log('Updated posts cache:', updated);
        return updated;
      });

      // Invalidar para garantir que dados "não-críticos" sejam atualizados em segundo plano
      queryClient.invalidateQueries({ queryKey: ['post', postId] });
      queryClient.invalidateQueries({ queryKey: ['posts', orgId, campaignId], refetchType: 'all' });

      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setPreview(null);
        setSelectedFile(null);
        onClose();
      }, 1500);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreview(url);
    }
  };

  const handleSubmit = () => {
    if (!resolvedAssetId || !isValidUUID(resolvedAssetId)) {
      alert('ID da arte ainda não foi resolvido. Aguarde um momento e tente novamente.');
      return;
    }
    if (selectedFile) {
      mutation.mutate(selectedFile);
    }
  };

  const handleClickUpload = () => {
    fileInputRef.current?.click();
  };

  const aspectRatio = assetType === 'FEED' ? 'aspect-square' : 'aspect-9/16';
  const label = assetType === 'FEED' ? 'Feed (1:1)' : 'Stories (9:16)';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Reuplocar ${label}`} className="max-w-2xl">
      {isSuccess ? (
        <div className="py-12 flex flex-col items-center justify-center space-y-4">
          <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center border border-emerald-500/30">
            <CheckCircle className="w-10 h-10 text-emerald-500" />
          </div>
          <h3 className="text-xl font-bold text-white">Arte Atualizada!</h3>
          <p className="text-zinc-500 text-sm">A imagem foi substituída com sucesso.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Info Box */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-400">Reuplocar Imagem</p>
              <p className="text-xs text-blue-300/80 mt-1">
                Selecione um novo arquivo para substituir. Visualize a mudança antes de confirmar.
              </p>
            </div>
          </div>

          {/* Horizontal Layout: Current vs New */}
          <div className="grid grid-cols-2 gap-4">
            {/* Left: Current Image */}
            {currentImageUrl && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Atual</label>
                <div className={`relative w-full ${aspectRatio} rounded-xl overflow-hidden border border-white/10 bg-white/2`}>
                  <img
                    src={currentImageUrl}
                    alt="Current"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}

            {/* Right: New Upload */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Nova</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                disabled={mutation.isPending}
              />

              {preview ? (
                <div className="relative group">
                  <div className={`relative w-full ${aspectRatio} rounded-xl overflow-hidden border-2 border-primary/50 bg-white/2`}>
                    <img
                      src={preview}
                      alt="New"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={handleClickUpload}
                        disabled={mutation.isPending}
                        className="text-white text-xs font-bold bg-black/60 px-3 py-1 rounded-full uppercase hover:bg-black/80 transition-colors disabled:opacity-50"
                      >
                        Trocar
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-500 mt-2 truncate">
                    {selectedFile?.name} ({((selectedFile?.size || 0) / 1024 / 1024).toFixed(2)} MB)
                  </p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleClickUpload}
                  disabled={mutation.isPending}
                  className="relative group w-full bg-white/5 border-2 border-dashed border-white/10 group-hover:border-primary/50 group-hover:bg-primary/5 rounded-xl px-4 py-8 text-center transition-all disabled:opacity-50"
                >
                  <Upload className="w-6 h-6 text-zinc-600 mx-auto mb-2 group-hover:scale-110 group-hover:text-primary transition-all" />
                  <span className="text-xs text-zinc-500 group-hover:text-primary transition-colors block">
                    Selecione arquivo
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={mutation.isPending}
              className="flex-1 py-3 rounded-xl font-bold text-zinc-400 hover:text-white hover:bg-white/5 transition-all text-sm disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!selectedFile || mutation.isPending || isResolvingId || !resolvedAssetId}
              className="flex-1 bg-primary hover:bg-primary/90 text-white py-3 rounded-xl font-bold transition-all shadow-[0_0_20px_oklch(var(--primary)/0.3)] disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2 text-sm"
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Atualizando...
                </>
              ) : isResolvingId ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Preparando...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Confirmar
                </>
              )}
            </button>
          </div>

          {mutation.isError && (
            <p className="text-xs text-red-400 text-center">
              Erro ao atualizar imagem. Verifique o arquivo e tente novamente.
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}
