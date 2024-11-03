import React from 'react';
import { useInterests } from '../hooks/useInterests';

interface InterestFilterProps {
  selectedInterests: string[];
  onSelectInterest: (interestId: string) => void;
}

export function InterestFilter({
  selectedInterests,
  onSelectInterest,
}: InterestFilterProps) {
  const { interests, loading, error } = useInterests();

  if (loading) {
    return <div className="text-sm text-gray-500">Loading interests...</div>;
  }

  if (error) {
    return <div className="text-sm text-rock">Failed to load interests</div>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onSelectInterest('all')}
        className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-colors
          ${selectedInterests.length === 0
            ? 'bg-white text-ocean'
            : 'bg-white/50 text-ocean hover:bg-white/80'
          }`}
      >
        All
      </button>
      {interests.map((interest) => (
        <button
          key={interest.id}
          onClick={() => onSelectInterest(interest.id)}
          className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-colors
            ${selectedInterests.includes(interest.id)
              ? 'bg-white text-ocean'
              : 'bg-white/50 text-ocean hover:bg-white/80'
            }`}
        >
          {interest.name}
        </button>
      ))}
    </div>
  );
}