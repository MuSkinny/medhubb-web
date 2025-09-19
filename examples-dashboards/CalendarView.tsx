'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Calendar, CalendarDays, Clock, ArrowLeft } from 'lucide-react';
import { Appointment } from '@/types';
import { MonthlyCalendar } from './MonthlyCalendar';
import { WeeklyCalendar } from './WeeklyCalendar';
import { DailyCalendar } from './DailyCalendar';

interface CalendarViewProps {
  appointments: Appointment[];
  selectedDate?: Date;
  onDateSelect?: (date: Date) => void;
}

export type CalendarViewType = 'day' | 'week' | 'month';

export function CalendarView({ appointments = [], selectedDate, onDateSelect }: CalendarViewProps) {
  const [viewType, setViewType] = useState<CalendarViewType>('month');
  const [previousViewType, setPreviousViewType] = useState<CalendarViewType>('month');
  const [currentDate, setCurrentDate] = useState(selectedDate || new Date());

  const handleDateSelect = (date: Date) => {
    setCurrentDate(date);
    // Store previous view before switching to day view
    setPreviousViewType(viewType);
    setViewType('day');
    if (onDateSelect) {
      onDateSelect(date);
    }
  };

  const handleViewTypeChange = (newViewType: CalendarViewType) => {
    setPreviousViewType(viewType);
    setViewType(newViewType);
  };

  const goBackToPreviousView = () => {
    setViewType(previousViewType);
  };

  const viewOptions = [
    {
      type: 'day' as CalendarViewType,
      label: 'Giorno',
      icon: Clock,
      description: 'Vista dettagliata giornaliera con time slots'
    },
    {
      type: 'week' as CalendarViewType,
      label: 'Settimana',
      icon: CalendarDays,
      description: 'Vista settimanale con tutti i giorni'
    },
    {
      type: 'month' as CalendarViewType,
      label: 'Mese',
      icon: Calendar,
      description: 'Vista mensile completa'
    }
  ];

  const renderCalendarView = () => {
    switch (viewType) {
      case 'day':
        return (
          <DailyCalendar
            appointments={appointments}
            selectedDate={currentDate}
            onDateSelect={handleDateSelect}
          />
        );
      case 'week':
        return (
          <WeeklyCalendar
            appointments={appointments}
            selectedDate={currentDate}
            onDateSelect={handleDateSelect}
          />
        );
      case 'month':
        return (
          <MonthlyCalendar
            appointments={appointments}
            selectedDate={currentDate}
            onDateSelect={handleDateSelect}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* View Switcher */}
      <Card className="medical-surface-elevated">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div>
              <h2 className="medical-subtitle text-slate-800">Calendario Appuntamenti</h2>
              <p className="medical-caption text-slate-600">
                Gestisci la tua agenda con diverse visualizzazioni
              </p>
            </div>
            <div className="flex items-center space-x-2">
              {/* Back button - only show in day view and if we came from another view */}
              {viewType === 'day' && previousViewType !== 'day' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goBackToPreviousView}
                  className="btn-responsive-sm"
                  title={`Torna alla vista ${previousViewType === 'month' ? 'mensile' : 'settimanale'}`}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">
                    {previousViewType === 'month' ? 'Mese' : 'Settimana'}
                  </span>
                </Button>
              )}
              
              <div className="flex items-center space-x-1 p-1 bg-slate-100 rounded-lg">
                {viewOptions.map(option => {
                  const Icon = option.icon;
                  const isActive = viewType === option.type;
                  
                  return (
                    <Button
                      key={option.type}
                      variant={isActive ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => handleViewTypeChange(option.type)}
                      className={`
                        relative transition-all duration-200
                        ${isActive 
                          ? 'bg-white text-blue-600 shadow-sm' 
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                        }
                      `}
                      title={option.description}
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">{option.label}</span>
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {/* Current view description */}
          <div className="mb-4 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
            <div className="flex items-center space-x-2">
              {(() => {
                const currentOption = viewOptions.find(opt => opt.type === viewType);
                if (currentOption) {
                  const Icon = currentOption.icon;
                  return (
                    <>
                      <Icon className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">
                        Vista {currentOption.label}
                      </span>
                    </>
                  );
                }
                return null;
              })()}
            </div>
            <p className="text-sm text-blue-700 mt-1">
              {viewOptions.find(opt => opt.type === viewType)?.description}
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="text-lg font-bold text-green-600">
                {appointments.filter(a => a.stato === 'confirmed').length}
              </div>
              <div className="text-xs text-green-700">Confermati</div>
            </div>
            <div className="text-center p-3 bg-amber-50 rounded-lg border border-amber-200">
              <div className="text-lg font-bold text-amber-600">
                {appointments.filter(a => a.stato === 'pending').length}
              </div>
              <div className="text-xs text-amber-700">In attesa</div>
            </div>
            <div className="text-center p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-lg font-bold text-slate-600">
                {appointments.filter(a => a.stato === 'completed').length}
              </div>
              <div className="text-xs text-slate-700">Completati</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
              <div className="text-lg font-bold text-red-600">
                {appointments.filter(a => a.stato === 'cancelled').length}
              </div>
              <div className="text-xs text-red-700">Annullati</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar View */}
      {renderCalendarView()}

      {/* Additional Tools */}
      <Card className="medical-surface-elevated">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-100 border-l-4 border-green-400 rounded-sm"></div>
                <span>Confermato</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-amber-100 border-l-4 border-amber-400 rounded-sm"></div>
                <span>In attesa</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-100 border-l-4 border-red-400 rounded-sm"></div>
                <span>Annullato</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-slate-100 border-l-4 border-slate-400 rounded-sm"></div>
                <span>Completato</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDateSelect(new Date())}
                className="btn-responsive-sm"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Vai a oggi
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}