import { ChevronDown, ChevronUp, Filter } from 'lucide-react';
import { Organization } from '../types/database';
import { OrganizationFilter } from './OrganizationFilter';
import { LocationFilter } from './LocationFilter';
import { InterestFilter } from './InterestFilter';
import { EventTypeFilter } from './EventTypeFilter';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface CollapsibleFiltersProps {
  organizations: Organization[];
  selectedOrgs: string[];
  onSelectOrg: (orgId: string) => void;
  selectedLocations: string[];
  onSelectLocation: (location: string) => void;
  selectedInterests: string[];
  onSelectInterest: (interestId: string) => void;
  selectedEventTypes: string[];
  onSelectEventType: (type: string) => void;
}

export default function CollapsibleFilters({
  organizations,
  selectedOrgs,
  onSelectOrg,
  selectedLocations,
  onSelectLocation,
  selectedInterests,
  onSelectInterest,
  selectedEventTypes,
  onSelectEventType,
}: CollapsibleFiltersProps) {
  const [isOpen, setIsOpen] = useLocalStorage('filtersOpen', false);

  return (
    <div className="bg-ocean shadow mb-6 sticky top-16 z-40">
      <div className={`${isOpen ? 'p-4' : 'py-2 px-4'} bg-ocean`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex justify-between items-center text-white h-8"
        >
          <div className="flex items-center gap-2">
            <Filter className={`w-5 h-5 ${isOpen ? '-mt-1.5' : ''}`} />
            <span>Filter</span>
          </div>
          {isOpen ? (
            <ChevronUp className="w-5 h-5" />
          ) : (
            <ChevronDown className="w-5 h-5" />
          )}
        </button>

        {isOpen && (
          <div className="space-y-6 mt-4">
            <div>
              <h3 className="text-sm font-medium text-white mb-2">Event Type</h3>
              <EventTypeFilter
                selectedEventTypes={selectedEventTypes}
                onSelectEventType={onSelectEventType}
              />
            </div>

            <div>
              <h3 className="text-sm font-medium text-white mb-2">Location</h3>
              <LocationFilter
                selectedLocations={selectedLocations}
                onSelectLocation={onSelectLocation}
              />
            </div>

            <div>
              <h3 className="text-sm font-medium text-white mb-2">Interests</h3>
              <InterestFilter
                selectedInterests={selectedInterests}
                onSelectInterest={onSelectInterest}
              />
            </div>

            <div>
              <h3 className="text-sm font-medium text-white mb-2">Organization</h3>
              <OrganizationFilter
                organizations={organizations}
                selectedOrganizations={selectedOrgs}
                onSelectOrganization={onSelectOrg}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}