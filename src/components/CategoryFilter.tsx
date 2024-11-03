import React from 'react';
import { Check } from 'lucide-react';
import { Organization } from '../types';

interface CategoryFilterProps {
  organizations?: Organization[];
  selectedOrganizations: string[];
  onOrganizationChange: (organizationId: string) => void;
}

export function CategoryFilter({
  organizations = [],
  selectedOrganizations,
  onOrganizationChange,
}: CategoryFilterProps) {
  if (!organizations || organizations.length === 0) {
    return null;
  }

  const sortedOrganizations = [...organizations].sort((a, b) => {
    if (!a.name || !b.name) return 0;
    return a.name.localeCompare(b.name);
  });

  const handleAllClick = () => {
    if (selectedOrganizations.length === organizations.length) {
      // If all are selected, deselect all
      organizations.forEach(org => onOrganizationChange(org.id));
    } else {
      // If not all are selected, select all
      organizations.forEach(org => {
        if (!selectedOrganizations.includes(org.id)) {
          onOrganizationChange(org.id);
        }
      });
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleAllClick}
          className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-colors
            ${selectedOrganizations.length === organizations.length
              ? 'bg-indigo-100 text-indigo-800'
              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            }`}
        >
          {selectedOrganizations.length === organizations.length ? (
            <Check className="w-4 h-4 mr-1" />
          ) : null}
          All
        </button>
        {sortedOrganizations.map((org) => (
          <button
            key={org.id}
            onClick={() => onOrganizationChange(org.id)}
            className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-colors
              ${selectedOrganizations.includes(org.id)
                ? 'bg-indigo-100 text-indigo-800'
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              }`}
          >
            {selectedOrganizations.includes(org.id) && (
              <Check className="w-4 h-4 mr-1" />
            )}
            {org.name || 'Unknown Organization'}
          </button>
        ))}
      </div>
    </div>
  );
}