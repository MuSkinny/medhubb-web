'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Clock, User, MapPin, FileText, Plus } from 'lucide-react';
import { Appointment } from '@/types';
import { formatDate } from '@/utils/date';
import { getStatusColor, getStatusLabel } from '@/utils/status';
import { QuickAppointmentModal } from './QuickAppointmentModal';

interface DailyCalendarProps {
  appointments: Appointment[];
  selectedDate?: Date;
  onDateSelect?: (date: Date) => void;
  workingHours?: { start: number; end: number }; // 24h format
}

interface TimeSlot {
  hour: number;
  time: string;
  appointments: Appointment[];
}

export function DailyCalendar({ 
  appointments = [], 
  selectedDate = new Date(), 
  onDateSelect,
  workingHours = { start: 8, end: 20 }
}: DailyCalendarProps) {
  const [currentDate, setCurrentDate] = useState(selectedDate);

  const { timeSlots, dayAppointments } = useMemo(() => {
    // Filter appointments for the selected day
    const dayAppointments = appointments.filter(apt => {
      if (!apt.data_ora) return false;
      const aptDate = new Date(apt.data_ora);
      return (
        aptDate.getFullYear() === currentDate.getFullYear() &&
        aptDate.getMonth() === currentDate.getMonth() &&
        aptDate.getDate() === currentDate.getDate()
      );
    }).sort((a, b) => new Date(a.data_ora).getTime() - new Date(b.data_ora).getTime());

    // Create time slots from working hours
    const slots: TimeSlot[] = [];
    for (let hour = workingHours.start; hour <= workingHours.end; hour++) {
      const hourAppointments = dayAppointments.filter(apt => {
        const aptDate = new Date(apt.data_ora);
        return aptDate.getHours() === hour;
      });

      slots.push({
        hour,
        time: `${hour.toString().padStart(2, '0')}:00`,
        appointments: hourAppointments
      });
    }

    return { timeSlots: slots, dayAppointments };
  }, [currentDate, appointments, workingHours]);

  const monthNames = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
  ];

  const dayNames = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];

  const goToPreviousDay = () => {
    const prevDay = new Date(currentDate);
    prevDay.setDate(currentDate.getDate() - 1);
    setCurrentDate(prevDay);
    if (onDateSelect) onDateSelect(prevDay);
  };

  const goToNextDay = () => {
    const nextDay = new Date(currentDate);
    nextDay.setDate(currentDate.getDate() + 1);
    setCurrentDate(nextDay);
    if (onDateSelect) onDateSelect(nextDay);
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    if (onDateSelect) onDateSelect(today);
  };

  const isToday = () => {
    const today = new Date();
    return (
      currentDate.getFullYear() === today.getFullYear() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getDate() === today.getDate()
    );
  };

  const getCurrentTimePosition = () => {
    if (!isToday()) return null;
    
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();
    
    if (currentHour < workingHours.start || currentHour > workingHours.end) {
      return null;
    }
    
    // Calculate position within the visible hours
    const hourIndex = currentHour - workingHours.start;
    const minutePercentage = currentMinutes / 60;
    const position = (hourIndex + minutePercentage) * 100; // 100px per hour slot
    
    return position;
  };

  const currentTimePosition = getCurrentTimePosition();

  return (
    <Card className="card-responsive">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div>
            <CardTitle className="text-2xl">
              {dayNames[currentDate.getDay()]}, {currentDate.getDate()} {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </CardTitle>
            <p className="text-sm text-slate-600 mt-1">
              {dayAppointments.length} appuntament{dayAppointments.length !== 1 ? 'i' : 'o'} programmati
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <QuickAppointmentModal
              selectedDate={currentDate}
              trigger={
                <Button
                  size="sm"
                  className="medical-btn-primary"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Nuovo Appuntamento</span>
                  <span className="sm:hidden">Nuovo</span>
                </Button>
              }
            />
            <div className="w-px h-6 bg-slate-300"></div>
            <Button
              variant="outline"
              size="sm"
              onClick={goToPreviousDay}
              className="btn-responsive-sm"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Giorno precedente</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={goToToday}
              className="btn-responsive-sm"
              disabled={isToday()}
            >
              Oggi
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={goToNextDay}
              className="btn-responsive-sm"
            >
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">Giorno successivo</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {dayAppointments.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-lg">
            <Clock className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <p className="text-lg text-slate-600 mb-2">Nessun appuntamento</p>
            <p className="text-sm text-slate-500">
              Nessun appuntamento programmato per {formatDate(currentDate.toISOString())}
            </p>
          </div>
        ) : (
          <div className="relative">
            {/* Current time indicator */}
            {currentTimePosition !== null && (
              <div
                className="absolute left-0 right-0 z-10 pointer-events-none"
                style={{ top: `${currentTimePosition + 60}px` }} // 60px offset for header
              >
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                  <div className="flex-1 h-0.5 bg-red-500"></div>
                  <span className="text-xs text-red-500 ml-2 bg-white px-1">
                    {new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            )}

            {/* Time slots */}
            <div className="space-y-0 border rounded-lg overflow-hidden">
              {timeSlots.map((slot, index) => (
                <div
                  key={slot.hour}
                  className={`
                    flex min-h-[100px] border-b last:border-b-0
                    ${isToday() && new Date().getHours() === slot.hour ? 'bg-blue-50' : 'bg-white'}
                  `}
                >
                  {/* Time column */}
                  <div className="w-20 p-4 bg-slate-50 border-r flex flex-col justify-start">
                    <span className="text-sm font-medium text-slate-900">{slot.time}</span>
                    <span className="text-xs text-slate-500">
                      {slot.hour + 1}:00
                    </span>
                  </div>

                  {/* Appointments column */}
                  <div className="flex-1 p-4">
                    {slot.appointments.length === 0 ? (
                      <div className="h-full flex items-center justify-center group">
                        <div className="flex flex-col items-center space-y-2">
                          <span className="text-sm text-slate-400 group-hover:text-slate-600 transition-colors">
                            Disponibile
                          </span>
                          <QuickAppointmentModal
                            selectedDate={currentDate}
                            selectedTime={slot.time}
                            trigger={
                              <Button
                                size="sm"
                                variant="ghost"
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Aggiungi
                              </Button>
                            }
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {slot.appointments.map(appointment => (
                          <div
                            key={appointment.id}
                            className={`
                              p-3 rounded-lg border-l-4 transition-all duration-200 hover:shadow-md
                              ${appointment.stato === 'confirmed' ? 'bg-green-50 border-green-400' : ''}
                              ${appointment.stato === 'pending' ? 'bg-amber-50 border-amber-400' : ''}
                              ${appointment.stato === 'cancelled' ? 'bg-red-50 border-red-400' : ''}
                              ${appointment.stato === 'completed' ? 'bg-slate-50 border-slate-400' : ''}
                            `}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                {/* Time and status */}
                                <div className="flex items-center space-x-3 mb-2">
                                  <div className="flex items-center space-x-1">
                                    <Clock className="h-4 w-4 text-slate-500" />
                                    <span className="text-sm font-medium">
                                      {new Date(appointment.data_ora).toLocaleTimeString('it-IT', { 
                                        hour: '2-digit', 
                                        minute: '2-digit' 
                                      })}
                                    </span>
                                  </div>
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.stato)}`}>
                                    {getStatusLabel(appointment.stato)}
                                  </span>
                                </div>

                                {/* Patient info */}
                                <div className="flex items-center space-x-2 mb-2">
                                  <User className="h-4 w-4 text-slate-500 flex-shrink-0" />
                                  <span className="font-medium text-slate-900">
                                    {appointment.patient?.nome} {appointment.patient?.cognome}
                                  </span>
                                </div>

                                {/* Patient contact */}
                                {appointment.patient?.email && (
                                  <p className="text-sm text-slate-600 mb-1">
                                    📧 {appointment.patient.email}
                                  </p>
                                )}
                                {appointment.patient?.telefono && (
                                  <p className="text-sm text-slate-600 mb-2">
                                    📞 {appointment.patient.telefono}
                                  </p>
                                )}

                                {/* Notes */}
                                {appointment.note && (
                                  <div className="flex items-start space-x-2 mt-2 p-2 bg-white/60 rounded border">
                                    <FileText className="h-4 w-4 text-slate-500 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-slate-700 break-words">
                                      {appointment.note}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="mt-6 p-4 bg-slate-50 rounded-lg">
              <h3 className="font-medium text-slate-900 mb-3">Riepilogo giornata</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600">
                    {dayAppointments.filter(a => a.stato === 'confirmed').length}
                  </div>
                  <div className="text-slate-600">Confermati</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-amber-600">
                    {dayAppointments.filter(a => a.stato === 'pending').length}
                  </div>
                  <div className="text-slate-600">In attesa</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-slate-600">
                    {dayAppointments.filter(a => a.stato === 'completed').length}
                  </div>
                  <div className="text-slate-600">Completati</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-red-600">
                    {dayAppointments.filter(a => a.stato === 'cancelled').length}
                  </div>
                  <div className="text-slate-600">Annullati</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}