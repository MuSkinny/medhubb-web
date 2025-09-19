'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Clock, User, Plus } from 'lucide-react';
import { Appointment } from '@/types';
import { formatDate, formatDateTime } from '@/utils/date';
import { getStatusColor } from '@/utils/status';
import { QuickAppointmentModal } from './QuickAppointmentModal';

interface WeeklyCalendarProps {
  appointments: Appointment[];
  selectedDate?: Date;
  onDateSelect?: (date: Date) => void;
}

interface WeekDay {
  date: Date;
  isToday: boolean;
  appointments: Appointment[];
}

export function WeeklyCalendar({ appointments = [], selectedDate, onDateSelect }: WeeklyCalendarProps) {
  const [currentDate, setCurrentDate] = useState(selectedDate || new Date());

  const weekData = useMemo(() => {
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Adjust to start on Monday
    startOfWeek.setDate(diff);

    const week: WeekDay[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);

      const dayAppointments = appointments.filter(apt => {
        if (!apt.data_ora) return false;
        const aptDate = new Date(apt.data_ora);
        return (
          aptDate.getFullYear() === date.getFullYear() &&
          aptDate.getMonth() === date.getMonth() &&
          aptDate.getDate() === date.getDate()
        );
      }).sort((a, b) => new Date(a.data_ora).getTime() - new Date(b.data_ora).getTime());

      week.push({
        date,
        isToday: date.getTime() === today.getTime(),
        appointments: dayAppointments
      });
    }

    return week;
  }, [currentDate, appointments]);

  const dayNames = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
  const shortDayNames = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

  const goToPreviousWeek = () => {
    const prevWeek = new Date(currentDate);
    prevWeek.setDate(currentDate.getDate() - 7);
    setCurrentDate(prevWeek);
  };

  const goToNextWeek = () => {
    const nextWeek = new Date(currentDate);
    nextWeek.setDate(currentDate.getDate() + 7);
    setCurrentDate(nextWeek);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handleDateClick = (day: WeekDay) => {
    if (onDateSelect) {
      onDateSelect(day.date);
    }
  };

  const monthNames = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
  ];

  const weekStart = weekData[0]?.date;
  const weekEnd = weekData[6]?.date;

  return (
    <Card className="card-responsive">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <CardTitle className="text-2xl">
            {weekStart && weekEnd && (
              <>
                {weekStart.getDate()} {monthNames[weekStart.getMonth()]} - {weekEnd.getDate()} {monthNames[weekEnd.getMonth()]} {weekEnd.getFullYear()}
              </>
            )}
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPreviousWeek}
              className="btn-responsive-sm"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Settimana precedente</span>
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
              onClick={goToNextWeek}
              className="btn-responsive-sm"
            >
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">Settimana successiva</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
          {weekData.map((day, index) => (
            <div
              key={index}
              className={`
                border rounded-lg p-4 cursor-pointer transition-colors min-h-[200px]
                ${day.isToday ? 'ring-2 ring-blue-500 bg-blue-50' : 'bg-white hover:bg-slate-50'}
                hover:shadow-md
              `}
              onClick={() => handleDateClick(day)}
            >
              {/* Day header */}
              <div className="mb-3 pb-2 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 lg:hidden">
                      {dayNames[index]}
                    </p>
                    <p className="text-sm font-medium text-slate-600 hidden lg:block">
                      {shortDayNames[index]}
                    </p>
                    <p className={`text-lg font-bold ${day.isToday ? 'text-blue-600' : 'text-slate-900'}`}>
                      {day.date.getDate()}
                    </p>
                  </div>
                  {day.appointments.length > 0 && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">
                      {day.appointments.length}
                    </span>
                  )}
                </div>
              </div>

              {/* Appointments */}
              <div className="space-y-2">
                {day.appointments.slice(0, 4).map(appointment => (
                  <div
                    key={appointment.id}
                    className={`
                      text-xs p-2 rounded-lg border-l-4 transition-colors
                      ${appointment.stato === 'confirmed' ? 'bg-green-50 border-green-400 text-green-800' : ''}
                      ${appointment.stato === 'pending' ? 'bg-amber-50 border-amber-400 text-amber-800' : ''}
                      ${appointment.stato === 'cancelled' ? 'bg-red-50 border-red-400 text-red-800' : ''}
                      ${appointment.stato === 'completed' ? 'bg-slate-50 border-slate-400 text-slate-700' : ''}
                      hover:shadow-sm
                    `}
                    title={`${new Date(appointment.data_ora).toLocaleTimeString('it-IT', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })} - ${appointment.patient?.nome} ${appointment.patient?.cognome}${appointment.note ? ' - ' + appointment.note : ''}`}
                  >
                    <div className="flex items-center space-x-1 mb-1">
                      <Clock className="h-3 w-3 flex-shrink-0" />
                      <span className="font-medium">
                        {new Date(appointment.data_ora).toLocaleTimeString('it-IT', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <User className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate text-xs">
                        {appointment.patient?.nome} {appointment.patient?.cognome}
                      </span>
                    </div>
                    {appointment.note && (
                      <p className="text-xs mt-1 text-slate-600 truncate">
                        {appointment.note}
                      </p>
                    )}
                  </div>
                ))}
                {day.appointments.length > 4 && (
                  <div className="text-xs text-slate-500 text-center py-1 bg-slate-50 rounded">
                    +{day.appointments.length - 4} altri
                  </div>
                )}
                {day.appointments.length === 0 && (
                  <div className="text-center py-4 group">
                    <p className="text-xs text-slate-400 mb-2">
                      Nessun appuntamento
                    </p>
                    <QuickAppointmentModal
                      selectedDate={day.date}
                      trigger={
                        <Button
                          size="sm"
                          variant="ghost"
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-600 hover:text-blue-700 hover:bg-blue-50 text-xs px-2 py-1"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Aggiungi
                        </Button>
                      }
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {/* Legend */}
        <div className="mt-6 flex flex-wrap gap-4 text-sm border-t pt-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-50 border-l-4 border-green-400 rounded-sm"></div>
            <span>Confermato</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-amber-50 border-l-4 border-amber-400 rounded-sm"></div>
            <span>In attesa</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-50 border-l-4 border-red-400 rounded-sm"></div>
            <span>Annullato</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-slate-50 border-l-4 border-slate-400 rounded-sm"></div>
            <span>Completato</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}