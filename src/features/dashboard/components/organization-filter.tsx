import type { Organization } from '../api/dashboard-service';

interface OrganizationFilterProps {
  organizations: Organization[];
  selectedId: string | undefined;
  onSelect: (id: string | undefined) => void;
}

export function OrganizationFilter({ organizations, selectedId, onSelect }: OrganizationFilterProps) {
  if (!organizations || organizations.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-4 bg-white rounded-lg border border-gray-200 p-4 backdrop-blur-sm">
      <label htmlFor="org-filter" className="font-medium text-gray-700 whitespace-nowrap">
        Filtrar por Organização:
      </label>
      <select
        id="org-filter"
        value={selectedId || ''}
        onChange={(e) => onSelect(e.target.value || undefined)}
        className="rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 flex-1"
      >
        <option value="">Todas as organizações</option>
        {organizations.map((org) => (
          <option key={org.id} value={org.id}>
            {org.name}
          </option>
        ))}
      </select>
    </div>
  );
}
