import React from 'react';

interface EventTypeFilterProps {
  selectedEventTypes: string[];
  onSelectEventType: (type: string) => void;
}

export function EventTypeFilter({
  selectedEventTypes,
  onSelectEventType,
}: EventTypeFilterProps) {
  const eventTypes = ['In-Person', 'Virtual'];

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onSelectEventType('all')}
        className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-colors
          ${selectedEventTypes.length === 0
            ? 'bg-white text-ocean'
            : 'bg-white/50 text-ocean hover:bg-white/80'
          }`}
      >
        All
      </button>
      {eventTypes.map((type) => (
        <button
          key={type}
          onClick={() => onSelectEventType(type)}
          className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-colors
            ${selectedEventTypes.includes(type)
              ? 'bg-white text-ocean'
              : 'bg-white/50 text-ocean hover:bg-white/80'
            }`}
        >
          {type}
        </button>
      ))}
    </div>
  );
}