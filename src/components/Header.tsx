import React from 'react';
import { HeaderSearch } from './HeaderSearch';
import { Logo } from './Logo';
import { Calendar, LayoutGrid } from 'lucide-react';

interface HeaderProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  viewMode: 'list' | 'calendar';
  onViewModeChange: (mode: 'list' | 'calendar') => void;
}

export function Header({ 
  searchValue, 
  onSearchChange, 
  viewMode, 
  onViewModeChange 
}: HeaderProps) {
  return (
    <header className="bg-ocean shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <div className="flex items-center gap-4">
              <Logo className="h-8 w-auto" />
              <h1 className="text-2xl font-semibold text-white hidden sm:block pt-[13px]">Event Hub</h1>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <HeaderSearch 
              value={searchValue}
              onChange={onSearchChange}
            />
            <button
              onClick={() => onViewModeChange(viewMode === 'list' ? 'calendar' : 'list')}
              className="p-2 text-white hover:bg-sky/20 rounded-full transition-colors"
              aria-label={`Switch to ${viewMode === 'list' ? 'calendar' : 'list'} view`}
            >
              {viewMode === 'list' ? (
                <Calendar className="w-6 h-6" />
              ) : (
                <LayoutGrid className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}