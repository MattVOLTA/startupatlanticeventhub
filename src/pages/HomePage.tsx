import React, { useEffect } from 'react';
import { Header } from '../components/Header';
import CollapsibleFilters from '../components/CollapsibleFilters';
import { useOrganizations } from '../hooks/useOrganizations';
import { useEvents } from '../hooks/useEvents';
import { EventCard } from '../components/EventCard';
import { CalendarView } from '../components/CalendarView';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { initDataLayer, trackPageView, trackEvent } from '../utils/gtm';

export function HomePage() {
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

  // Initialize GTM data layer
  useEffect(() => {
    initDataLayer();
    trackPageView('Event Hub Home');
  }, []);

  const handleOrgSelect = (orgId: string) => {
    if (orgId === 'all') {
      setSelectedOrgs(['all']);
      // Track selecting all organizations
      trackEvent('filter_change', {
        filter_type: 'organization',
        filter_value: 'all',
        action: 'select_all'
      });
    } else {
      const isSelected = selectedOrgs.includes(orgId);
      const newSelected = selectedOrgs.includes('all') 
        ? [orgId]
        : selectedOrgs.includes(orgId)
          ? selectedOrgs.filter(id => id !== orgId)
          : [...selectedOrgs, orgId];
      setSelectedOrgs(newSelected.length ? newSelected : ['all']);
      
      // Track organization selection/deselection
      trackEvent('filter_change', {
        filter_type: 'organization',
        filter_value: orgId,
        organization_name: organizations.find(org => org.id === orgId)?.name || orgId,
        action: isSelected ? 'deselect' : 'select'
      });
    }
  };

  const handleLocationSelect = (location: string) => {
    if (location === 'all') {
      setSelectedLocations([]);
      // Track selecting all locations
      trackEvent('filter_change', {
        filter_type: 'location',
        filter_value: 'all',
        action: 'select_all'
      });
    } else {
      const isSelected = selectedLocations.includes(location);
      const newSelected = selectedLocations.includes(location)
        ? selectedLocations.filter(loc => loc !== location)
        : [...selectedLocations, location];
      setSelectedLocations(newSelected);
      
      // Track location selection/deselection
      trackEvent('filter_change', {
        filter_type: 'location',
        filter_value: location,
        action: isSelected ? 'deselect' : 'select'
      });
    }
  };

  const handleInterestSelect = (interestId: string) => {
    if (interestId === 'all') {
      setSelectedInterests([]);
      // Track selecting all interests
      trackEvent('filter_change', {
        filter_type: 'interest',
        filter_value: 'all',
        action: 'select_all'
      });
    } else {
      const isSelected = selectedInterests.includes(interestId);
      const newSelected = selectedInterests.includes(interestId)
        ? selectedInterests.filter(id => id !== interestId)
        : [...selectedInterests, interestId];
      setSelectedInterests(newSelected);
      
      // Track interest selection/deselection
      trackEvent('filter_change', {
        filter_type: 'interest',
        filter_value: interestId,
        action: isSelected ? 'deselect' : 'select'
      });
    }
  };

  const handleEventTypeSelect = (type: string) => {
    if (type === 'all') {
      setSelectedEventTypes([]);
      // Track selecting all event types
      trackEvent('filter_change', {
        filter_type: 'event_type',
        filter_value: 'all',
        action: 'select_all'
      });
    } else {
      const isSelected = selectedEventTypes.includes(type);
      const newSelected = selectedEventTypes.includes(type)
        ? selectedEventTypes.filter(t => t !== type)
        : [...selectedEventTypes, type];
      setSelectedEventTypes(newSelected);
      
      // Track event type selection/deselection
      trackEvent('filter_change', {
        filter_type: 'event_type',
        filter_value: type,
        action: isSelected ? 'deselect' : 'select'
      });
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