import React from 'react';
import { Header } from './components/Header';
import CollapsibleFilters from './components/CollapsibleFilters';
import { useOrganizations } from './hooks/useOrganizations';
import { useEvents } from './hooks/useEvents';
import { EventCard } from './components/EventCard';
import { CalendarView } from './components/CalendarView';
import { useLocalStorage } from './hooks/useLocalStorage';

export default function App() {
  const [searchValue, setSearchValue] = useLocalStorage('searchValue', '');
  const [selectedOrgs, setSelectedOrgs] = useLocalStorage<string[]>('selectedOrgs', ['all']);
  const [selectedLocations, setSelectedLocations] = useLocalStorage<string[]>('selectedLocations', []);
  const [selectedInterests, setSelectedInterests] = useLocalStorage<string[]>('selectedInterests', []);
  const [selectedEventTypes, setSelectedEventTypes] = useLocalStorage<string[]>('selectedEventTypes', []);
  const [viewMode, setViewMode] = useLocalStorage<'list' | 'calendar'>('viewMode', 'list');
  
  const { organizations, loading: orgsLoading, error: orgsError } = useOrganizations();
  const { events, loading: eventsLoading, error: eventsError } = useEvents(
    selectedOrgs,
    selectedLocations,
    selectedInterests,
    selectedEventTypes
  );

  const handleOrgSelect = (orgId: string) => {
    if (orgId === 'all') {
      setSelectedOrgs(['all']);
    } else {
      const newSelected = selectedOrgs.includes('all') 
        ? [orgId]
        : selectedOrgs.includes(orgId)
          ? selectedOrgs.filter(id => id !== orgId)
          : [...selectedOrgs, orgId];
      setSelectedOrgs(newSelected.length ? newSelected : ['all']);
    }
  };

  const handleLocationSelect = (location: string) => {
    if (location === 'all') {
      setSelectedLocations([]);
    } else {
      const newSelected = selectedLocations.includes(location)
        ? selectedLocations.filter(loc => loc !== location)
        : [...selectedLocations, location];
      setSelectedLocations(newSelected);
    }
  };

  const handleInterestSelect = (interestId: string) => {
    if (interestId === 'all') {
      setSelectedInterests([]);
    } else {
      const newSelected = selectedInterests.includes(interestId)
        ? selectedInterests.filter(id => id !== interestId)
        : [...selectedInterests, interestId];
      setSelectedInterests(newSelected);
    }
  };

  const handleEventTypeSelect = (type: string) => {
    if (type === 'all') {
      setSelectedEventTypes([]);
    } else {
      const newSelected = selectedEventTypes.includes(type)
        ? selectedEventTypes.filter(t => t !== type)
        : [...selectedEventTypes, type];
      setSelectedEventTypes(newSelected);
    }
  };

  const filteredEvents = events.filter(event => {
    if (!searchValue) return true;
    const searchLower = searchValue.toLowerCase();
    return (
      event.name.toLowerCase().includes(searchLower) ||
      event.description?.toLowerCase().includes(searchLower) ||
      event.venue_name?.toLowerCase().includes(searchLower) ||
      event.venue_city?.toLowerCase().includes(searchLower)
    );
  });

  if (orgsLoading || eventsLoading) {
    return (
      <div className="min-h-screen bg-ocean">
        <Header 
          searchValue={searchValue} 
          onSearchChange={setSearchValue}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
        <div className="max-w-7xl mx-auto p-4">
          <p className="text-center text-white">Loading...</p>
        </div>
      </div>
    );
  }

  if (orgsError || eventsError) {
    return (
      <div className="min-h-screen bg-ocean">
        <Header 
          searchValue={searchValue} 
          onSearchChange={setSearchValue}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
        <div className="max-w-7xl mx-auto p-4">
          <p className="text-center text-rock">
            {orgsError?.message || eventsError?.message}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ocean">
      <Header 
        searchValue={searchValue} 
        onSearchChange={setSearchValue}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />
      <div className="max-w-7xl mx-auto p-4">
        <CollapsibleFilters
          organizations={organizations}
          selectedOrgs={selectedOrgs}
          onSelectOrg={handleOrgSelect}
          selectedLocations={selectedLocations}
          onSelectLocation={handleLocationSelect}
          selectedInterests={selectedInterests}
          onSelectInterest={handleInterestSelect}
          selectedEventTypes={selectedEventTypes}
          onSelectEventType={handleEventTypeSelect}
        />
        
        {viewMode === 'list' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map(event => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-lg">
            <CalendarView events={filteredEvents} />
          </div>
        )}
      </div>
    </div>
  );
}