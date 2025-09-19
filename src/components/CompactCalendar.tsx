'use client';

import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, Clock, User, Stethoscope } from 'lucide-react';

interface Appointment {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  visit_type: string;
  status: string;
  patients?: {
    first_name: string;
    last_name: string;
  };
  doctors?: {
    first_name: string;
    last_name: string;
  };
}

interface CompactCalendarProps {
  appointments: Appointment[];
  userType: 'doctor' | 'patient';
  onDateSelect?: (date: Date) => void;
  selectedDate?: Date;
  className?: string;
}

export function CompactCalendar({
  appointments,
  userType,
  onDateSelect,
  selectedDate,
  className = ""
}: CompactCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthNames = [
    'Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu',
    'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'
  ];

  const weekDays = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days = [];
    for (let i = 0; i < 42; i++) {
      days.push(new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000));
    }
    return days;
  };

  const getAppointmentsForDate = (date: Date) => {
    return appointments.filter(apt => {
      const aptDate = new Date(apt.appointment_date);
      return aptDate.toDateString() === date.toDateString();
    });
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  const isCurrentMonth = (date: Date) => date.getMonth() === currentDate.getMonth();
  const isToday = (date: Date) => date.toDateString() === new Date().toDateString();
  const isSelected = (date: Date) => selectedDate?.toDateString() === date.toDateString();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-500';
      case 'requested': return 'bg-yellow-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const days = getDaysInMonth(currentDate);

  return (
    <div className={`medical-card p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <CalendarDays className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-slate-800">Calendario</h3>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-800 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-slate-700 min-w-[60px] text-center">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </span>
          <button
            onClick={() => navigateMonth('next')}
            className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-800 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Week Headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((day, index) => (
          <div key={index} className="text-center text-xs font-medium text-slate-500 py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((date, index) => {
          const dayAppointments = getAppointmentsForDate(date);
          const isCurrentMonthDay = isCurrentMonth(date);
          const isTodayDate = isToday(date);
          const isSelectedDate = isSelected(date);

          return (
            <div
              key={index}
              onClick={() => onDateSelect?.(date)}
              className={`
                relative h-8 flex items-center justify-center text-xs cursor-pointer rounded-lg transition-all duration-200
                ${!isCurrentMonthDay ? 'text-slate-300' : 'text-slate-700'}
                ${isTodayDate ? 'bg-blue-100 text-blue-700 font-semibold' : ''}
                ${isSelectedDate ? 'ring-2 ring-blue-500 bg-blue-50' : ''}
                ${isCurrentMonthDay && !isTodayDate && !isSelectedDate ? 'hover:bg-slate-100' : ''}
              `}
            >
              <span>{date.getDate()}</span>

              {/* Appointment Indicators */}
              {dayAppointments.length > 0 && (
                <div className="absolute bottom-0.5 left-1/2 transform -translate-x-1/2">
                  <div className="flex space-x-0.5">
                    {dayAppointments.slice(0, 3).map((apt, idx) => (
                      <div
                        key={idx}
                        className={`w-1 h-1 rounded-full ${getStatusColor(apt.status)}`}
                        title={`${apt.start_time} - ${userType === 'doctor'
                          ? `${apt.patients?.first_name} ${apt.patients?.last_name}`
                          : `Dr. ${apt.doctors?.first_name} ${apt.doctors?.last_name}`
                        }`}
                      />
                    ))}
                    {dayAppointments.length > 3 && (
                      <div className="w-1 h-1 rounded-full bg-slate-400" />
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected Date Details */}
      {selectedDate && (
        <div className="mt-4 pt-4 border-t border-slate-200">
          <div className="text-xs font-medium text-slate-700 mb-2">
            {selectedDate.toLocaleDateString('it-IT', {
              weekday: 'long',
              day: 'numeric',
              month: 'long'
            })}
          </div>

          {getAppointmentsForDate(selectedDate).length === 0 ? (
            <p className="text-xs text-slate-500">Nessun appuntamento</p>
          ) : (
            <div className="space-y-2">
              {getAppointmentsForDate(selectedDate).slice(0, 3).map((appointment) => (
                <div key={appointment.id} className="flex items-center space-x-2 text-xs">
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(appointment.status)}`} />
                  <Clock className="w-3 h-3 text-slate-500" />
                  <span className="text-slate-600">{appointment.start_time}</span>
                  <div className="flex items-center space-x-1">
                    {userType === 'doctor' ? (
                      <User className="w-3 h-3 text-slate-500" />
                    ) : (
                      <Stethoscope className="w-3 h-3 text-slate-500" />
                    )}
                    <span className="text-slate-700 font-medium truncate">
                      {userType === 'doctor'
                        ? `${appointment.patients?.first_name} ${appointment.patients?.last_name}`
                        : `Dr. ${appointment.doctors?.first_name} ${appointment.doctors?.last_name}`
                      }
                    </span>
                  </div>
                </div>
              ))}
              {getAppointmentsForDate(selectedDate).length > 3 && (
                <p className="text-xs text-slate-500">
                  +{getAppointmentsForDate(selectedDate).length - 3} altri appuntamenti
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}