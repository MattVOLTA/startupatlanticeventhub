import React from 'react';
import { X, Calendar, Clock, MapPin, Ticket } from 'lucide-react';
import { Event } from '../types/database';

interface CalendarDayDetailsProps {
  date: Date;
  events: Event[];
  onClose: () => void;
}

export function CalendarDayDetails({ date, events, onClose }: CalendarDayDetailsProps) {
  const formattedDate = date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const truncateDescription = (text: string) => {
    if (!text) return '';
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    return sentences.slice(0, 3).join(' ');
  };

  const handleCardClick = (url: string, e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.register-button')) {
      return;
    }
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-ocean text-white">
          <h2 className="text-xl font-semibold">{formattedDate}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-sky/20 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {events.length === 0 ? (
            <p className="text-gray-500 text-center">No events scheduled for this day.</p>
          ) : (
            <div className="space-y-6">
              {events.map(event => {
                const startDate = new Date(event.start_date);
                const endDate = new Date(event.end_date);
                const isFreeEvent = event.is_free || !event.price || event.price <= 0;

                return (
                  <div 
                    key={event.id} 
                    className="bg-white rounded-lg shadow-lg overflow-hidden cursor-pointer hover:shadow-xl transition-shadow flex flex-col"
                    onClick={(e) => handleCardClick(event.url, e)}
                  >
                    {event.logo_url && (
                      <img 
                        src={event.logo_url} 
                        alt={event.name}
                        className="w-full h-48 object-cover"
                      />
                    )}
                    <div className="p-6 flex-1 flex flex-col">
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold text-ocean mb-4">
                          {event.name}
                        </h3>

                        <p className="text-gray-600 mb-6">
                          {truncateDescription(event.description || '')}
                        </p>

                        <div className="space-y-4 text-gray-600">
                          <div className="flex items-center gap-3">
                            <Calendar className="w-5 h-5 flex-shrink-0 text-gray-400" />
                            <span className="font-medium">
                              {startDate.toLocaleDateString('en-US', {
                                weekday: 'long',
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            <Clock className="w-5 h-5 flex-shrink-0 text-gray-400" />
                            <span className="font-medium">
                              {formatTime(startDate)} - {formatTime(endDate)}
                            </span>
                          </div>

                          {event.venue_name && (
                            <div className="flex items-start gap-3">
                              <MapPin className="w-5 h-5 mt-1 flex-shrink-0 text-gray-400" />
                              <div>
                                <div className="font-medium">{event.venue_name}</div>
                                {event.venue_address && (
                                  <div className="text-sm text-gray-500">{event.venue_address}</div>
                                )}
                              </div>
                            </div>
                          )}

                          <div className="flex items-center gap-3">
                            <Ticket className="w-5 h-5 flex-shrink-0 text-gray-400" />
                            <span className="font-medium">
                              {isFreeEvent ? 'Free Event' : 'Paid Event'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6">
                        <a
                          href={event.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="register-button block w-full text-center bg-kitchen text-white px-4 py-2 rounded hover:bg-opacity-90 transition-colors"
                        >
                          Register Now
                        </a>

                        <div className="border-t mt-4 pt-4">
                          <div className="flex items-center justify-between">
                            <div className="text-sm text-gray-600">
                              Organized by {event.organizations?.name}
                            </div>
                            <span className={`px-3 py-1 rounded-full text-sm ${
                              event.is_online 
                                ? 'bg-rock text-white' 
                                : 'bg-netting text-white'
                            }`}>
                              {event.is_online ? 'Virtual' : 'In-Person'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}