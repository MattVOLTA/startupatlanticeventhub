import React from 'react';
import { Organization } from '../types/database';

interface OrganizationFilterProps {
  organizations: Organization[];
  selectedOrganizations: string[];
  onSelectOrganization: (orgId: string) => void;
}

export function OrganizationFilter({
  organizations,
  selectedOrganizations,
  onSelectOrganization,
}: OrganizationFilterProps) {
  const sortedOrganizations = [...organizations].sort((a, b) => 
    a.name.localeCompare(b.name)
  );

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onSelectOrganization('all')}
        className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-colors
          ${selectedOrganizations.includes('all')
            ? 'bg-white text-ocean'
            : 'bg-white/50 text-ocean hover:bg-white/80'
          }`}
      >
        All
      </button>
      {sortedOrganizations.map((org) => (
        <button
          key={org.id}
          onClick={() => onSelectOrganization(org.id)}
          className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-colors
            ${selectedOrganizations.includes(org.id)
              ? 'bg-white text-ocean'
              : 'bg-white/50 text-ocean hover:bg-white/80'
            }`}
        >
          {org.name}
        </button>
      ))}
    </div>
  );
}