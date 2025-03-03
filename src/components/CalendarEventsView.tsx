import React, { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CalendarEventsViewProps {
  associationUpdate: string;
  associationEvents: AssociationEvent[];
  onUpdateChange: (text: string) => void;
  onEventsChange: (events: AssociationEvent[]) => void;
}

interface AssociationEvent {
  id: string | null;
  title: string;
  date: string;
  location: string;
  assignee: string;
}

const CalendarEventsView: React.FC<CalendarEventsViewProps> = ({
  associationUpdate,
  associationEvents,
  onUpdateChange,
  onEventsChange
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  
  // New event form data
  const [newEvent, setNewEvent] = useState({
    title: '',
    date: '',
    location: '',
    assignee: ''
  });
  
  // Helper to get days in month
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };
  
  // Helper to get day of week for first day of month (0 = Sunday)
  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };
  
  // Generate calendar days
  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const daysInMonth = getDaysInMonth(year, month);
    const firstDayOfMonth = getFirstDayOfMonth(year, month);
    
    // Create array for all days in the month
    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push({ day: '', isCurrentMonth: false });
    }
    
    // Add days of the current month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({ 
        day,
        isCurrentMonth: true,
        date: new Date(year, month, day),
        formattedDate: `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
      });
    }
    
    return days;
  };
  
  // Navigate to previous month
  const navigateToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };
  
  // Navigate to next month
  const navigateToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };
  
  // Get events for a specific date
  const getEventsForDate = (formattedDate: string) => {
    return associationEvents.filter(event => event.date === formattedDate);
  };
  
  // Open edit modal for an existing event
  const editEvent = (event: AssociationEvent) => {
    setIsEditing(true);
    setEditingEventId(event.id);
    setNewEvent({
      title: event.title,
      date: event.date,
      location: event.location,
      assignee: event.assignee
    });
    setShowEventModal(true);
  };
  
  // Save an event (handles both add and edit)
  const saveEvent = () => {
    if (newEvent.title && newEvent.date) {
      if (isEditing) {
        // Update existing event
        const updatedEvents = associationEvents.map(event => {
          if ((event.id === editingEventId) || 
              (editingEventId === null && event.id === null && 
               event.title === newEvent.title && event.date === newEvent.date)) {
            return {
              ...event,
              title: newEvent.title,
              date: newEvent.date,
              location: newEvent.location,
              assignee: newEvent.assignee
            };
          }
          return event;
        });
        onEventsChange(updatedEvents);
      } else {
        // Add new event
        const updatedEvents = [
          ...associationEvents,
          {
            id: `temp-${Date.now()}`, // Temporary ID until saved to DB
            title: newEvent.title,
            date: newEvent.date,
            location: newEvent.location,
            assignee: newEvent.assignee
          }
        ];
        onEventsChange(updatedEvents);
      }
      
      // Reset state
      setShowEventModal(false);
      setIsEditing(false);
      setEditingEventId(null);
      setNewEvent({
        title: '',
        date: '',
        location: '',
        assignee: ''
      });
    }
  };
  
  // Delete an event
  const deleteEvent = (eventToDelete: AssociationEvent) => {
    const updatedEvents = associationEvents.filter(event => 
      !(event.id === eventToDelete.id || 
        (event.id === null && event.title === eventToDelete.title && event.date === eventToDelete.date))
    );
    onEventsChange(updatedEvents);
    
    // If we're currently editing this event, close the modal
    if (showEventModal && isEditing && eventToDelete.id === editingEventId) {
      setShowEventModal(false);
      setIsEditing(false);
      setEditingEventId(null);
      setNewEvent({
        title: '',
        date: '',
        location: '',
        assignee: ''
      });
    }
  };
  
  // Get all calendar days
  const calendarDays = generateCalendarDays();
  
  // Weekday headers
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  return (
    <div className="bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center mb-4">
          <Calendar className="h-5 w-5 text-blue-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-800">Associations/Events <span className="text-sm font-normal text-gray-500">(5 minutes)</span></h3>
        </div>
        
        {/* Associations update section */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Associations Update
          </label>
          <textarea
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            rows={2}
            value={associationUpdate}
            onChange={(e) => onUpdateChange(e.target.value)}
            placeholder="Enter associations update or discussion topics..."
          ></textarea>
        </div>
      </div>
      
      {/* Calendar Navigation */}
      <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
        <div className="text-lg font-medium text-gray-900">
          {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </div>
        <div className="flex">
          <button 
            className="p-1 rounded-full hover:bg-gray-200"
            onClick={navigateToPreviousMonth}
          >
            <ChevronLeft className="h-5 w-5 text-gray-600" />
          </button>
          <button 
            className="p-1 rounded-full hover:bg-gray-200 ml-1"
            onClick={navigateToNextMonth}
          >
            <ChevronRight className="h-5 w-5 text-gray-600" />
          </button>
        </div>
      </div>
      
      {/* Calendar Grid */}
      <div className="bg-white p-4">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {weekdays.map((day, index) => (
            <div key={index} className="text-center text-sm font-medium text-gray-500 py-2">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, index) => (
            <div 
              key={index} 
              className={`min-h-24 border rounded-md ${
                !day.isCurrentMonth 
                  ? 'bg-gray-50 border-gray-100' 
                  : 'border-gray-200 hover:border-blue-500 hover:bg-blue-50'
              }`}
              onClick={() => {
                if (day.isCurrentMonth && day.formattedDate) {
                  setSelectedDate(day.formattedDate);
                  setNewEvent({...newEvent, date: day.formattedDate});
                  setIsEditing(false);
                  setEditingEventId(null);
                  setShowEventModal(true);
                }
              }}
            >
              {day.isCurrentMonth && (
                <>
                  <div className="px-2 py-1 text-right">
                    <span className={`text-sm ${
                      new Date().toISOString().split('T')[0] === day.formattedDate 
                        ? 'bg-blue-600 text-white rounded-full h-6 w-6 flex items-center justify-center' 
                        : 'text-gray-700'
                    }`}>
                      {day.day}
                    </span>
                  </div>
                  <div className="px-1 overflow-y-auto max-h-20">
                    {day.formattedDate && getEventsForDate(day.formattedDate).map((event, eventIndex) => (
                      <div 
                        key={eventIndex} 
                        className="p-1 mb-1 text-xs rounded bg-blue-100 border border-blue-200 cursor-pointer hover:bg-blue-200"
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent triggering the day cell click
                          editEvent(event);
                        }}
                      >
                        <div className="font-medium truncate">{event.title}</div>
                        {event.location && (
                          <div className="truncate text-blue-800">{event.location}</div>
                        )}
                        {event.assignee && (
                          <div className="truncate text-gray-500">{event.assignee}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* Upcoming Events List */}
      <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
        <div className="flex justify-between items-center mb-3">
          <h4 className="font-medium text-gray-900">Upcoming Events</h4>
          <button 
            className="flex items-center text-sm text-blue-600 hover:text-blue-800"
            onClick={() => {
              setSelectedDate(new Date().toISOString().split('T')[0]);
              setNewEvent({...newEvent, date: new Date().toISOString().split('T')[0]});
              setIsEditing(false);
              setEditingEventId(null);
              setShowEventModal(true);
            }}
          >
            <Plus className="h-4 w-4 mr-1" /> Add Event
          </button>
        </div>
        
        <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
          {associationEvents
            .filter(event => event.date && new Date(event.date) >= new Date(new Date().setHours(0,0,0,0)))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .map((event, index) => (
              <div 
                key={index} 
                className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 cursor-pointer"
                onClick={() => editEvent(event)}
              >
                <div>
                  <div className="font-medium text-gray-900">{event.title}</div>
                  <div className="text-sm text-gray-500">
                    {event.date && new Date(event.date).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                    {event.location && ` · ${event.location}`}
                    {event.assignee && ` · ${event.assignee}`}
                  </div>
                </div>
                <button 
                  className="text-gray-400 hover:text-gray-500"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteEvent(event);
                  }}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
        </div>
      </div>
      
      {/* Event Modal (hidden by default) */}
      {showEventModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 bg-blue-50 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                {isEditing ? 'Edit Event' : 'Add New Event'}
              </h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Event Title
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                    placeholder="Enter event title"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={newEvent.date}
                    onChange={(e) => setNewEvent({...newEvent, date: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location/Details
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={newEvent.location}
                    onChange={(e) => setNewEvent({...newEvent, location: e.target.value})}
                    placeholder="e.g., NV, Phoenix, etc."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Assignee
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={newEvent.assignee}
                    onChange={(e) => setNewEvent({...newEvent, assignee: e.target.value})}
                    placeholder="Who is responsible?"
                  />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between">
              {isEditing && (
                <Button
                  variant="outline"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => {
                    const eventToDelete = associationEvents.find(event => event.id === editingEventId);
                    if (eventToDelete) {
                      deleteEvent(eventToDelete);
                    }
                    setShowEventModal(false);
                  }}
                >
                  Delete
                </Button>
              )}
              <div className={isEditing ? '' : 'ml-auto'}>
                <Button
                  variant="outline"
                  className="mr-2"
                  onClick={() => {
                    setShowEventModal(false);
                    setIsEditing(false);
                    setEditingEventId(null);
                    setNewEvent({
                      title: '',
                      date: '',
                      location: '',
                      assignee: ''
                    });
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={saveEvent}
                  disabled={!newEvent.title || !newEvent.date}
                >
                  {isEditing ? 'Save Changes' : 'Add Event'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarEventsView;