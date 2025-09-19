'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Clock, User } from 'lucide-react';
import { Appointment } from '@/types';
import { formatDate, formatDateTime } from '@/utils/date';
import { getStatusColor, getStatusLabel } from '@/utils/status';

interface MonthlyCalendarProps {
  appointments: Appointment[];
  selectedDate?: Date;
  onDateSelect?: (date: Date) => void;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  appointments: Appointment[];
}

export function MonthlyCalendar({ appointments = [], selectedDate, onDateSelect }: MonthlyCalendarProps) {
  const [currentDate, setCurrentDate] = useState(selectedDate || new Date());

  const calendarData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // First day of the month
    const firstDay = new Date(year, month, 1);
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0);
    
    // Start calendar from Monday of the week containing the first day
    const startDate = new Date(firstDay);
    const dayOfWeek = firstDay.getDay();
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Convert Sunday (0) to 6
    startDate.setDate(firstDay.getDate() - daysToSubtract);
    
    // Generate 42 days (6 weeks)
    const days: CalendarDay[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      const dayAppointments = appointments.filter(apt => {
        if (!apt.data_ora) return false;
        const aptDate = new Date(apt.data_ora);
        return (
          aptDate.getFullYear() === date.getFullYear() &&
          aptDate.getMonth() === date.getMonth() &&
          aptDate.getDate() === date.getDate()
        );
      });
      
      days.push({
        date,
        isCurrentMonth: date.getMonth() === month,
        isToday: date.getTime() === today.getTime(),
        appointments: dayAppointments
      });
    }
    
    return days;
  }, [currentDate, appointments]);

  const monthNames = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
  ];

  const dayNames = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

  const goToPreviousMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handleDateClick = (day: CalendarDay) => {
    if (onDateSelect) {
      onDateSelect(day.date);
    }
  };

  return (
    <Card className="card-responsive">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <CardTitle className="text-2xl">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPreviousMonth}
              className="btn-responsive-sm"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Mese precedente</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={goToToday}
              className="btn-responsive-sm"
            >
              Oggi
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={goToNextMonth}
              className="btn-responsive-sm"
            >
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">Mese successivo</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map(day => (
            <div key={day} className="p-2 text-center text-sm font-medium text-slate-600">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarData.map((day, index) => (
            <div
              key={index}
              className={`
                min-h-[100px] p-2 border rounded-lg cursor-pointer transition-colors
                ${day.isCurrentMonth ? 'bg-white hover:bg-blue-50' : 'bg-slate-50 text-slate-400'}
                ${day.isToday ? 'ring-2 ring-blue-500 bg-blue-50' : ''}
                hover:shadow-sm
              `}
              onClick={() => handleDateClick(day)}
            >
              <div className="flex justify-between items-start mb-1">
                <span className={`text-sm font-medium ${day.isToday ? 'text-blue-600' : ''}`}>
                  {day.date.getDate()}
                </span>
                {day.appointments.length > 0 && (
                  <span className="text-xs bg-blue-100 text-blue-800 px-1 rounded-full">
                    {day.appointments.length}
                  </span>
                )}
              </div>
              
              {/* Appointments for the day */}
              <div className="space-y-1">
                {day.appointments.slice(0, 2).map(appointment => (
                  <div
                    key={appointment.id}
                    className={`
                      text-xs p-1 rounded truncate
                      ${appointment.stato === 'confirmed' ? 'bg-green-100 text-green-800' : ''}
                      ${appointment.stato === 'pending' ? 'bg-amber-100 text-amber-800' : ''}
                      ${appointment.stato === 'cancelled' ? 'bg-red-100 text-red-800' : ''}
                      ${appointment.stato === 'completed' ? 'bg-slate-100 text-slate-800' : ''}
                    `}
                    title={`${new Date(appointment.data_ora).toLocaleTimeString('it-IT', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })} - ${appointment.patient?.nome} ${appointment.patient?.cognome}`}
                  >
                    <div className="flex items-center space-x-1">
                      <Clock className="h-2.5 w-2.5" />
                      <span>
                        {new Date(appointment.data_ora).toLocaleTimeString('it-IT', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1 mt-0.5">
                      <User className="h-2.5 w-2.5" />
                      <span className="truncate">
                        {appointment.patient?.nome} {appointment.patient?.cognome}
                      </span>
                    </div>
                  </div>
                ))}
                {day.appointments.length > 2 && (
                  <div className="text-xs text-slate-500 text-center">
                    +{day.appointments.length - 2} altri
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {/* Legend */}
        <div className="mt-6 flex flex-wrap gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-100 rounded"></div>
            <span>Confermato</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-amber-100 rounded"></div>
            <span>In attesa</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-100 rounded"></div>
            <span>Annullato</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-slate-100 rounded"></div>
            <span>Completato</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}