import type { PostsByStatus } from '../api/dashboard-service';

interface PostStatusChartProps {
  data: PostsByStatus;
}

const statusConfig = {
  PENDING: { label: 'Pendentes', color: 'bg-orange-500', bgLight: 'bg-orange-50' },
  ALTERATION_REQUESTED: { label: 'Alteração Solicitada', color: 'bg-yellow-500', bgLight: 'bg-yellow-50' },
  APPROVED: { label: 'Aprovados', color: 'bg-green-500', bgLight: 'bg-green-50' },
  CANCELLED: { label: 'Cancelados', color: 'bg-gray-500', bgLight: 'bg-gray-50' },
};

export function PostStatusChart({ data }: PostStatusChartProps) {
  const total = data.PENDING + data.ALTERATION_REQUESTED + data.APPROVED + data.CANCELLED;
  
  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-80 rounded-lg border border-gray-200 bg-gray-50">
        <p className="text-gray-500">Nenhum post para exibir</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 backdrop-blur-sm">
      <h3 className="mb-6 text-lg font-semibold text-gray-900">Posts por Status</h3>
      
      <div className="space-y-4">
        {Object.entries(data).map(([status, count]) => {
          const config = statusConfig[status as keyof PostsByStatus];
          const percentage = total > 0 ? (count / total) * 100 : 0;
          
          return (
            <div key={status} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">{config.label}</span>
                <span className="text-sm font-bold text-gray-900">{count}</span>
              </div>
              <div className="w-full h-8 rounded-lg bg-gray-100 overflow-hidden">
                <div
                  className={`h-full ${config.color} transition-all duration-300 flex items-center justify-end pr-2`}
                  style={{ width: `${percentage}%` }}
                >
                  {percentage > 10 && (
                    <span className="text-xs font-bold text-white">{Math.round(percentage)}%</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500">Total: <span className="font-bold text-gray-900">{total}</span> posts</p>
      </div>
    </div>
  );
}
