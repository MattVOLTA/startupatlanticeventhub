import React from 'react';
import { Check } from 'lucide-react';
import { useLocations } from '../hooks/useLocations';

interface LocationFilterProps {
  selectedLocations: string[];
  onSelectLocation: (location: string) => void;
}

export function LocationFilter({
  selectedLocations,
  onSelectLocation,
}: LocationFilterProps) {
  const { locations, loading, error } = useLocations();

  if (loading) {
    return <div className="text-sm text-gray-500">Loading locations...</div>;
  }

  if (error) {
    return <div className="text-sm text-rock">Failed to load locations</div>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onSelectLocation('all')}
        className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-colors
          ${selectedLocations.length === 0
            ? 'bg-white text-ocean'
            : 'bg-white/50 text-ocean hover:bg-white/80'
          }`}
      >
        All
      </button>
      {locations.map((location) => (
        <button
          key={location}
          onClick={() => onSelectLocation(location)}
          className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-colors
            ${selectedLocations.includes(location)
              ? 'bg-white text-ocean'
              : 'bg-white/50 text-ocean hover:bg-white/80'
            }`}
        >
          {location}
        </button>
      ))}
    </div>
  );
}