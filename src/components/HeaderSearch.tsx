import React, { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { trackEvent } from '../utils/gtm';

interface HeaderSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export function HeaderSearch({ value, onChange }: HeaderSearchProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [prevValue, setPrevValue] = useState('');
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isExpanded) {
      inputRef.current?.focus();
    }
  }, [isExpanded]);

  useEffect(() => {
    // Track search after user stops typing for 1 second
    if (value && value !== prevValue) {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      
      searchTimeoutRef.current = setTimeout(() => {
        trackEvent('search', { search_term: value });
        setPrevValue(value);
      }, 1000);
    }
    
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [value, prevValue]);

  const handleClose = () => {
    setIsExpanded(false);
    onChange('');
  };

  const handleClearSearch = () => {
    onChange('');
    trackEvent('clear_search');
  };

  return (
    <div className="relative flex items-center">
      <div
        className={`flex items-center transition-all duration-300 ease-in-out ${
          isExpanded ? 'w-64 md:w-96' : 'w-8'
        }`}
      >
        {!isExpanded ? (
          <button
            onClick={() => {
              setIsExpanded(true);
              trackEvent('open_search');
            }}
            className="p-1 hover:bg-sky/20 rounded-full"
            aria-label="Open search"
          >
            <Search className="h-6 w-6 text-white" />
          </button>
        ) : (
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-ocean" />
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Search events..."
              className="w-full pl-10 pr-10 py-2 border border-sky bg-white rounded-full focus:outline-none focus:ring-2 focus:ring-kitchen focus:border-transparent"
            />
            {value && (
              <button
                onClick={handleClearSearch}
                className="absolute right-8 top-1/2 transform -translate-y-1/2 p-1 hover:bg-sky/20 rounded-full"
                aria-label="Clear search"
              >
                <X className="h-4 w-4 text-ocean" />
              </button>
            )}
            <button
              onClick={() => {
                handleClose();
                trackEvent('close_search');
              }}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-sky/20 rounded-full"
              aria-label="Close search"
            >
              <X className="h-5 w-5 text-ocean" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}