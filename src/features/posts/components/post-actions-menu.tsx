
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { MoreVertical, Edit2, Trash2 } from 'lucide-react';

interface PostActionsMenuProps {
  postId: string;
  onEdit: (postId: string) => void;
  onDelete: (postId: string) => void;
  isAdmin?: boolean;
}

export function PostActionsMenu({
  postId,
  onEdit,
  onDelete,
  isAdmin = false
}: PostActionsMenuProps) {
  // Só renderiza o menu se for admin
  if (!isAdmin) {
    return null;
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button 
          className="text-zinc-600 hover:text-white transition-colors p-1 hover:bg-white/5 rounded-lg"
          aria-label="Ações do post"
        >
          <MoreVertical className="w-5 h-5" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="z-50 min-w-45 bg-zinc-900 border border-white/10 rounded-lg shadow-xl overflow-hidden"
          sideOffset={8}
          align="end"
        >
          <DropdownMenu.Item
            onClick={() => onEdit(postId)}
            className="px-3 py-2 text-sm text-white hover:bg-primary/20 cursor-pointer flex items-center gap-2 transition-colors"
          >
            <Edit2 className="w-4 h-4" />
            Editar
          </DropdownMenu.Item>

          <DropdownMenu.Separator className="h-px bg-white/10" />

          <DropdownMenu.Item
            onClick={() => onDelete(postId)}
            className="px-3 py-2 text-sm text-red-400 hover:bg-red-500/20 cursor-pointer flex items-center gap-2 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Deletar
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
