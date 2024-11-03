import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Event } from '../types/database';
import { CalendarDayDetails } from './CalendarDayDetails';

interface CalendarViewProps {
  events: Event[];
}

export function CalendarView({ events }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const monthNames = {
    full: [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ],
    abbreviated: [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ]
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const getDayEvents = (day: number) => {
    return events.filter(event => {
      const eventDate = new Date(event.start_date);
      return eventDate.getDate() === day &&
             eventDate.getMonth() === currentDate.getMonth() &&
             eventDate.getFullYear() === currentDate.getFullYear();
    });
  };

  const handleDayClick = (day: number) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    setSelectedDate(date);
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-32 bg-gray-50"></div>);
    }

    // Add cells for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dayEvents = getDayEvents(day);
      days.push(
        <div 
          key={day} 
          className={`h-32 border border-gray-200 p-2 overflow-hidden cursor-pointer 
            hover:bg-gray-50 transition-colors ${dayEvents.length > 0 ? 'hover:shadow-md' : ''}`}
          onClick={() => handleDayClick(day)}
        >
          <div className="font-semibold mb-2">{day}</div>
          <div className="space-y-1">
            {dayEvents.map(event => (
              <div
                key={event.id}
                className={`block text-xs p-1 rounded truncate ${
                  event.is_online 
                    ? 'bg-rock text-white'
                    : 'bg-netting text-white'
                }`}
                title={event.name}
              >
                {event.name}
              </div>
            ))}
          </div>
        </div>
      );
    }

    return days;
  };

  return (
    <div className="p-6">
      {/* Month Navigation - Full width on mobile */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center justify-between w-full">
          <button 
            onClick={previousMonth} 
            className="p-2 hover:bg-sky/20 rounded text-ocean"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h2 className="text-xl font-semibold text-ocean">
            <span className="hidden sm:inline">
              {monthNames.full[currentDate.getMonth()]}
            </span>
            <span className="sm:hidden">
              {monthNames.abbreviated[currentDate.getMonth()]}
            </span>
            {' '}{currentDate.getFullYear()}
          </h2>
          <button 
            onClick={nextMonth} 
            className="p-2 hover:bg-sky/20 rounded text-ocean"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>

        {/* Legend - Separate line on mobile */}
        <div className="flex items-center justify-center sm:justify-end gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-netting"></div>
            <span className="text-sm text-gray-600">In-Person</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-rock"></div>
            <span className="text-sm text-gray-600">Virtual</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center font-semibold p-2 bg-gray-50 text-ocean">
            {day}
          </div>
        ))}
        {renderCalendar()}
      </div>

      {selectedDate && (
        <CalendarDayDetails
          date={selectedDate}
          events={getDayEvents(selectedDate.getDate())}
          onClose={() => setSelectedDate(null)}
        />
      )}
    </div>
  );
}