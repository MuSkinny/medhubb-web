'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { UserProfileDropdown } from '@/components/UserProfileDropdown';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  User,
  Stethoscope,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Filter
} from 'lucide-react';

interface Appointment {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  visit_type: string;
  status: string;
  patient_notes?: string;
  doctor_notes?: string;
  patients?: {
    first_name: string;
    last_name: string;
  };
  doctors?: {
    first_name: string;
    last_name: string;
  };
}

interface User {
  id: string;
  email?: string;
  profile?: {
    first_name?: string;
    last_name?: string;
  };
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [userData, setUserData] = useState<User & { role?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [loadingAppointments, setLoadingAppointments] = useState(false);

  // Form state for creating appointments
  const [appointmentForm, setAppointmentForm] = useState({
    patientId: '',
    doctorId: '',
    date: '',
    startTime: '',
    endTime: '',
    visitType: 'follow_up',
    notes: ''
  });

  const [connectedUsers, setConnectedUsers] = useState<any[]>([]);

  const router = useRouter();

  // Calendar utilities
  const monthNames = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
  ];

  const weekDays = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (userData) {
      loadAppointments();
      loadConnectedUsers();
    }
  }, [currentDate, userData]);

  const checkAuth = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) {
        router.push("/login");
        return;
      }

      const response = await fetch('/api/auth/check-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });

      if (!response.ok) {
        router.push("/dashboard");
        return;
      }

      const data = await response.json();
      setUserData({ ...user, profile: data.profile, role: data.role });
    } catch (error) {
      console.error("Errore autenticazione:", error);
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  const loadAppointments = async () => {
    if (!userData) return;

    setLoadingAppointments(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      const response = await fetch(`/api/appointments?start=${startOfMonth.toISOString()}&end=${endOfMonth.toISOString()}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAppointments(data.appointments || []);
      }
    } catch (error) {
      console.error("Errore caricamento appuntamenti:", error);
    } finally {
      setLoadingAppointments(false);
    }
  };

  const loadConnectedUsers = async () => {
    if (!userData) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const endpoint = userData.role === 'doctor'
        ? `/api/connections/patients?doctorId=${userData.id}`
        : `/api/connections/doctors?patientId=${userData.id}`;

      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setConnectedUsers(data.connections || []);
      }
    } catch (error) {
      console.error("Errore caricamento utenti collegati:", error);
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
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
    }).filter(apt => {
      if (filterStatus === 'all') return true;
      return apt.status === filterStatus;
    });
  };

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const appointmentData = {
        ...appointmentForm,
        appointmentDate: appointmentForm.date,
        patientNotes: appointmentForm.notes
      };

      if (userData.role === 'doctor') {
        appointmentData.doctorId = userData.id;
      } else {
        appointmentData.patientId = userData.id;
      }

      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(appointmentData)
      });

      if (response.ok) {
        setShowCreateModal(false);
        setAppointmentForm({
          patientId: '',
          doctorId: '',
          date: '',
          startTime: '',
          endTime: '',
          visitType: 'follow_up',
          notes: ''
        });
        loadAppointments();
      } else {
        const error = await response.json();
        alert(`Errore: ${error.error}`);
      }
    } catch (error) {
      console.error("Errore creazione appuntamento:", error);
      alert("Errore durante la creazione dell'appuntamento");
    }
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800 border-green-200';
      case 'requested': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed': return <CheckCircle className="w-3 h-3" />;
      case 'requested': return <Clock className="w-3 h-3" />;
      case 'cancelled': return <XCircle className="w-3 h-3" />;
      default: return <AlertTriangle className="w-3 h-3" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Caricamento Calendario...</p>
        </div>
      </div>
    );
  }

  if (!userData) {
    return null;
  }

  const days = getDaysInMonth(currentDate);
  const userName = `${userData.profile?.first_name || ''} ${userData.profile?.last_name || ''}`.trim();
  const isCurrentMonth = (date: Date) => date.getMonth() === currentDate.getMonth();
  const isToday = (date: Date) => date.toDateString() === new Date().toDateString();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      <div className="container-responsive py-8">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-green-500 rounded-2xl flex items-center justify-center shadow-lg">
                <CalendarDays className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Calendario Medico</h1>
                <p className="text-slate-600">Gestisci i tuoi appuntamenti</p>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <UserProfileDropdown
              userName={userName}
              userEmail={userData.email}
              userType={userData.role as 'doctor' | 'patient'}
              className="self-start sm:self-auto"
            />
          </div>
        </div>

        {/* Calendar Controls */}
        <div className="medical-card-elevated mb-6 p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Month Navigation */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigateMonth('prev')}
                className="medical-btn medical-btn-ghost p-2"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h2 className="text-xl font-semibold text-slate-800 min-w-[200px] text-center">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h2>
              <button
                onClick={() => navigateMonth('next')}
                className="medical-btn medical-btn-ghost p-2"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-4">
              {/* Filter */}
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-slate-600" />
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti</SelectItem>
                    <SelectItem value="confirmed">Confermati</SelectItem>
                    <SelectItem value="requested">In Attesa</SelectItem>
                    <SelectItem value="cancelled">Cancellati</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Create Appointment */}
              <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                <DialogTrigger asChild>
                  <button className="medical-btn medical-btn-primary">
                    <Plus className="w-4 h-4 mr-2" />
                    Nuovo Appuntamento
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Nuovo Appuntamento</DialogTitle>
                  </DialogHeader>

                  <form onSubmit={handleCreateAppointment} className="space-y-4">
                    {userData.role === 'doctor' ? (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Paziente
                        </label>
                        <Select
                          value={appointmentForm.patientId}
                          onValueChange={(value) => setAppointmentForm({ ...appointmentForm, patientId: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleziona paziente" />
                          </SelectTrigger>
                          <SelectContent>
                            {connectedUsers.map(user => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.first_name} {user.last_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Medico
                        </label>
                        <Select
                          value={appointmentForm.doctorId}
                          onValueChange={(value) => setAppointmentForm({ ...appointmentForm, doctorId: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleziona medico" />
                          </SelectTrigger>
                          <SelectContent>
                            {connectedUsers.map(user => (
                              <SelectItem key={user.id} value={user.id}>
                                Dr. {user.first_name} {user.last_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Data
                      </label>
                      <Input
                        type="date"
                        value={appointmentForm.date}
                        onChange={(e) => setAppointmentForm({ ...appointmentForm, date: e.target.value })}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Ora Inizio
                        </label>
                        <Input
                          type="time"
                          value={appointmentForm.startTime}
                          onChange={(e) => setAppointmentForm({ ...appointmentForm, startTime: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Ora Fine
                        </label>
                        <Input
                          type="time"
                          value={appointmentForm.endTime}
                          onChange={(e) => setAppointmentForm({ ...appointmentForm, endTime: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Tipo di Visita
                      </label>
                      <Select
                        value={appointmentForm.visitType}
                        onValueChange={(value) => setAppointmentForm({ ...appointmentForm, visitType: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="first_visit">Prima Visita</SelectItem>
                          <SelectItem value="follow_up">Controllo</SelectItem>
                          <SelectItem value="urgent">Urgente</SelectItem>
                          <SelectItem value="routine">Routine</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Note (opzionale)
                      </label>
                      <Textarea
                        value={appointmentForm.notes}
                        onChange={(e) => setAppointmentForm({ ...appointmentForm, notes: e.target.value })}
                        rows={3}
                        placeholder="Note aggiuntive..."
                      />
                    </div>

                    <div className="flex space-x-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setShowCreateModal(false)}
                        className="flex-1 medical-btn medical-btn-ghost"
                      >
                        Annulla
                      </button>
                      <button
                        type="submit"
                        className="flex-1 medical-btn medical-btn-primary"
                      >
                        Crea Appuntamento
                      </button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="medical-card-elevated p-6">
          {loadingAppointments && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-slate-600">Caricamento appuntamenti...</p>
            </div>
          )}

          {/* Week Headers */}
          <div className="grid grid-cols-7 gap-1 mb-4">
            {weekDays.map(day => (
              <div key={day} className="p-3 text-center font-medium text-slate-600 border-b border-slate-200">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((date, index) => {
              const dayAppointments = getAppointmentsForDate(date);
              const isCurrentMonthDay = isCurrentMonth(date);
              const isTodayDate = isToday(date);

              return (
                <div
                  key={index}
                  className={`min-h-[120px] p-2 border border-slate-200 transition-all duration-200 cursor-pointer hover:bg-slate-50 ${
                    !isCurrentMonthDay ? 'bg-slate-50 text-slate-400' : 'bg-white'
                  } ${isTodayDate ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}
                  onClick={() => setSelectedDate(date)}
                >
                  <div className={`text-sm font-medium mb-2 ${isTodayDate ? 'text-blue-700' : ''}`}>
                    {date.getDate()}
                  </div>

                  <div className="space-y-1">
                    {dayAppointments.slice(0, 3).map((appointment, aptIndex) => (
                      <div
                        key={aptIndex}
                        className={`text-xs p-1 rounded border ${getStatusColor(appointment.status)} truncate`}
                      >
                        <div className="flex items-center space-x-1">
                          {getStatusIcon(appointment.status)}
                          <span className="font-medium">
                            {appointment.start_time}
                          </span>
                        </div>
                        <div className="truncate">
                          {userData.role === 'doctor'
                            ? `${appointment.patients?.first_name} ${appointment.patients?.last_name}`
                            : `Dr. ${appointment.doctors?.first_name} ${appointment.doctors?.last_name}`
                          }
                        </div>
                      </div>
                    ))}
                    {dayAppointments.length > 3 && (
                      <div className="text-xs text-slate-500 font-medium">
                        +{dayAppointments.length - 3} altri
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Date Details */}
        {selectedDate && (
          <div className="medical-card-elevated mt-6 p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">
              Appuntamenti del {selectedDate.toLocaleDateString('it-IT', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </h3>

            {getAppointmentsForDate(selectedDate).length === 0 ? (
              <div className="text-center py-8">
                <CalendarDays className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <p className="text-slate-600">Nessun appuntamento in questa data</p>
              </div>
            ) : (
              <div className="space-y-4">
                {getAppointmentsForDate(selectedDate).map((appointment) => (
                  <div key={appointment.id} className="medical-card border border-slate-200 p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            {userData.role === 'doctor' ? <User className="w-4 h-4 text-blue-600" /> : <Stethoscope className="w-4 h-4 text-blue-600" />}
                          </div>
                          <div>
                            <h4 className="font-semibold text-slate-800">
                              {userData.role === 'doctor'
                                ? `${appointment.patients?.first_name} ${appointment.patients?.last_name}`
                                : `Dr. ${appointment.doctors?.first_name} ${appointment.doctors?.last_name}`
                              }
                            </h4>
                            <div className="flex items-center space-x-2 text-sm text-slate-600">
                              <Clock className="w-3 h-3" />
                              <span>{appointment.start_time} - {appointment.end_time}</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-sm text-slate-600 mb-2">
                          <span className="font-medium">Tipo: </span>
                          {appointment.visit_type === 'first_visit' ? 'Prima Visita' :
                           appointment.visit_type === 'follow_up' ? 'Controllo' :
                           appointment.visit_type === 'urgent' ? 'Urgente' :
                           appointment.visit_type === 'routine' ? 'Routine' :
                           appointment.visit_type}
                        </div>

                        {appointment.patient_notes && (
                          <div className="text-sm text-slate-600 mb-2">
                            <span className="font-medium">Note paziente: </span>
                            {appointment.patient_notes}
                          </div>
                        )}

                        {appointment.doctor_notes && (
                          <div className="text-sm text-slate-600">
                            <span className="font-medium">Note medico: </span>
                            {appointment.doctor_notes}
                          </div>
                        )}
                      </div>

                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                        {appointment.status === 'confirmed' ? 'Confermato' :
                         appointment.status === 'requested' ? 'In Attesa' :
                         appointment.status === 'cancelled' ? 'Cancellato' :
                         appointment.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}