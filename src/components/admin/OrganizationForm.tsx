import React, { useState } from 'react';
import { X } from 'lucide-react';

interface OrganizationFormProps {
  organization?: {
    id: string;
    name: string;
    eventbrite_id: string;
  };
  onSubmit: (data: { name: string; eventbrite_id: string }) => Promise<void>;
  onCancel: () => void;
}

export function OrganizationForm({ organization, onSubmit, onCancel }: OrganizationFormProps) {
  const [name, setName] = useState(organization?.name || '');
  const [eventbriteId, setEventbriteId] = useState(organization?.eventbrite_id || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await onSubmit({ name, eventbrite_id: eventbriteId });
      onCancel(); // Close form on success
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-ocean/60 backdrop-blur-sm overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border border-sky/20 w-96 shadow-lg rounded-lg bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-display font-bold text-ocean">
            {organization ? 'Edit Organization' : 'Add New Organization'}
          </h3>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mb-4 bg-rock/10 border border-rock/30 text-rock px-3 py-2 rounded text-sm">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-medium text-ocean mb-2">
              Organization Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-netting focus:border-netting"
              placeholder="e.g., Volta Labs"
            />
          </div>

          <div className="mb-6">
            <label htmlFor="eventbriteId" className="block text-sm font-medium text-ocean mb-2">
              Eventbrite ID
            </label>
            <input
              type="text"
              id="eventbriteId"
              value={eventbriteId}
              onChange={(e) => setEventbriteId(e.target.value)}
              required
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-netting focus:border-netting"
              placeholder="e.g., 123456789"
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-ocean bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-netting"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-kitchen border border-transparent rounded-md hover:bg-kitchen/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-kitchen disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}