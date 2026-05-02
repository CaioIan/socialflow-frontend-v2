import { CheckCircle2 } from 'lucide-react';
import type { RecentApproval } from '../api/dashboard-service';

interface ApprovalTimelineProps {
  approvals: RecentApproval[];
  isLoading?: boolean;
}

export function ApprovalTimeline({ approvals, isLoading }: ApprovalTimelineProps) {
  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 backdrop-blur-sm">
        <h3 className="mb-6 text-lg font-semibold text-gray-900">Aprovações Recentes</h3>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-100 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!approvals || approvals.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 backdrop-blur-sm">
        <h3 className="mb-6 text-lg font-semibold text-gray-900">Aprovações Recentes</h3>
        <p className="text-center text-gray-500 py-8">Nenhuma aprovação recente</p>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 backdrop-blur-sm">
      <h3 className="mb-6 text-lg font-semibold text-gray-900">Aprovações Recentes</h3>
      <div className="space-y-4">
        {approvals.map((approval) => (
          <div key={approval.id} className="flex gap-4 pb-4 border-b border-gray-100 last:pb-0 last:border-0">
            <div className="mt-1">
              <CheckCircle2 className="text-emerald-500" size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{approval.campaignTitle}</p>
              <p className="text-sm text-gray-600">
                Aprovado por <span className="font-medium">{approval.approvedBy}</span>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {formatDate(approval.approvedAt)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
