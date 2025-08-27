import React from 'react';
import { Edit2, Trash2 } from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  eventbrite_id: string;
  created_at: string;
}

interface OrganizationListProps {
  organizations: Organization[];
  onEdit: (org: Organization) => void;
  onDelete: (org: Organization) => void;
}

export function OrganizationList({ organizations, onEdit, onDelete }: OrganizationListProps) {
  if (organizations.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No organizations found. Add your first organization to get started.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-sky/10">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-ocean uppercase tracking-wider">
              Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-ocean uppercase tracking-wider">
              Eventbrite ID
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-ocean uppercase tracking-wider">
              Created
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-ocean uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {organizations.map((org) => (
            <tr key={org.id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-ocean">
                {org.name}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {org.eventbrite_id}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {new Date(org.created_at).toLocaleDateString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <div className="flex space-x-2">
                  <button
                    onClick={() => onEdit(org)}
                    className="text-netting hover:text-netting/80"
                    title="Edit"
                  >
                    <Edit2 className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => onDelete(org)}
                    className="text-rock hover:text-rock/80"
                    title="Delete"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}